/**
 * Smoke-tests a running copy of the site.
 *
 *   npm run smoke -- http://localhost:4300                 a local build (npm run serve:dist)
 *   npm run smoke -- https://abinashanand.vercel.app --expect-real-data    production
 */
import { buildChecks, runChecks } from './lib/smoke';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const base = args.find((arg) => /^https?:\/\//.test(arg));
  if (!base) throw new Error('Usage: npm run smoke -- <base url> [--expect-real-data]');
  const origin = new URL(base).origin;

  const results = await runChecks(
    (path, init) => fetch(origin + path, init),
    buildChecks({ expectRealData: args.includes('--expect-real-data') }),
  );

  for (const result of results) {
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.ok ? '' : `\n      ${result.detail}`}`,
    );
  }
  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed against ${origin}`);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
