# Portfolio 2026

Abinash Anand's portfolio. The previous UI (2D pages and a 3D experience) was removed ahead of a redesign; what remains is an
Angular 21 shell, the build-time GitHub data pipeline, and consent-free visitor analytics.

Docs: [ARCHITECTURE](docs/ARCHITECTURE.md) · [PRODUCT](docs/PRODUCT.md) · [Deploy runbook](docs/LAUNCH.md)

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server on http://localhost:4200 (runs the GitHub sync first) |
| `npm run sync` | Fetch GitHub data into `src/generated/` (needs `PORTFOLIO_GH_TOKEN`; otherwise uses the sample fixture locally) |
| `npm run build` | Production build (static prerender) |
| `npm test` / `npm run test:scripts` | App tests / build-script tests |
| `npm run lint` · `npm run format` | ESLint with layer-boundary rules · Prettier |

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `PORTFOLIO_GH_TOKEN` | Vercel (Production and Preview) | Read-only access to public GitHub data for the build |
| `PORTFOLIO_ALLOW_FIXTURE=1` | Vercel, optional | Deploy with the sample data when no token is set |
| `VERCEL_DEPLOY_HOOK` | GitHub secret | Lets the daily workflow trigger a rebuild |
