import { DEFAULT_ORIGIN, siteOrigin } from './site';
import { buildRobots, buildSitemap, DISALLOWED, sitemapPaths } from './seo';

describe('siteOrigin', () => {
  it('prefers an explicit SITE_URL, then the Vercel production domain, then the default', () => {
    expect(
      siteOrigin({
        SITE_URL: 'https://example.dev/',
        VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app',
      }),
    ).toBe('https://example.dev');
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'abinash.vercel.app' })).toBe(
      'https://abinash.vercel.app',
    );
    expect(siteOrigin({})).toBe(DEFAULT_ORIGIN);
    expect(siteOrigin({ SITE_URL: '  ', VERCEL_PROJECT_PRODUCTION_URL: '' })).toBe(DEFAULT_ORIGIN);
  });

  it('keeps only the origin, so a path or trailing slash cannot leak into canonical URLs', () => {
    expect(siteOrigin({ SITE_URL: 'https://example.dev/some/path?x=1' })).toBe(
      'https://example.dev',
    );
  });

  it('refuses anything that is not an http(s) URL', () => {
    expect(() => siteOrigin({ SITE_URL: 'javascript:alert(1)' })).toThrow('http(s)');
    expect(() => siteOrigin({ SITE_URL: 'not a url' })).toThrow();
  });
});

describe('sitemap', () => {
  const slugs = ['ParkRabbit', 'SynthGraph', 'Eber-app'];

  it('lists the static pages and one entry per project, sorted, with absolute URLs', () => {
    const paths = sitemapPaths(slugs);
    expect(paths.slice(0, 2)).toEqual(['/', '/work']);
    expect(paths.slice(-3)).toEqual(['/work/Eber-app', '/work/ParkRabbit', '/work/SynthGraph']);
    expect(paths).toContain('/privacy');
  });

  it('never lists the preview routes', () => {
    const paths = sitemapPaths(slugs);
    for (const path of DISALLOWED) expect(paths.some((p) => p.startsWith(path))).toBe(false);
  });

  it('is valid sitemap XML with a date (not a timestamp) per URL', () => {
    const xml = buildSitemap('https://example.dev', slugs, '2026-10-01T05:25:43.000Z');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.dev/</loc>');
    expect(xml).toContain('<loc>https://example.dev/work/ParkRabbit</loc>');
    expect(xml).toContain('<lastmod>2026-10-01</lastmod>');
    expect(xml.match(/<url>/g)).toHaveLength(sitemapPaths(slugs).length);
  });

  it('escapes characters that are special in XML', () => {
    expect(buildSitemap('https://example.dev', ['a&b'], '2026-10-01')).toContain('/work/a&amp;b');
  });
});

describe('robots.txt', () => {
  it('allows the site, keeps crawlers out of the previews and points at the sitemap', () => {
    const robots = buildRobots('https://example.dev');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /journey');
    expect(robots).toContain('Disallow: /styleguide');
    expect(robots.trim().endsWith('Sitemap: https://example.dev/sitemap.xml')).toBe(true);
  });
});
