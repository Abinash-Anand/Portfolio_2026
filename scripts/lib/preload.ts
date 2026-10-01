/**
 * Font preloading. The build hashes font file names, so they cannot be written by hand into index.html; instead the
 * postbuild step reads them out of the built stylesheet and adds `<link rel="preload">` for the fonts every page
 * needs for its first paint. Without it the browser only discovers the fonts after downloading and parsing the CSS,
 * which delays the largest text on the page (Lighthouse LCP).
 */

/** The fonts worth preloading: the two used by the text at the top of every page. Mono is only used by labels. */
const CRITICAL = ['inter-latin-wght-normal', 'space-grotesk-latin-wght-normal'] as const;

/** URLs (relative to the site root) of the critical latin variable fonts referenced by the stylesheet. */
export function criticalFonts(css: string): string[] {
  const urls = [...css.matchAll(/url\(["']?(?:\.\/)?(media\/[^)"']+\.woff2)["']?\)/g)].map(
    (m) => m[1]!,
  );
  const unique = [...new Set(urls)];
  return CRITICAL.map((name) => unique.find((url) => url.includes(name))).filter(
    (url): url is string => url !== undefined,
  );
}

/** Adds preload links for the fonts, right before the first stylesheet. Idempotent; leaves other HTML alone. */
export function withFontPreloads(html: string, fonts: readonly string[]): string {
  const missing = fonts.filter((font) => !html.includes(`rel="preload" as="font" href="${font}"`));
  if (!missing.length) return html;
  const links = missing
    .map((font) => `<link rel="preload" as="font" href="${font}" type="font/woff2" crossorigin>`)
    .join('\n    ');
  const marker = html.search(/<link[^>]*rel="stylesheet"/);
  if (marker === -1) return html;
  return `${html.slice(0, marker)}${links}\n    ${html.slice(marker)}`;
}
