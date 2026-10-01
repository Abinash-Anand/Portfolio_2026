import {
  ApplicationConfig,
  inject,
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

import { routes } from './app.routes';
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
    // The store is ready before the first page renders, so pages can read it synchronously.
    provideAppInitializer(() => inject(PortfolioStore).load()),
  ],
};
