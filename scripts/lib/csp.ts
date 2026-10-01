import { createHash } from 'node:crypto';

/**
 * The Content-Security-Policy allows exactly one inline script (the one in index.html that adds `js` and
 * `motion-ok` before first paint) by its hash. These helpers make sure the hash in vercel.json always matches the
 * HTML we actually ship, so a changed script can never silently break the policy.
 */

/** Types that browsers run as JavaScript. Other types (JSON, JSON-LD) are data blocks the policy does not govern. */
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

export function inlineScripts(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attributes = match[1]!;
    if (/(?:^|\s)src=/.test(attributes)) continue; // an external script: allowed by 'self'
    const type = /(?:^|\s)type="([^"]*)"/.exec(attributes)?.[1] ?? '';
    if (EXECUTABLE_TYPES.has(type)) found.push(match[2]!);
  }
  return found;
}

export const scriptHash = (source: string): string =>
  `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

/** The hashes of all inline scripts in a page that the CSP's `script-src` does not allow. */
export function unlistedScripts(html: string, csp: string): string[] {
  const directive = /(?:^|;)\s*script-src\s+([^;]*)/.exec(csp)?.[1] ?? '';
  return inlineScripts(html)
    .map(scriptHash)
    .filter((hash) => !directive.split(/\s+/).includes(hash));
}

/** The CSP header value from a parsed vercel.json, or null when there is none. */
export function cspFrom(vercel: {
  headers?: { source: string; headers: { key: string; value: string }[] }[];
}): string | null {
  for (const rule of vercel.headers ?? []) {
    const header = rule.headers.find((h) => h.key.toLowerCase() === 'content-security-policy');
    if (header) return header.value;
  }
  return null;
}
