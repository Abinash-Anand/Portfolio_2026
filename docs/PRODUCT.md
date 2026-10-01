# Portfolio v2 - Product scope (functionality and MVP)

Status: **draft for review** · How it is built: see [ARCHITECTURE.md](ARCHITECTURE.md) · Experience concept: see [CONCEPT.md](CONCEPT.md) · Visual rules: see [DESIGN.md](DESIGN.md).

This document says **what the site does** and what is in the first release. It changes when scope changes;
`ARCHITECTURE.md` changes when the technical design changes.

## 1. Audience and success

| Audience | What they need |
|---|---|
| Recruiters and hiring managers | A strong impression in well under a minute, clear skills, easy CV and contact |
| Engineers | Evidence of depth: architecture, performance, real projects with real READMEs |
| Collaborators | What you have built and how to reach you |

Success looks like:
- a visitor reaches the contact or CV in a few clicks;
- the site feels smooth on an ordinary integrated-GPU laptop (budgets in ARCHITECTURE.md section 9);
- adding a project requires no code change;
- you can see how the site is used, without collecting anything that needs consent.

## 2. MVP features

| ID | Feature | Acceptance criteria |
|---|---|---|
| F1 | **Home hero** (3D, middle-ground style) | Name, role and call to action are real HTML text that paints before the 3D loads; the 3D fades in when ready; falls back cleanly (see F9) |
| F2 | **About** | Profile copy from one typed content file; readable without animation |
| F3 | **Featured work** | Repos pinned on GitHub appear automatically with summary, stack and links; ordered by `portfolio.json` `order`, else by pin order |
| F4 | **Work archive** (`/work`) | All non-fork public repos listed; filter by language/tag |
| F5 | **Work detail** (`/work/:slug`) | README rendered with a table of contents, facts rail (stack, links, stars, last push), prerendered per project |
| F6 | **Skills** | Derived from project stacks and languages, with curated overrides |
| F7 | **Contact and CV** | Email, GitHub, LinkedIn, Instagram; CV download works and is tracked (F12) |
| F8 | **Motion** | Smooth scroll, parallax, reveals; all honour `prefers-reduced-motion` |
| F9 | **Tiers and fallbacks** | `high`, `medium`, `low`, `static` tiers; a device without WebGL or with reduced motion still gets full content |
| F10 | **SEO and sharing** | Per-page title, description and Open Graph tags, sitemap, real 404, old `/project/:id` URLs redirect |
| F11 | **Accessibility baseline** | Keyboard-operable, visible focus, skip link, landmarks, no critical axe violations |
| F12 | **Privacy-first analytics** | See section 3 |
| F13 | **Legal pages** | Privacy page that states exactly what analytics collects; Impressum if required (to be verified, not legal advice) |
| F14 | **Freshness** | New or updated repos appear after the next scheduled or manual rebuild |
| F15 | **Languages** | English (default, `/`) and German (`/de/`); visible language switcher; `hreflang` set; UI and profile copy translated; GitHub-sourced text stays in its source language; no automatic redirect by browser language or location |
| F16 | **Styleguide** (internal, `noindex`) | `/styleguide` shows the design tokens, shared UI primitives and motion-directive demos |

## 3. Analytics requirements (F12)

**What you want to see** (all anonymous):

| Insight | Source |
|---|---|
| Visitor and page-view counts | Provider (approximate unique visitors) |
| Where visitors came from (LinkedIn, search, an application) | Referrer and `utm_*` parameters |
| Rough location (country or city) | Derived from the IP at request time, then discarded |
| Device, browser, OS, screen size | Provider |
| Which projects were opened | Event `project_open` with the slug |
| CV downloads | Event `cv_download` |
| Clicks on email, GitHub, LinkedIn, Instagram | Event `contact_click` with the channel |
| Scroll depth and time on page | Event `scroll_depth` (25/50/75/100) and the provider's engaged time |
| Real-user performance and quality tier | Web Vitals plus the coarse tier (`high`/`medium`/`low`/`static`) |

**Privacy constraints (must hold; no consent should be needed):**
- no cookies, no `localStorage`/`sessionStorage`/IndexedDB identifiers, no fingerprinting, no raw IP storage, no cross-site tracking;
- aggregated data only; no personal data in events or URLs;
- Do Not Track and Global Privacy Control switch analytics off;
- EU-hosted processor with a data-processing agreement (or self-hosted), documented retention;
- the privacy page describes it accurately.

**Consequences you should know:**
- **No "returning visitor" tracking across days.** Recognising someone on a later day requires a persistent identifier, which needs consent. Unique visitors are approximate within a day.
- **No raw device or GPU details** (they are fingerprinting vectors); only the coarse tier is recorded.
- **No "which company visited" lookups from the IP.**
- **Tracked links** use `?utm_source=application&utm_campaign=<company>` per company, never per person (a per-person label would be personal data).
- Ad blockers undercount, so numbers are approximate.

Technical design: ARCHITECTURE.md section 10.1.

## 4. Later (not in the MVP)

- Writing section from RSS (dev.to/Medium), npm and WakaTime stats. Need owner inputs (feed URL, package names, API key); see docs/LAUNCH.md section 4.
- The GitHub activity graph is **built** (home page, Phase 6) and appears when the build has a token.
- Per-locale `summary_de` fields in `portfolio.json` for translated project summaries.
- Storybook, if the shared UI grows large (deferred; the `/styleguide` route covers the MVP).
- A contact form (needs a small serverless function and consent for the data it collects).
- `portfolio.json` manifests for ParkRabbit, Eber and the other featured repos.
- Hero models beyond code-generated objects; a photoreal top tier is only revisited after the measured spike.

## 5. Non-functional requirements

- **Performance:** budgets and frame-time targets in ARCHITECTURE.md section 9.
- **Accessibility:** WCAG 2.2 AA as the target; content never depends on animation or WebGL.
- **Browsers:** current evergreen browsers; WebGL2 is optional because the static tier works without it.
- **Privacy:** section 3; self-hosted fonts; no third-party trackers.
- **Maintainability:** layered architecture with lint-enforced boundaries; ADRs for decisions.

## 6. Out of scope

Backend or database, user accounts, comments, a CMS, a photoreal default experience, microfrontends.

## 7. Open questions

1. ~~Analytics provider~~ Decided: Vercel Web Analytics and Speed Insights (owner enables them in the dashboard).
2. ~~Activity graph~~ Built.
3. Does an Impressum apply to this site? The page exists but is hidden until the owner adds an address in `content/legal.ts`; verify before launch.
4. German content: the CV states German A2 (progressing toward B1), so the owner cannot be the final reviewer. Ship German at launch only after native-speaker review, or launch English-only first?
5. Phone number: the Master CV contains one and it is already public (current site CV, repo history). Omit it from the web resume view and the downloadable CV going forward?
6. Availability line ("looking for a Werkstudent role"): keep it on the site? The new CV does not state it.
