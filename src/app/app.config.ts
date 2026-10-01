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
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';

import { provideClientHydration } from '@angular/platform-browser';
import { routes } from './app.routes';
import { AnalyticsPort, NoopAnalytics } from './core/analytics/analytics.port';
import { ScrollDepthTracker } from './core/analytics/scroll-depth';
import { VercelAnalytics, type AnalyticsWindow } from './core/analytics/vercel-analytics.adapter';
import { AppErrorHandler } from './core/app-error-handler';
import { BuildTimeJsonRepository } from './data/build-time-json.repository';
import { PortfolioRepository } from './data/portfolio.repository';
import { PortfolioStore } from './data/portfolio.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Resolves the first (lazy) route before the app starts, so hydration finds the page's content in place
      // instead of an empty outlet, which blanks the page until the chunk arrives (a layout shift of 1.0).
      withEnabledBlockingInitialNavigation(),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withPreloading(PreloadAllModules),
    ),
    // Errors are logged as usual and counted anonymously (no message), to notice a broken release.
    { provide: ErrorHandler, useClass: AppErrorHandler },
    // Composition root: the data source is chosen here and nowhere else.
    { provide: PortfolioRepository, useClass: BuildTimeJsonRepository },
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
