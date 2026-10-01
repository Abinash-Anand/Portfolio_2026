# Analytics Privacy

## Activation and ownership

Analytics is off in development and off in production unless `VITE_PORTFOLIO_ANALYTICS=vercel` is explicitly configured. Enable it only on a deployment with Vercel Web Analytics and Speed Insights enabled and an appropriate reviewed provider policy. No consent bypass or visitor identity system is implemented.

Components use `AnalyticsPort`; only `src/app/infrastructure/vercelAnalytics.ts` imports the providers. SDKs initialize lazily on the first permitted event. Initialization or telemetry failure must not interrupt portfolio interactions.

## Application payloads

The runtime allowlist accepts only:

| Event | Payload |
| --- | --- |
| `project_open` | `project_index`: integer 0–5, not project name/URL |
| `cv_download` | None; only when a resume control exists |
| `contact_click` | `kind`: email, social, navigation, or calendly; never the destination URL |
| `scroll_depth` | `percent`: 25, 50, 75, or 100 |
| `app_error` | `kind`: error or unhandledrejection; never messages/stacks |

Unknown events/invalid values are dropped. Extra properties are stripped rather than forwarded. Names, emails, phone numbers, repository secrets, source code, raw authored URLs, explicit IP addresses, arbitrary user text and error contents are not application analytics payloads. SDK `beforeSend` callbacks retain only event type and the canonical site-origin `/` URL; Speed Insights receives route `/`, not query strings, fragments or personal paths.

## Privacy controls

- DNT (`1` or `yes`) and Global Privacy Control suppress initialization and event dispatch.
- Signals are checked at every `track` and provider `beforeSend`, including changes after initialization.
- Application code creates no tracking cookies, localStorage/sessionStorage/IndexedDB identifiers, fingerprints, cross-site profiles or persistent visitor IDs.
- The short pending-event queue is bounded to 20 allowlisted events in memory only; disposal clears it. Bootstrap error listeners are disposed on development HMR. Analytics adds no animation loop or scroll scheduler.
- Development emits no provider telemetry and does not load provider SDK scripts.

## Verification boundary

Local tests verify event typing, runtime payload stripping, provider isolation, no-op behavior and privacy-signal suppression. They do **not** certify deployed vendor scripts, delivery, service settings, retention, legal compliance or server-side processing. Standard HTTP transport necessarily exposes connection information to the receiving service; do not mistake an absent explicit IP event field for a guarantee that servers cannot see a connection's IP address. Review Vercel's current provider policy before opting in. Keep analytics disabled if the deployment cannot meet the required privacy policy.

GitHub credentials are separate build secrets. They never belong in browser code, analytics, generated output, or this document.
