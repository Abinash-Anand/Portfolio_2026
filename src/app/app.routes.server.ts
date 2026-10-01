import { RenderMode, type ServerRoute } from '@angular/ssr';

/** Static output: every route is rendered once at build time. */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
