/**
 * Smoke checks for a deployed (or locally served) copy of the site: the things that must be true for the site to be
 * considered live and healthy. Pure: they take a `fetch`-like function, so they are unit-tested without a network.
 */

export type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export interface Check {
  readonly name: string;
  /** Returns null when the check passes, otherwise what is wrong. */
  readonly run: (fetcher: Fetcher) => Promise<string | null>;
}

export interface CheckResult {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface SmokeOptions {
  /** Fail when the page still shows the sample-data notice (production must ship real GitHub data). */
  readonly expectRealData?: boolean;
}

const NO_FOLLOW: RequestInit = { redirect: 'manual' };

async function page(fetcher: Fetcher, path: string): Promise<{ response: Response; html: string }> {
  const response = await fetcher(path);
  return { response, html: await response.text() };
}

const expectStatus = (response: Response, status: number): string | null =>
  response.status === status ? null : `expected ${status}, got ${response.status}`;

export function buildChecks(options: SmokeOptions = {}): Check[] {
  const pageHas = (path: string, ...needles: string[]): Check => ({
    name: `${path} is a real page`,
    run: async (fetcher) => {
      const { response, html } = await page(fetcher, path);
      const bad = expectStatus(response, 200);
      if (bad) return bad;
      const missing = needles.filter((needle) => !html.includes(needle));
      return missing.length ? `missing in the HTML: ${missing.join(', ')}` : null;
    },
  });

  const checks: Check[] = [
    pageHas('/', '<h1', 'Abinash Anand', 'application/ld+json', 'rel="canonical"'),
    pageHas('/work', '<h1'),
    pageHas('/work/ParkRabbit', '<h1', 'og:title'),
    pageHas('/resume', '<h1'),
    pageHas('/privacy', '<h1', 'cookies'),
    {
      name: 'unknown addresses give a real 404',
      run: async (fetcher) => {
        const { response, html } = await page(fetcher, '/this-page-does-not-exist');
        return (
          expectStatus(response, 404) ??
          (html.includes('Page not found') ? null : 'no 404 page body')
        );
      },
    },
    {
      name: 'the old /project/eber address redirects permanently to /work/Eber-app',
      run: async (fetcher) => {
        const response = await fetcher('/project/eber', NO_FOLLOW);
        const location = response.headers.get('location') ?? '';
        return [301, 308].includes(response.status) && location.endsWith('/work/Eber-app')
          ? null
          : `got ${response.status} to "${location}"`;
      },
    },
    {
      name: 'the 3D experience loads and is kept out of search results',
      run: async (fetcher) => {
        const response = await fetcher('/journey/skills');
        const robots = response.headers.get('x-robots-tag') ?? '';
        return (
          expectStatus(response, 200) ??
          (robots.includes('noindex') ? null : `X-Robots-Tag was "${robots}"`)
        );
      },
    },
    {
      name: 'security headers are sent',
      run: async (fetcher) => {
        const headers = (await fetcher('/')).headers;
        const missing = [
          'content-security-policy',
          'x-content-type-options',
          'x-frame-options',
          'referrer-policy',
          'permissions-policy',
        ].filter((name) => !headers.get(name));
        return missing.length ? `missing headers: ${missing.join(', ')}` : null;
      },
    },
    {
      name: 'sitemap.xml and robots.txt exist and agree on the site address',
      run: async (fetcher) => {
        const [sitemap, robots] = await Promise.all([
          fetcher('/sitemap.xml'),
          fetcher('/robots.txt'),
        ]);
        const bad = expectStatus(sitemap, 200) ?? expectStatus(robots, 200);
        if (bad) return bad;
        const xml = await sitemap.text();
        const text = await robots.text();
        const origin = /<loc>(https?:\/\/[^/<]+)\//.exec(xml)?.[1];
        if (!origin) return 'sitemap has no URLs';
        return text.includes(`Sitemap: ${origin}/sitemap.xml`)
          ? null
          : 'robots.txt points at a different origin';
      },
    },
    {
      name: 'the CV downloads as a PDF',
      run: async (fetcher) => {
        const response = await fetcher('/assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf');
        const type = response.headers.get('content-type') ?? '';
        return (
          expectStatus(response, 200) ??
          (type.includes('pdf') ? null : `content-type was "${type}"`)
        );
      },
    },
    {
      name: 'the share image exists',
      run: async (fetcher) => {
        const response = await fetcher('/assets/og-default.jpg');
        return (
          expectStatus(response, 200) ??
          ((response.headers.get('content-type') ?? '').includes('image') ? null : 'not an image')
        );
      },
    },
  ];

  if (options.expectRealData) {
    checks.push({
      name: 'the site shows real GitHub data, not the sample data',
      run: async (fetcher) => {
        const { html } = await page(fetcher, '/');
        return html.includes('Showing sample GitHub data')
          ? 'the sample-data notice is on the page'
          : null;
      },
    });
  }
  return checks;
}

export async function runChecks(
  fetcher: Fetcher,
  checks: readonly Check[],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    try {
      const problem = await check.run(fetcher);
      results.push({ name: check.name, ok: problem === null, detail: problem ?? 'ok' });
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
