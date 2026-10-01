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
    // Which scene draws the world. Spike 0 replaces the placeholder with the Three.js host here.
    {
      provide: SCENE_HOST_FACTORY,
      useValue: () =>
        import('./scene/placeholder-scene').then((module) => new module.PlaceholderSceneHost()),
    },
    // The store is ready before the first page renders, so pages can read it synchronously.
    provideAppInitializer(() => inject(PortfolioStore).load()),
  ],
};
