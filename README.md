# Portfolio 2026

Abinash Anand's portfolio: an Angular 21 site whose project content comes from GitHub at build time, with an optional
3D "Packet's Journey" experience (Three.js) on top of a complete, prerendered 2D site.

Documentation: [PRODUCT](docs/PRODUCT.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [CONCEPT](docs/CONCEPT.md) ·
[DESIGN](docs/DESIGN.md) · [SPIKE-0](docs/SPIKE-0.md) · [LAUNCH runbook](docs/LAUNCH.md)

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server on http://localhost:4200 (runs the GitHub sync first) |
| `npm run sync` | Fetch GitHub data into `src/generated/` (needs `PORTFOLIO_GH_TOKEN`; otherwise uses the sample fixture locally) |
| `npm run build` | Production build, then `postbuild`: prerender check, sitemap, CSP hash check, font preloads |
| `npm run serve:dist` | Serve the production build locally with the Vercel headers and redirects |
| `npm run smoke -- <url>` | Smoke-test a running copy (`--expect-real-data` for production) |
| `npm test` / `npm run test:scripts` | App tests (includes axe accessibility) / build-script tests |
| `npm run lint` · `npm run format` | ESLint with layer-boundary rules · Prettier |

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `PORTFOLIO_GH_TOKEN` | Vercel (Production and Preview) | Read-only access to public GitHub data for the build |
| `PORTFOLIO_ALLOW_FIXTURE=1` | Vercel, optional | Deploy with the sample data when no token is set |
| `SITE_URL` | Vercel, optional | Public address when it differs from the Vercel production URL (custom domain) |
| `VERCEL_DEPLOY_HOOK` | GitHub secret | Lets the daily workflow trigger a rebuild |

Full launch steps and what only the owner can do: [docs/LAUNCH.md](docs/LAUNCH.md).
