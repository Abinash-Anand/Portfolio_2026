/**
 * Runs after `ng build` (npm's `postbuild` hook):
 *   1. copies the prerendered not-found page to 404.html, which Vercel serves with a real 404 status;
 *   2. preloads the fonts the first paint needs (their built file names are hashed, so it reads them from the CSS);
 *   3. checks that every inline script in the shipped HTML is allowed by the Content-Security-Policy,
 *      so a changed script can never silently break the site in production.
 */
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cspFrom, unlistedScripts } from './lib/csp';
import { criticalFonts, withFontPreloads } from './lib/preload';

const browser = join(process.cwd(), 'dist', 'Portfolio_2026', 'browser');

async function htmlFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

async function main(): Promise<void> {
  await copyFile(join(browser, 'not-found', 'index.html'), join(browser, '404.html'));

  const sheet = (await readdir(browser)).find((name) => /^styles-.*\.css$/.test(name));
  const fonts = sheet ? criticalFonts(await readFile(join(browser, sheet), 'utf8')) : [];

  const vercel = JSON.parse(await readFile(join(process.cwd(), 'vercel.json'), 'utf8'));
  const csp = cspFrom(vercel);
  if (!csp) throw new Error('[postbuild] vercel.json has no Content-Security-Policy header');

  const problems: string[] = [];
  const files = await htmlFiles(browser);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const withPreloads = withFontPreloads(html, fonts);
    if (withPreloads !== html) await writeFile(file, withPreloads);
    const missing = unlistedScripts(withPreloads, csp);
    for (const hash of missing) problems.push(`${file}: inline script ${hash} is not in the CSP`);
  }
  if (problems.length) throw new Error(`[postbuild]\n${problems.join('\n')}`);
  console.log(
    `[postbuild] 404.html written; ${fonts.length} fonts preloaded; ${files.length} pages checked against the CSP`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
