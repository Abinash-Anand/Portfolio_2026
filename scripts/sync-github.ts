/**
 * Build-time GitHub sync. Fetches the owner's pinned and public repositories (README, languages,
 * optional portfolio.json), renders READMEs, validates everything and writes src/generated/.
 *
 *   npm run sync                 sync now (token from PORTFOLIO_GH_TOKEN, else the committed fixture)
 *   npm run sync -- --fixture    force the fixture
 *   npm run sync -- --if-missing only generate when src/generated/index.json does not exist (postinstall)
 *
 * Failure policy:
 *   - no token                      -> fixture (sample data); FAILS on Vercel production builds, unless
 *                                      PORTFOLIO_ALLOW_FIXTURE=1 says to ship the sample data on purpose
 *   - token but the API call fails  -> FAILS in CI; locally falls back to the fixture with a warning
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GITHUB_LOGIN } from '../src/app/content/profile';
import { fetchRawPortfolio, parseRawPortfolio, type RawPortfolio } from './lib/github';
import { buildPortfolio } from './lib/normalize';
import { writeOutputs } from './lib/output';

// npm scripts run from the project root.
const root = process.cwd();
const generatedDir = join(root, 'src', 'generated');
const fixturePath = join(root, 'scripts', 'fixtures', 'github.fixture.json');

/** Repositories that are never shown as projects. */
const EXCLUDED = ['Abinash-Anand', '.github'];

/**
 * Featured projects used ONLY while nothing is pinned on the GitHub profile (the three showcase
 * projects from the CV). Pin repositories on GitHub and this list stops applying.
 */
const FEATURED_FALLBACK = ['SynthGraph', 'ParkRabbit', 'Eber-app'];

async function readFixture(): Promise<RawPortfolio> {
  const text = await readFile(fixturePath, 'utf8');
  return parseRawPortfolio(JSON.parse(text));
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const token = process.env['PORTFOLIO_GH_TOKEN']?.trim();
  const inCi = !!process.env['CI'];
  const isProduction = process.env['VERCEL_ENV'] === 'production';

  const generated = [join(generatedDir, 'index.json')];
  if (args.has('--if-missing') && generated.every((file) => existsSync(file))) {
    console.log('[sync] src/generated already exists; skipping');
    return;
  }

  let raw: RawPortfolio | null = null;
  let source: 'github' | 'fixture' = 'fixture';

  if (token && !args.has('--fixture')) {
    try {
      raw = await fetchRawPortfolio(GITHUB_LOGIN, token);
      source = 'github';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (inCi) throw new Error(`[sync] ${message}`, { cause: error });
      console.warn(`[sync] WARNING: ${message}\n[sync] Falling back to the fixture (sample data).`);
    }
  } else if (!args.has('--fixture') && isProduction) {
    if (process.env['PORTFOLIO_ALLOW_FIXTURE'] !== '1') {
      throw new Error(
        '[sync] PORTFOLIO_GH_TOKEN is required for production builds (refusing to ship sample data). ' +
          'To ship the sample data on purpose, set PORTFOLIO_ALLOW_FIXTURE=1.',
      );
    }
    console.warn('[sync] WARNING: shipping SAMPLE data to production (PORTFOLIO_ALLOW_FIXTURE=1).');
  }

  if (!raw) {
    raw = await readFixture();
    console.log('[sync] Using the committed fixture (sample data).');
  }

  const output = await buildPortfolio({
    login: GITHUB_LOGIN,
    raw,
    source,
    now: new Date(),
    excluded: EXCLUDED,
    featuredFallback: FEATURED_FALLBACK,
  });
  await writeOutputs(generatedDir, output);

  for (const warning of output.warnings) console.warn(`[sync] WARNING: ${warning}`);
  const featured = output.index.projects.filter((p) => p.featured).length;
  console.log(
    `[sync] source=${source} projects=${output.index.projects.length} featured=${featured} readmes=${output.details.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  // exitCode (not process.exit): exiting while a failed fetch is closing sockets crashes Node on Windows.
  process.exitCode = 1;
});
