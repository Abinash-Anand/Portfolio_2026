import { buildChecks, runChecks, type Fetcher } from './smoke';

interface Fake {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
}

/** A site that behaves as production should, with per-path overrides. */
function site(overrides: Record<string, Fake> = {}): Fetcher {
  const good: Record<string, Fake> = {
    '/': {
      body: '<h1>Abinash Anand</h1><script type="application/ld+json">{}</script><link rel="canonical" href="x">',
      headers: {
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        'permissions-policy': 'camera=()',
      },
    },
    '/work': { body: '<h1>Work</h1>' },
    '/work/ParkRabbit': { body: '<h1>ParkRabbit</h1><meta property="og:title" content="x">' },
    '/resume': { body: '<h1>Resume</h1>' },
    '/privacy': { body: '<h1>Privacy</h1> This site sets no cookies' },
    '/this-page-does-not-exist': { status: 404, body: '<h1>Page not found</h1>' },
    '/project/eber': { status: 308, headers: { location: '/work/Eber-app' } },
    '/journey/skills': { headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/sitemap.xml': { body: '<urlset><url><loc>https://example.dev/</loc></url></urlset>' },
    '/robots.txt': { body: 'Allow: /\nSitemap: https://example.dev/sitemap.xml\n' },
    '/assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf': { headers: { 'content-type': 'application/pdf' } },
    '/assets/og-default.jpg': { headers: { 'content-type': 'image/jpeg' } },
  };
  return async (path) => {
    const fake = { ...good[path], ...overrides[path] };
    return new Response(fake.body ?? '', { status: fake.status ?? 200, headers: fake.headers });
  };
}

const run = (fetcher: Fetcher, expectRealData = false) =>
  runChecks(fetcher, buildChecks({ expectRealData }));
const failures = (results: Awaited<ReturnType<typeof run>>) =>
  results.filter((r) => !r.ok).map((r) => r.name);

describe('smoke checks', () => {
  it('pass for a healthy site', async () => {
    const results = await run(site());
    expect(failures(results)).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(10);
  });

  it('fail when a page is down, or is missing what makes it a real prerendered page', async () => {
    expect(failures(await run(site({ '/work': { status: 500 } })))).toEqual([
      '/work is a real page',
    ]);
    expect(failures(await run(site({ '/': { body: '<div id="root"></div>' } })))).toContain(
      '/ is a real page',
    );
  });

  it('fail when unknown addresses return 200 (a soft 404) or the old redirect is gone', async () => {
    expect(failures(await run(site({ '/this-page-does-not-exist': { status: 200 } })))).toEqual([
      'unknown addresses give a real 404',
    ]);
    expect(failures(await run(site({ '/project/eber': { status: 404 } })))).toEqual([
      'the old /project/eber address redirects permanently to /work/Eber-app',
    ]);
  });

  it('fail when the preview is indexable, or the security headers are missing', async () => {
    expect(failures(await run(site({ '/journey/skills': { headers: {} } })))).toEqual([
      'the 3D experience loads and is kept out of search results',
    ]);
    const bare = site({ '/': { headers: { 'x-frame-options': 'DENY' } } });
    expect(failures(await run(bare))).toContain('security headers are sent');
  });

  it('fail when robots.txt and the sitemap disagree about the site address', async () => {
    const results = await run(
      site({ '/robots.txt': { body: 'Sitemap: https://other.dev/sitemap.xml' } }),
    );
    expect(failures(results)).toEqual([
      'sitemap.xml and robots.txt exist and agree on the site address',
    ]);
  });

  it('fail when the CV or the share image is not what it should be', async () => {
    expect(
      failures(await run(site({ '/assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf': { status: 404 } }))),
    ).toEqual(['the CV downloads as a PDF']);
    expect(
      failures(
        await run(site({ '/assets/og-default.jpg': { headers: { 'content-type': 'text/html' } } })),
      ),
    ).toEqual(['the share image exists']);
  });

  it('can insist that production shows real data, and catches the sample-data notice', async () => {
    const sample = site({
      '/': {
        body: '<h1>Abinash Anand</h1><script type="application/ld+json"></script><link rel="canonical"> Showing sample GitHub data: no token',
      },
    });
    expect(failures(await run(sample, false))).not.toContain(
      'the site shows real GitHub data, not the sample data',
    );
    expect(failures(await run(sample, true))).toContain(
      'the site shows real GitHub data, not the sample data',
    );
    expect(failures(await run(site(), true))).toEqual([]);
  });

  it('reports a network error as a failed check instead of throwing', async () => {
    const down: Fetcher = async () => {
      throw new Error('connect ECONNREFUSED');
    };
    const results = await run(down);
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(results[0]!.detail).toContain('ECONNREFUSED');
  });
});
