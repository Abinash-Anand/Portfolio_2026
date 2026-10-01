import type { Routes } from '@angular/router';

/**
 * The previous pages were removed ahead of a redesign; this placeholder keeps the app buildable and deployable
 * (and the visitor analytics running) until the new pages exist.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Abinash Anand',
    loadComponent: () => import('./placeholder.page').then((module) => module.PlaceholderPage),
  },
  { path: '**', redirectTo: '' },
];
