# Launch runbook

What is built, what only the owner can do, and how to verify the launch. Tokens and account settings are never handled by
the assistant; every item under "Owner steps" needs the owner.

## 1. State of the code (Phases 4 to 6)

Built, tested and verified locally (see ARCHITECTURE.md section 13 for the evidence):

- **Static prerender** (`@angular/ssr`, `outputMode: static`): every page is real HTML, with a true 404 status page. `/journey` is
  client-rendered (WebGL) and marked `noindex`.
- **SEO:** per-page title, description, canonical, Open Graph and Twitter tags, a default share image, JSON-LD (`Person`,
  `WebSite`, `SoftwareSourceCode` per project), `sitemap.xml` and `robots.txt` generated at build from the real project list.
- **Security headers and a strict CSP** in `vercel.json` (script hashes verified at build, so a changed inline script fails the build).
- **Legacy redirects** (`/project/*`) at the edge; long-lived caching for hashed assets.
- **Privacy page** (accurate to what the code does) and an **Impressum page** that stays hidden until the address is filled in.
- **Analytics** through our own `AnalyticsPort` adapter for Vercel Web Analytics and Speed Insights (cookieless, DNT and GPC
  respected, events carry only coarse values), plus error and WebGL-fallback events.
- **Quality gates in CI:** lint, unit tests, axe accessibility tests, build budgets, CSP check, smoke test of the built
  site, Lighthouse CI (mobile). Locally: performance 99-100, accessibility 100, SEO 100, best practices 96.
- **Monitoring:** a smoke workflow runs after every successful production deployment; run it by hand any time:
  `npm run smoke -- https://<your-domain> --expect-real-data`.
- **Activity graph** (Phase 6): a year of GitHub contributions on the home page, shown only when the build had a token.

## 2. Owner steps (in this order)

1. **Create the GitHub token** (public data only; a fine-grained token with no extra permissions, or a classic one with no
   scopes) and add it in Vercel (Project, Settings, Environment Variables) as `PORTFOLIO_GH_TOKEN` for **Production and
   Preview**. Without it the production build refuses to run (ADR-015); that is the most likely reason the `main`
   production deployments failed after the merges. To see the exact reason: `npx vercel inspect <deployment-url> --logs`.
   - Alternative while you are undecided: set `PORTFOLIO_ALLOW_FIXTURE=1` to deploy with the committed sample data. The site
     then shows a "sample data" notice, and the smoke test with `--expect-real-data` fails on purpose.
2. **Create a Vercel Deploy Hook** (Settings, Git, Deploy Hooks, branch `main`) and add its URL as the GitHub secret
   `VERCEL_DEPLOY_HOOK`. This powers the daily rebuild that keeps the projects and the activity graph fresh.
3. **Enable Web Analytics and Speed Insights** for the project in the Vercel dashboard. Until then, the two script
   requests under `/_vercel/` return 404 (harmless console noise, no data). Then verify the claims in the privacy text
   against Vercel's own current documentation (cookieless, retention, data location) and adjust `src/app/features/legal/privacy.page.html` if they differ.
4. **Domain and site address:** the canonical address comes from `VERCEL_PROJECT_PRODUCTION_URL`. If you use a custom
   domain, make it the primary domain of the project (or set `SITE_URL`), so canonical links, the sitemap and the
   share tags use it.
5. **Pin up to six repositories** on your GitHub profile (they become the featured work). Add a `portfolio.json` to a repo to
   improve its card (ParkRabbit and Eber are the best candidates).
6. **Impressum:** fill in your postal address in `src/app/content/legal.ts` (`LEGAL.address`). The page and the footer link
   appear automatically. Whether you need one is for you (or a lawyer) to confirm; this repo does not give legal advice.
7. **CV decision:** the PDF on the site is still the old one. The new Master CV contains your phone number, which is
   already public today. Decide whether the new public PDF keeps it; then export it and replace
   `public/assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf` (or tell the assistant to do it).
8. **Review the 3D rooms** on your own machine and, if you can, on a phone. The phone benchmark and a visible-tab FPS check
   (Spike 0 open items) are still open.

## 3. Launch checklist

- [ ] Steps 1 to 5 above done; a redeploy of `main` is green in Vercel.
- [ ] `npm run smoke -- https://<your-domain> --expect-real-data` prints all checks passed.
- [ ] Open `/`, `/work`, one project, `/resume`, `/privacy`, `/journey` on a phone and a laptop.
- [ ] `https://<your-domain>/project/eber` redirects to `/work/Eber-app`.
- [ ] Share a project link in a chat app and check the preview card.
- [ ] Submit the sitemap in Google Search Console and Bing Webmaster Tools (optional, needs your accounts).
- [ ] Update the website links on GitHub and LinkedIn.

## 4. Not built, and why

| Item | Reason |
|---|---|
| German launch and `hreflang` | Needs review by a native speaker; the owner is A2. Structure and extraction are ready. |
| New CV swapped into the site | Open question about the phone number (step 7). |
| Error-monitoring service (Sentry or similar) | Needs an account and a privacy decision. In-app errors are counted anonymously through the analytics events instead. |
| Writing section (RSS), npm stats, WakaTime | Each needs an input only the owner has (feed URL, package names, API key). Adding one is a provider plus a section, see ARCHITECTURE.md section 15. |
| Storybook | Deferred by ADR-013; `/styleguide` covers the need. |
| Photoreal top tier | Out of scope for v1 (decided); revisit only on request. |
| Screen-reader pass (NVDA or VoiceOver) | Automated axe checks pass; a manual pass needs a human with the tool. |
