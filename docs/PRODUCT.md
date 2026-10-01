# Product scope

Status: **paused for a redesign.** The previous UI (2D pages and the 3D "Packet's Journey") was removed on 2026-10-01 because
the owner did not like the UX. A new direction will be defined next. Technical state: [ARCHITECTURE.md](ARCHITECTURE.md).

## What is kept, and why

| Capability | Why it stays |
|---|---|
| Projects come from GitHub at build time (pinned repos are featured, optional `portfolio.json`, READMEs rendered to sanitised HTML, contribution calendar) | Adding a project needs no code change; independent of any UI |
| Consent-free visitor analytics (page views, referrers, CV downloads, contact clicks, project opens, scroll depth, error counts) | The owner wants to see how the site is used without a consent banner |
| Static prerender, strict security headers, CI | Foundation for whatever UI comes next |

## Analytics requirements (unchanged)

- No cookies, no device storage, no fingerprinting, no raw IPs, no cross-site tracking; aggregated data only.
- Do Not Track and Global Privacy Control switch it off.
- No "returning visitor" tracking across days, no raw device or GPU details, no "which company visited" lookups.
- Campaign links use `?utm_source=application&utm_campaign=<company>`, per company and never per person.
- Whatever the new site shows must describe this accurately in a privacy page (the old text is in git history, commit `d9b1b03`,
  `src/app/features/legal/privacy.page.html`).

## Open questions for the new direction

1. What should the new site be (audience, tone, structure)?
2. Does an Impressum apply? (Germany; verify before launch. The old page stayed hidden until an address was supplied.)
3. German content: the CV states German A2, so German needs a native-speaker review before shipping.
4. Phone number: the Master CV contains one and it is already public. Keep or omit it on the web and in the downloadable CV?
5. Availability line ("looking for a Werkstudent role"): keep it?
6. Which CV PDF ships (`public/assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf` is still the old one)?
