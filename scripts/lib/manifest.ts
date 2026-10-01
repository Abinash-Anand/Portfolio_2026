import { ManifestSchema, type Manifest } from './schema';

/**
 * Parses an optional `portfolio.json`. Fail-soft: a broken manifest in one repo is reported and
 * ignored so it cannot take the whole site down.
 */
export function parseManifest(
  text: string | null | undefined,
  repo: string,
  warn: (message: string) => void,
): Manifest | null {
  if (!text?.trim()) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    warn(`${repo}: portfolio.json is not valid JSON; ignored`);
    return null;
  }
  const result = ManifestSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    warn(`${repo}: portfolio.json is invalid (${issues.join('; ')}); ignored`);
    return null;
  }
  return result.data;
}

/** Cover images may be absolute URLs or paths relative to the repository root. */
export function resolveCover(cover: string, login: string, repo: string): string {
  if (/^https?:\/\//i.test(cover)) return cover;
  return `https://raw.githubusercontent.com/${login}/${repo}/HEAD/${cover.replace(/^\.?\//, '')}`;
}
