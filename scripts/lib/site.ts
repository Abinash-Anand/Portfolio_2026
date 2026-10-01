/** Where the site lives: the origin used for canonical URLs, Open Graph tags and the sitemap. */

/** Used when nothing else says where the site is (local builds, CI). */
export const DEFAULT_ORIGIN = 'https://abinashanand.vercel.app';

type Env = Readonly<Record<string, string | undefined>>;

function normalise(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`SITE_URL must be an http(s) URL, got "${value}"`);
  }
  return url.origin; // drops any path, query and trailing slash
}

/**
 * The public origin, in order of preference: an explicit `SITE_URL` (for a custom domain), Vercel's production
 * domain (set on every Vercel build, so previews point their canonical URLs at production, as they should), then
 * the default.
 */
export function siteOrigin(env: Env): string {
  const explicit = env['SITE_URL']?.trim();
  if (explicit) return normalise(explicit);
  const vercel = env['VERCEL_PROJECT_PRODUCTION_URL']?.trim();
  if (vercel) return normalise(`https://${vercel}`);
  return DEFAULT_ORIGIN;
}
