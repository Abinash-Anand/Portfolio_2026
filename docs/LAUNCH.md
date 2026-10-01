# Deploy runbook

The UI is currently a placeholder page (see [ARCHITECTURE.md](ARCHITECTURE.md)). These are the steps only the owner can do;
tokens and account settings are never handled by the assistant.

1. **GitHub token.** Create a read-only token for public data (a fine-grained token with no extra permissions, or a classic one
   with no scopes) and add it in Vercel (Project, Settings, Environment Variables) as `PORTFOLIO_GH_TOKEN` for **Production and
   Preview**. Without it the production build refuses to run (ADR-015); that is the likely reason the production deployments of
   `main` failed. To see the exact reason: `npx vercel inspect <deployment-url> --logs`.
   Alternative: `PORTFOLIO_ALLOW_FIXTURE=1` ships the committed sample data on purpose.
2. **Deploy hook.** Create a Vercel Deploy Hook (Settings, Git, Deploy Hooks, branch `main`) and add its URL as the GitHub
   secret `VERCEL_DEPLOY_HOOK`. The daily workflow (`scheduled-deploy.yml`) uses it to rebuild with fresh GitHub data.
3. **Analytics.** Enable Web Analytics and Speed Insights for the project in the Vercel dashboard. Until then the two script
   requests under `/_vercel/` return 404 (harmless; nothing is collected). Check Vercel's current documentation for what it
   collects and keep the privacy text of the new site in step with it.
4. **Custom domain.** If you use one, make it the primary domain of the Vercel project.
5. **Pin repositories** (up to six) on your GitHub profile; they become the featured work. Add a `portfolio.json` to a repo to
   improve its card.

Local commands: `npm start`, `npm run sync`, `npm run build`, `npm test`, `npm run test:scripts`, `npm run lint`.
