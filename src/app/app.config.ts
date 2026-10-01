import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  PLATFORM_ID,
  ErrorHandler,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';

import { provideClientHydration } from '@angular/platform-browser';
import site from '../generated/site.json';
import { routes } from './app.routes';
import { AnalyticsPort, NoopAnalytics } from './core/analytics/analytics.port';
import { ScrollDepthTracker } from './core/analytics/scroll-depth';
import { VercelAnalytics, type AnalyticsWindow } from './core/analytics/vercel-analytics.adapter';
import { AppErrorHandler } from './core/app-error-handler';
import { SITE_URL } from './core/config';
import { BuildTimeJsonRepository } from './data/build-time-json.repository';
import { PortfolioRepository } from './data/portfolio.repository';
import { PortfolioStore } from './data/portfolio.store';
import { SCENE_HOST_FACTORY } from './scene/scene-host';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withPreloading(PreloadAllModules),
    ),
    // Errors are logged as usual and counted anonymously (no message), to notice a broken release.
    { provide: ErrorHandler, useClass: AppErrorHandler },
    // Where the site lives (written at build time from SITE_URL or Vercel's production domain).
    { provide: SITE_URL, useValue: site.origin },
    // Composition root: the data source is chosen here and nowhere else.
    { provide: PortfolioRepository, useClass: BuildTimeJsonRepository },
    // Which scene draws the world. Three.js is code-split: its chunk loads only when the experience mounts.
    // `?engine=2d` selects the lightweight 2D placeholder, as a baseline to compare against while measuring.
    {
      provide: SCENE_HOST_FACTORY,
      useValue: () =>
        typeof location !== 'undefined' &&
        new URLSearchParams(location.search).get('engine') === '2d'
          ? import('./scene/placeholder-scene').then((module) => new module.PlaceholderSceneHost())
          : import('./scene/three/three-scene.host').then((module) => new module.ThreeSceneHost()),
    },
    // Visit statistics: only in the browser, only in production builds, and only for visitors who have not
    // sent Do Not Track or Global Privacy Control. Everywhere else events go nowhere.
    {
      provide: AnalyticsPort,
      useFactory: () => {
        const view = inject(DOCUMENT).defaultView;
        if (!isPlatformBrowser(inject(PLATFORM_ID)) || isDevMode() || !view)
          return new NoopAnalytics();
        return new VercelAnalytics(view as unknown as AnalyticsWindow, inject(DOCUMENT));
      },
    },
    provideAppInitializer(() => {
      const analytics = inject(AnalyticsPort);
      if (analytics instanceof VercelAnalytics) analytics.start();
      if (isPlatformBrowser(inject(PLATFORM_ID))) inject(ScrollDepthTracker).start();
    }),
    // The store is ready before the first page renders, so pages can read it synchronously.
    provideAppInitializer(() => inject(PortfolioStore).load()),
    // Hydrates the prerendered pages instead of rebuilding them. No event replay: it needs an inline script.
    provideClientHydration(),
  ],
};
