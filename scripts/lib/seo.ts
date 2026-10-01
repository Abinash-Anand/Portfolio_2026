/** Files search engines read: the sitemap and robots.txt. Pure functions, written to `public/` by the sync step. */

/** The indexable pages that do not depend on the synced data. */
export const STATIC_PAGES = [
  '/',
  '/work',
  '/resume',
  '/about',
  '/experience',
  '/skills',
  '/education',
  '/privacy',
] as const;

/** Paths crawlers are asked to leave alone: interactive previews and internal pages. */
export const DISALLOWED = ['/journey', '/styleguide'] as const;

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sitemapPaths(slugs: readonly string[]): string[] {
  return [...STATIC_PAGES, ...[...slugs].sort().map((slug) => `/work/${slug}`)];
}

export function buildSitemap(origin: string, slugs: readonly string[], lastmod: string): string {
  const day = lastmod.slice(0, 10); // a date, not a timestamp
  const urls = sitemapPaths(slugs).map(
    (path) =>
      `  <url>\n    <loc>${escapeXml(origin + (path === '/' ? '/' : path))}</loc>\n    <lastmod>${day}</lastmod>\n  </url>`,
  );
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  );
}

export function buildRobots(origin: string): string {
  return (
    ['User-agent: *', 'Allow: /', ...DISALLOWED.map((path) => `Disallow: ${path}`), ''].join('\n') +
    `Sitemap: ${origin}/sitemap.xml\n`
  );
}
