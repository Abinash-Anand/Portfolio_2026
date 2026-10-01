import { readFileSync } from 'node:fs';
import {
  compilePattern,
  headersFor,
  redirectFor,
  rewriteFor,
  type VercelConfig,
} from './vercel-routes';

describe('compilePattern', () => {
  it('captures named segments, and treats :name* as zero or more segments', () => {
    const { regex, names } = compilePattern('/project/:id/:section');
    expect(names).toEqual(['id', 'section']);
    expect(regex.exec('/project/eber/overview')?.slice(1)).toEqual(['eber', 'overview']);
    expect(regex.test('/project/eber')).toBe(false);

    const rest = compilePattern('/journey/:path*').regex;
    expect(rest.test('/journey')).toBe(true);
    expect(rest.test('/journey/skills')).toBe(true);
    expect(rest.test('/journeys')).toBe(false);
  });

  it('keeps plain regex groups, as in the asset caching rule', () => {
    const { regex } = compilePattern('/(.*)\\.(js|css|woff2)');
    expect(regex.test('/main-ABC.js')).toBe(true);
    expect(regex.test('/assets/x.png')).toBe(false);
  });
});

/** The real configuration: these tests check the behaviour the site relies on in production. */
describe('vercel.json', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig;

  it('permanently redirects the old v1 project URLs to /work', () => {
    expect(redirectFor(config, '/project/ParkRabbit')).toEqual({
      status: 308,
      location: '/work/ParkRabbit',
    });
    expect(redirectFor(config, '/project/ParkRabbit/overview')).toEqual({
      status: 308,
      location: '/work/ParkRabbit',
    });
    expect(redirectFor(config, '/projects')).toEqual({ status: 308, location: '/work' });
  });

  it('maps the one v1 id that differs from its repository name (eber -> Eber-app)', () => {
    expect(redirectFor(config, '/project/eber')?.location).toBe('/work/Eber-app');
    expect(redirectFor(config, '/project/eber/anything')?.location).toBe('/work/Eber-app');
  });

  it('does not redirect current pages', () => {
    for (const path of ['/', '/work', '/work/ParkRabbit', '/resume', '/journey', '/privacy']) {
      expect(redirectFor(config, path)).toBeNull();
    }
  });

  it('sends only the browser-rendered pages to the client fallback; everything else is a real page or a 404', () => {
    expect(rewriteFor(config, '/journey')).toBe('/index.csr.html');
    expect(rewriteFor(config, '/journey/skills')).toBe('/index.csr.html');
    expect(rewriteFor(config, '/styleguide')).toBe('/index.csr.html');
    expect(rewriteFor(config, '/work/ParkRabbit')).toBeNull();
    expect(rewriteFor(config, '/does-not-exist')).toBeNull();
  });

  it('sends the security headers on every page', () => {
    const headers = headersFor(config, '/work/ParkRabbit');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });

  it('caches hashed bundles forever, assets for a day, and leaves pages to revalidate', () => {
    expect(headersFor(config, '/main-ABC123.js')['Cache-Control']).toContain('immutable');
    expect(headersFor(config, '/styles-ABC123.css')['Cache-Control']).toContain('immutable');
    expect(headersFor(config, '/assets/og-default.jpg')['Cache-Control']).toContain(
      'max-age=86400',
    );
    expect(headersFor(config, '/work')['Cache-Control']).toBeUndefined();
  });

  it('keeps the preview routes out of search results', () => {
    expect(headersFor(config, '/journey')['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(headersFor(config, '/journey/skills')['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(headersFor(config, '/styleguide')['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(headersFor(config, '/work')['X-Robots-Tag']).toBeUndefined();
  });
});
