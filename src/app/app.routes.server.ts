import { RenderMode, type ServerRoute } from '@angular/ssr';
import index from '../generated/index.json';

/**
 * How each route is built (static output: nothing renders per request).
 *
 * - The 2D site is prerendered to real HTML, so search engines and link previews see the content, and the first
 *   paint does not wait for JavaScript. `/work/:slug` is prerendered once per project in the synced data.
 * - `/not-found` is prerendered too: it becomes `404.html`, so unknown addresses get a real 404 status.
 * - Everything else (the 3D experience, the styleguide, legacy redirects) renders in the browser. The experience
 *   is `/journey` and `/journey/:endpoint`, one matcher route, which cannot be prerendered anyway.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'work', renderMode: RenderMode.Prerender },
  {
    path: 'work/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (index.projects as { slug: string }[]).map(({ slug }) => ({ slug })),
  },
  { path: 'resume', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'experience', renderMode: RenderMode.Prerender },
  { path: 'skills', renderMode: RenderMode.Prerender },
  { path: 'education', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'impressum', renderMode: RenderMode.Prerender },
  { path: 'not-found', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
