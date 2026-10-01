import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
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
    // The store is ready before the first page renders, so pages can read it synchronously.
    provideAppInitializer(() => inject(PortfolioStore).load()),
  ],
};
