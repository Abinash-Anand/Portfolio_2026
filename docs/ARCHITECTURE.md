# Architecture

Status: **the previous UI was dropped on 2026-10-01** and a new design direction is pending. This document describes what
remains: the app shell, the GitHub data pipeline, and the visitor analytics. The earlier concept, design rules, 3D engine
and page designs are in the git history (last commit before the removal: `d9b1b03`).

## 1. What is in the project

| Part | Where | What it does |
|---|---|---|
| App shell | `src/app/app.ts`, `app.config.ts`, `app.routes.ts`, `placeholder.page.ts` | Angular 21 standalone, zoneless-ready, OnPush. One placeholder page keeps the app buildable and deployable until the new pages exist |
| Static prerender | `main.server.ts`, `app.config.server.ts`, `app.routes.server.ts` | `@angular/ssr` with `outputMode: static`; every listed route is rendered to HTML at build time, hydrated without event replay |
| GitHub data pipeline | `scripts/sync-github.ts`, `scripts/lib/*` | Build-time sync of repositories, READMEs and the contribution calendar (section 2) |
| Data layer | `src/app/data/*` | Models, `PortfolioRepository` port, build-time JSON adapter, signals `PortfolioStore` (section 3) |
| Visitor analytics | `src/app/core/analytics/*`, `core/app-error-handler.ts`, `shared/directives/track.directive.ts` | Cookieless, consent-free statistics (section 4) |
| Content | `src/app/content/profile.ts` | The profile facts the sync needs (`GITHUB_LOGIN`) and basic profile copy |
| Headers | `vercel.json` | Security headers, a CSP without inline scripts, long caching for hashed assets |

Layers are enforced by ESLint (`eslint-plugin-boundaries`): `core`, `content`, `data` (may use `core` and `generated`), `shared`
(may use `core`). Root files (`app.ts`, `app.config.ts`, ...) are the composition root and may import anything.

## 2. GitHub data pipeline (build time)

`npm run sync` (also run by `prestart`, `prebuild`, and `postinstall --if-missing`) is TypeScript and shares the domain types with the app.

1. **Fetch.** One GraphQL call with `PORTFOLIO_GH_TOKEN`: pinned items, public non-fork repositories, and per repo description,
   homepage, topics, languages by size, stars, `pushedAt`, `openGraphImageUrl`, `README.md` and an optional `portfolio.json`;
   plus the contribution calendar. The raw response is validated with Zod, so a GitHub API change fails the build clearly.
2. **Render.** README to sanitised HTML at build time (unified, remark, rehype with `rehype-raw`, `rehype-sanitize`, `rehype-slug`,
   Shiki). Relative image and link URLs become absolute, headings are demoted one level, a table of contents is generated.
3. **Normalise and validate.** GitHub shape to domain models; the output is validated strictly (`PortfolioIndexSchema`,
   `ProjectDetailSchema`), tied to the TypeScript types by compile-time drift checks. A broken per-repo `portfolio.json` is
   ignored with a warning.
4. **Write** `src/generated/` (gitignored): `index.json` (cards and the activity calendar), `projects/<slug>.json` (README HTML)
   and `project-loaders.ts` (one lazy `import()` per project, so each README is its own chunk).
5. **Failure policy** (ADR-015). No token: use the committed real-data fixture (`scripts/fixtures/github.fixture.json`, recorded with
   `npm run sync:record-fixture`), but **fail Vercel production builds**, unless `PORTFOLIO_ALLOW_FIXTURE=1` says to ship sample
   data on purpose. Token present and the API fails: fail in CI, fall back to the fixture locally with a warning.

### Opt-in rules
- **Featured** = repositories pinned on the GitHub profile (maximum 6, public only). While nothing is pinned, the sync uses
  `FEATURED_FALLBACK` in `scripts/sync-github.ts` (SynthGraph, ParkRabbit, Eber-app) and says so.
- An optional `portfolio.json` in a repo enriches it: `title`, `summary`, `role`, `stack[]`, `highlights[]`, `cover`, `liveUrl`,
  `order`, `readme: "full" | "hide"`, `hidden`.
- Fallbacks: description (boilerplate ignored) for the summary, GitHub languages for the stack, a custom GitHub OG image for the cover,
  `homepageUrl` for the live link. The profile repo (`Abinash-Anand`) and `.github` are always excluded.
- The **contribution calendar** is stored compactly as `activity` in `index.json` (week-major counts). It is `null` for fixture data
  or when the token cannot read it. It is never written into the committed fixture (it contains private-contribution counts).
- Freshness: a GitHub Action (`scheduled-deploy.yml`, daily plus a manual button) calls a Vercel deploy hook; the rebuild re-runs the sync.

## 3. Data layer

Components never touch JSON or GitHub. They depend on the abstract `PortfolioRepository` (an injection token).

| Adapter | Use |
|---|---|
| `BuildTimeJsonRepository` | Default. Reads the generated JSON bundled at build time |
| `FixtureRepository` (`data/testing.ts`) | Tests |

`PortfolioStore` is a signals facade: private state, public read-only computed views (`projects`, `featured`, `archive`, `languages`,
`activity`, `source`). `load()` is memoised, so concurrent callers share one load; the app initializer loads it before the first page.

## 4. Visitor analytics (consent-free by design)

Goal: know how the site is used without collecting anything that needs consent.

**Rules:** no cookies, no `localStorage`/`sessionStorage`/IndexedDB identifiers, no fingerprinting, no raw IP storage, no cross-site
tracking, aggregated data only, no personal data in events or URLs. Do Not Track and Global Privacy Control switch analytics off.

**Provider:** Vercel Web Analytics and Speed Insights, through our own `VercelAnalytics` adapter (about 100 lines; the `@vercel/*`
packages' optional peer dependencies conflicted with the toolchain). It loads only in production browser builds. The owner must
enable both features in the Vercel dashboard; until then the two script requests under `/_vercel/` return 404 and nothing is collected.

**Events** (a typed union in `analytics.port.ts`, so only allowed events and properties compile):

| Event | Properties |
|---|---|
| `cv_download` | none |
| `project_open` | `slug` |
| `contact_click` | `channel`: email, github, linkedin, instagram |
| `scroll_depth` | `depth`: 25, 50, 75, 100 (once per page and threshold; pages that barely scroll are ignored) |
| `app_error` | none (at most 3 per page load; never the message or stack) |

Page views and referrers come from the provider itself. Components send events through `AnalyticsPort` (a `NoopAnalytics` is the
default for development, tests and server rendering) or declaratively with the `appTrack` directive.

**Known limits:** no returning-visitor tracking across days; ad blockers undercount, so numbers are approximate.

## 5. Quality gates

- Static: strict TypeScript and templates, `angular-eslint` (template accessibility rules on), layer boundaries, Prettier.
- Tests: app tests (`npm test`) and build-script tests (`npm run test:scripts`).
- CI (GitHub Actions): format check, lint, script type-check, both test suites, production build (with size budgets), `npm audit`.
- CSP: `script-src 'self'` only. The production build must not contain inline executable scripts (the JSON `ng-state` block is data).

## 6. Decisions that still apply

| ADR | Decision |
|---|---|
| ADR-002 | Build-time GitHub sync with ports and adapters; no runtime GitHub calls, no backend |
| ADR-003 | Signals-first state; no NgRx |
| ADR-011 | Consent-free analytics behind an `AnalyticsPort` |
| ADR-014 | Stable async APIs (app initializer) instead of experimental `resource()` |
| ADR-015 | Sync failure policy: real-data fixture locally, fail in CI and on production without a token |
| ADR-023 | Static prerender with hydration (no event replay) |
| ADR-026 | Own cookieless analytics adapter for Vercel; DNT and GPC respected |
| ADR-028 | The activity calendar is optional data inside `index.json`, never committed in the fixture |

Everything about the 3D "Packet's Journey" experience, the design system and the page designs (ADR-001, 004 to 010, 012, 013,
016 to 022, 024, 025, 027) was superseded by the removal.

## 7. Extending

- **Add a project:** pin the repo on GitHub (optionally add `portfolio.json`); it appears after the next deploy. No code change.
- **Add pages:** add a route in `app.routes.ts` and, to prerender it, in `app.routes.server.ts`. Read data from `PortfolioStore`;
  send events with `appTrack` or `AnalyticsPort`.
- **Add an integration:** the activity calendar is the reference example (query in `scripts/lib/github.ts`, normaliser in
  `scripts/lib/activity.ts`, optional field in the schema and `PortfolioIndex`, store signal).
- **Change the data source:** provide a different `PortfolioRepository` adapter in `app.config.ts`.
