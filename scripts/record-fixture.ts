/**
 * Records a trimmed copy of the real GitHub response as the committed fixture
 * (scripts/fixtures/github.fixture.json). Developer helper, run manually:
 *
 *   npm run sync:record-fixture
 *
 * Uses the GitHub CLI (`gh`) with the developer's own login for a READ-ONLY query of public data.
 * The sync script itself never uses `gh`; it uses PORTFOLIO_GH_TOKEN.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GITHUB_LOGIN } from '../src/app/content/profile';
import { PORTFOLIO_QUERY, parseRawPortfolio } from './lib/github';

const MAX_README_CHARS = 60_000;
const out = join(process.cwd(), 'scripts', 'fixtures', 'github.fixture.json');

function main(): Promise<void> {
  return (async () => {
    const stdout = execFileSync(
      'gh',
      ['api', 'graphql', '-f', `query=${PORTFOLIO_QUERY}`, '-f', `login=${GITHUB_LOGIN}`],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const data = (JSON.parse(stdout) as { data: unknown }).data;
    parseRawPortfolio(data); // fail early if GitHub's shape changed

    const trim = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(trim);
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([key, v]) =>
            key === 'text' && typeof v === 'string' && v.length > MAX_README_CHARS
              ? [key, v.slice(0, MAX_README_CHARS)]
              : [key, trim(v)],
          ),
        );
      }
      return value;
    };

    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(trim(data), null, 2) + '\n');
    console.log(`[record-fixture] wrote ${out}`);
  })();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  // exitCode (not process.exit): exiting while a failed fetch is closing sockets crashes Node on Windows.
  process.exitCode = 1;
});
