# Stable Baseline

## Baseline Status

The current implementation is the **protected stable baseline**, designated by the user after restoring a previous version. This document records the checked-in implementation, not a proposed redesign. Preserve its working behavior unless a change is explicitly requested; extend existing systems instead of casually replacing them.

“Stable” is the baseline designation, not a claim that every browser/input combination has been validated or that the implementation has no limitations.

| Record | Value / confirmation field |
| --- | --- |
| Baseline date | Engineering baseline record established 2026-10-01, as recorded in `CHANGELOG.md`; original acceptance/restoration date: [Confirm if different]; source inspection: 2026-10-01 |
| Git commit/hash | Original inspection: `170a6f8e01eec690b91134dec37c8ee1374e8e43`. Verified implementation: `86df249d7e00683883e989e85fce0734cf692268`. Frozen record commit: resolve `baseline-verified-2026-10-01^{commit}`; see the freeze record below |
| Version/tag | `package.json`: `1.0.0` (unchanged); annotated freeze tag: `baseline-verified-2026-10-01` |
| Browser validation status | Verified on 2026-10-01 within the recorded Chromium/simulated-input boundary below; not physical-input or cross-browser certification |

Inspected sources: `src/App.tsx`, `src/useParallaxEngine.ts`, `src/index.css`, `src/main.tsx`, `package.json`, and `tsconfig.json`. No implementation changes or browser/build tests were performed while creating this document.

## Verified Baseline Freeze — 2026-10-01

**Status: verified within the documented test boundary and frozen as the protected baseline.** This follow-up records the subsequent verification and user acceptance; it does not rewrite the original source-inspection history or claim that every regression-checklist item was tested. No application behavior changed during the freeze.

| Freeze record | Verified state / evidence |
| --- | --- |
| Verification and freeze date | 2026-10-01 (UTC) |
| Tested implementation | `86df249d7e00683883e989e85fce0734cf692268`, containing the self-hosted Inter and favicon fixes and their verification entry in `CHANGELOG.md` |
| Pre-freeze snapshot | `5584840f4991280be56cb62333c18791b33a6e93`; its only change after the tested implementation was an additive `ARCHITECTURE.md` update. Application, assets, dependencies, configuration, and deployment scripts are identical to the tested implementation |
| Freeze identifier | Annotated local Git tag `baseline-verified-2026-10-01`, pointing to the commit recording this freeze. Obtain the immutable full commit hash with `git rev-parse 'baseline-verified-2026-10-01^{commit}'`; no self-referential commit hash is embedded in this file |
| Browser/environment | `/usr/bin/chromium`: Chromium 151.0.7922.173 on Debian GNU/Linux 13 (trixie), headless local browser controlled through Chrome DevTools Protocol. Local Vite preview at `http://127.0.0.1:3000/`; simulated fine-pointer, wheel, keyboard, and touch input. No certificate-validation bypass |
| Viewports | CSS widths 1920, 1440, 1280, 1024, 768, and 390 px with 900 px height; additional mobile touch/visual inspection at 390 × 844 px. No horizontal page overflow in the checked layouts; documented navigation, cursor, and sticky/non-sticky fallbacks preserved |
| Inter typography | Exact original Google Fonts WOFF2 subsets self-hosted under `public/fonts/`, with the SIL Open Font License and existing 400/500/600 weights. Actual custom Inter rendering confirmed with Google Fonts hosts blocked; no external font requests. Desktop/mobile typography visually inspected |
| Font fix | Original loading URL was valid; the verification browser rejected the environment's TLS interception CA with `ERR_CERT_AUTHORITY_INVALID`. Local font loading removes that dependency without substituting the font or changing typography rules |
| Favicon fix | Matching monochrome node-circle SVG and 16/32/48 px ICO in `public/`; `/favicon.ico` and SVG return HTTP 200. Explicit `%BASE_URL%` links and built deployment-base URLs verified |
| Production/type validation | `pnpm exec tsc --noEmit` passed. `figma make verify-deploy` passed production build/output validation. Built font/license/icon bytes match source assets; built CSS has no Google Fonts dependency. No production publish performed |
| Production browser check | Built bundle loaded through a static-file browser fixture: app mounted, four projects rendered, local Inter loaded, icon paths requested, no runtime errors. Not a live published-site certification |
| Interactions/navigation | Native section navigation, all four project hover/details, architecture nodes and chapters, three experience details, stack hover/focus, five service details, contact destinations, and custom-cursor states checked. Contact remains navigation/email behavior, not a modal |
| Modal behavior | Project/experience/capability opening and selected content, Close/Escape, initial Close focus, body scroll locking/release, nested project detail scrolling, and mobile touch opening checked; existing accessibility limitations remain |
| Reduced motion | Emulated `prefers-reduced-motion: reduce`: neutral scene layers, visible content, immediate native anchor scrolling, documented sticky fallbacks, and usable overlays verified, including runtime preference switching. This does not mean the desktop cursor is disabled or every hover state is motion-free |
| Scroll/reveal/parallax | Simulated slow/fast continuous scrolling, stepped/rapid wheel input, and alternating direction; finite layer values and valid progress range. A full sweep revealed all 19 page reveal elements and reached progress 1 at the bottom. Existing engine and transform composition unchanged; no hardware jitter or measured frame-rate certification |
| Browser errors | Final isolated Chromium run and production fixture reported no console errors or JavaScript exceptions |
| Architecture consistency | Current owners inspected and documented; original architecture content preserved. GitHub sync, repository/store, analytics, README, profile module, and resume boundaries remain explicitly planned, not implemented features |

### Verification Boundary and Remaining Limitations

- Physical mouse-wheel and trackpad behavior has **not** been hardware-tested. Simulated wheel/continuous-scroll checks are not proof of physical-input jitter-free behavior.
- Cross-browser certification and real-device hardware coverage have **not** been performed. Results apply only to the recorded Chromium environment and tested conditions.
- No measured frame-rate/performance certification, live production deployment certification, or complete accessibility certification is claimed. Existing placeholder content, dialog focus-trap/inert/backdrop gaps, reduced-motion desktop cursor behavior, and other known limitations below remain unchanged.
- Prior evidence is recorded in the 2026-10-01 “Self-hosted Inter and Portfolio Favicons” changelog entry and the verification sessions preceding this freeze. Freeze-time checks confirm Git identity and unchanged implementation; they do not represent a new browser/build test run.
- `CHANGELOG.md` is unchanged during this documentation-only freeze: no feature, behavior, architecture, or motion implementation changed that requires a new entry under the existing protocol. This section records the acceptance/freeze milestone.

The tag identifies a protected comparison point; it is not a release/version bump or remote branch-protection mechanism. The commit/tag are local unless separately pushed with authorization. Future work must follow `AGENTS.md`, `STABILITY_CONTRACT.md`, and `CHANGE_PROTOCOL.md` and preserve this verified behavior within its stated boundary.

## Current Page Structure

The application renders a document scroll-progress bar, custom cursor, and fixed navigation before the following `main` sections, in this exact order:

| Order | Section / anchor | Existing content |
| --- | --- | --- |
| 1 | Hero / `#top` | Software Engineer, Stuttgart / Germany, three-line headline, summary, node visual, and scroll-to-work cue |
| 2 | Selected projects / `#work` | Code Sentinel, Facility Importer, Northstar, VC Brain; four project tracks and a shared project-detail overlay |
| 3 | Experience / `#experience` | Aperture Systems, Fieldwork Labs, Independent; role, technologies, period, and experience-detail overlay |
| 4 | Engineering stack / `#stack` | Frontend, Backend, Data, AI / Systems groups with technology-to-project references |
| 5 | About / Education / `#about` | Engineering statement, MSc · Computer Science, Stuttgart, AI-assisted software interest, and areas of interest |
| 6 | Capabilities / `#services` | Five service rows and capability-detail overlay |
| 7 | Contact / `#contact` | Availability statement, Stuttgart · CET, email, LinkedIn and GitHub links |

A dark footer follows `main`, with name/role, design statement, and Back to top. The main page is predominantly light; About uses a slightly darker light surface. Contact, footer, and detail overlays are dark. Aperture Systems is an experience row, not a separate dark page section.

The visual baseline uses Inter, uppercase editorial display typography, warm monochromatic surfaces, thin rules, generous spacing, and CSS-built technical geometry rather than photographic project images.

## Existing Interactions

- **Navigation scrolling:** native hash links target Work, About, Experience, Contact, and Top. The hero cue targets Work; the footer returns to Top. CSS enables smooth anchor scrolling except under reduced motion. An IntersectionObserver updates the active navigation link; a scroll listener applies a translucent blurred header after `scrollY > 24`.
- **Project rows:** each is a button opening its corresponding case study. Desktop hover lightens the row, shifts the title right, reveals description and case-study CTA, darkens metadata, and slightly scales the visual. Fine-pointer movement offsets internal copy/art through inherited variables; the row remains the pointer coordinate reference.
- **Project details:** a full-screen dark overlay contains year/category/role, title/description, large technical visual, Problem/Constraint/Decision/Result narrative, interactive architecture nodes, a shared implementation fragment, and result chapter. Nested scrolling updates a five-step Overview → Problem → Architecture → Implementation → Result indicator. The indicator is informational, not clickable. Architecture nodes activate on mouse enter, focus, or click, changing their styling and explanatory text.
- **Experience rows:** buttons open an Experience overlay containing period, company, role, shared descriptive copy, and core technologies. Hover lightens the row, offsets scroll-layer content horizontally, and reveals/moves its arrow.
- **Services:** buttons open a Capability overlay with selected title/description and a mailto link. Hover sweeps a dark background from the left, changes text color, adds horizontal inset, and offsets the arrow.
- **Stack:** hover or visible keyboard focus reveals a “Used in” project reference and adds left inset. These buttons have no click action or detail overlay.
- **Contact:** email links use `mailto:alex@example.com`; social links navigate to the generic LinkedIn/GitHub home pages in the current browsing context. Email hover increases horizontal padding; social hover adds an underline. There is no contact form or contact modal.
- **Modal close:** the Close button clears the relevant selection. Escape invokes the same close callback. Body scrolling is locked while open; the overlay has its own scroll container. Code schedules focus on Close after 350 ms and restores the previously focused element during cleanup. There is no backdrop-click close handler or focus trap.
- **Custom cursor:** fine-pointer desktop uses a small cursor-following circle. Hovering `data-cursor` targets expands it and displays labels such as OPEN ↗, VIEW, OPEN, TALK, and LET’S TALK. It is decorative, ignores pointer events, and is hidden on narrow/coarse-pointer layouts.
- **Scroll progress:** a fixed 2 px bar scales from the left using document scroll position divided by the cached document scroll range. It is not the project-overlay chapter indicator.
- **Reveals:** `.reveal` elements receive `.is-visible` when intersecting at threshold `0.12`, then are unobserved. Headers reveal label, heading, and note with staggered opacity/vertical entrance; project rows, stack groups, and service rows fade in; About copy has its own reveal variables.
- **Parallax:** scene-specific internal layers respond to native document or overlay scrolling; hero geometry additionally responds to pointer position. No wheel interception or replacement scrolling implementation is installed.
- **Responsive/reduced-motion interactions:** smaller layouts retain project/experience/service opening and Close/Escape handlers, but hide some supplementary UI. Reduced motion disables smooth anchor scrolling and neutralizes scene/reveal motion; details are listed below.

## Current Motion Behavior

### Scroll-linked scenes and rendering

`App` invokes `useMotionSystem`, a local alias of `useScrollSceneEngine`. The engine is implemented in `src/useParallaxEngine.ts`, which also exports the compatibility alias `useParallaxEngine`.

Scenes use `data-scroll-scene`; internal layers use `data-scroll-layer`. Optional attributes configure three keyframes for x/y translation, scale, opacity, rotation, and blur, plus phase, strength, damping, and pointer amplitude. No current JSX layer explicitly configures blur. Keyframes are sampled with smoothstep interpolation across entry/middle/exit. Targets depend on clamped native scroll progress and cached geometry; rendered layer values converge using elapsed-time-adjusted damping.

Geometry uses summed `offsetTop`/`offsetParent` positions and `offsetHeight`, not transformed layer rectangles. Ordinary scene ranges span viewport plus section height; the hero uses the special `data-scene-origin="visible"` range. Overlay scenes use `.overlay-scroll` height and `scrollTop`, and are skipped when their overlay is closed.

One guarded requestAnimationFrame scheduler measures dirty geometry, reads scroll/pointer state, calculates targets, then batches CSS-variable writes. It continues while layers settle and stops when settled. Scroll and pointer events request rendering rather than directly applying transforms. Resize/orientation, observed sizes, relevant child mutations, font readiness/loading, and media-query changes invalidate geometry. Effects clean up observers, listeners, and pending frames.

The remaining `getBoundingClientRect()` read is for the active pointer anchor, not scene-progress calculation. CSS composes scene, pointer, hover, reveal, and magnetic offsets; duplicate variable writes are suppressed.

### Existing choreography

- **Hero:** 135svh track with a 100svh sticky interior. Grid, metadata, headline, summary, art, and scroll cue have different travel/opacity/scale responses; supporting text recedes, while grid and technical art separate from typography. Projects overlap the hero's end by 18svh.
- **Projects:** desktop tracks have a 68svh minimum height; rows stick at `top: 24svh`. Internal index, copy, metadata, grid backdrop, art, and foreground annotation have independent keyframes. The technical art's scroll scale combines with hover scale `1.04`; title hover adds 8 px horizontal movement. There are no image assets to scale.
- **Other sections:** headers have layered entrance/travel. Experience rows use restrained independent text offsets; stack group headings/content, About copy, and capability labels/titles/arrows have their own scroll responses.
- **Contact:** a 128svh track with 100svh sticky interior layers the grid, availability/location, headline, email, and social links at different rates.
- **Cursor:** the engine writes position on pointer input; CSS transitions size and label presentation over 200 ms. Close buttons use magnetic offsets derived from a stable wrapper. The contact email has magnetic styling but is not selected by the current magnetic pointer-target handler.
- **Modal transitions:** the mounted overlay moves from `translateY(101%)` to its resting position over 800 ms with the shared restrained ease. The same CSS transition applies on close, though selected content is immediately cleared. Architecture activation raises its active button 5 px; chapter-marker color/offset/line length transition with active chapter changes.
- **Service/stack/experience hover:** service background sweep and padding/color changes, stack inset and reference reveal, and experience background/content/arrow changes remain distinct from scroll-layer variables. These include CSS padding transitions; this baseline does not animate layout dimensions as its scroll-parallax mechanism.

**CSS ownership clarification (documentation audit, 2026-10-01):** configured scene variables are not always the effective CSS property. Later rules fix the hero grid's own opacity at `.24`, hero art at `.75` (`.45` at ≤800 px), contact grid at `.22`, and project backdrop at `.3` under normal motion. Their scene transforms still operate, but their own opacity does not follow the engine's opacity variable. Reduced-motion overrides force scene-layer opacity to one. Also, reveal-marked project rows override their base background-transition list; reveal-marked service rows use 350 ms padding with no color transition, while the background pseudo-element retains its 500 ms sweep. See `MOTION_SYSTEM.md` for effective timing. These are clarifications of unchanged source, not implemented fixes.

The one-time reveal state remains set after entry; configured scene opacity can still recede as a layer leaves. “Reveal stays visible” means the reveal system does not reset or strand content, not that scroll-linked opacity can never change.

### Responsive motion and reduced motion

- Engine strength is `1` at widths ≥1100 px, `0.66` at ≥600 and <1100 px, and `0.26` below 600 px. Pointer parallax/magnetic offsets require a fine pointer and no reduced-motion preference.
- At ≤800 px, primary navigation links and custom cursor are hidden; wordmark and Contact remain. Project tracks lose desktop sticky behavior, descriptions/CTAs stay visible, and visuals become smaller corner compositions. Experience reflows; stack becomes two-column and hides “Used in” text; About and detail layouts stack. The case-study chapter indicator is hidden. Hero/contact retain shortened sticky tracks under normal motion.
- Coarse pointers use native cursors and hide the custom cursor.
- Reduced motion sets anchor scrolling to auto, forces almost-instant animation/transition durations, removes scroll-layer transforms/blur and forces opacity to one, and exposes reveals without entrance offsets. Hero/contact lose extended tracks and sticky positioning; project rows stop sticking and the hero/project overlap is removed. Engine scene targets become neutral and pointer motion is disabled. Cursor-following itself is not disabled by this preference, and not every non-scene hover transform is removed.

## Current Data Architecture

All content is local to `src/App.tsx`; there is no backend, CMS, remote content fetch, or URL routing system.

- `portfolio.person` stores name, role, location, multiline statement, and summary. Some name/contact/about/footer content is separately hardcoded in JSX.
- Projects use a `Project` type: title, year, category, stack array, description, visual discriminator, problem, constraints, decision, result, role, and architecture array. Four records are mapped into tracks/rows and reused in `ProjectDetail`. `TechnicalVisual` branches on nodes/pipeline/radar/retrieval. The stored project stack array is not rendered in rows or details.
- Experience is an array of company/role/period/tech objects, mapped to buttons and selected-detail content. Overlay prose is shared rather than unique per employer.
- Technologies are a `Record<string, string[][]>` grouping technology/project pairs, rendered with `Object.entries` and nested mapping.
- Services are title/description pairs, mapped to row buttons and selected-detail content.
- Projects, Experience, and Services each own local nullable selection state and a separate instance of the reusable `DetailOverlay`. All three overlays portal into `document.body` and remain mounted while their content is conditional. Architecture active-node and project active-chapter state are local to detail components.

## Protected Systems

| System | Current behavior | Why it matters | Regression examples |
| --- | --- | --- | --- |
| Navigation | Native anchors, active-link observer, scrolled header, mobile wordmark/Contact | Orientation and quick recruiter access | Broken anchors, lost return-to-top, intercepted native scrolling |
| Project rendering | Four ordered data-driven tracks and typed technical visuals | Consistent project identity and editorial structure | Missing/reordered projects, incorrect record/visual pairing |
| Project interaction | Hover depth and button-opened case studies; architecture activation | Lightweight scanning plus deep exploration | Lost hover cues, dead buttons, wrong details or inactive nodes |
| Experience interaction | Row hover and selected employer detail | Accessible professional context | Nonfunctional rows or mismatched role/period/technology |
| Services interaction | Background sweep and capability detail with email action | Clear capability exploration | Lost sweep/open action or incorrect service content |
| Modal system | Body portals, fixed transitions, scroll lock, nested scrolling, Close/Escape, focus restoration | Exploration without abandoning the page | Background scrolling, broken close, lost page position, overlay lifecycle leaks |
| Cursor system | Fine-pointer following and contextual labels, narrow/coarse fallback | Existing restrained interaction feedback | Missing labels, cursor blocking clicks, unusable pointer fallback |
| Scroll progress | Document progress bar and separate observed detail chapters | Position and narrative orientation | Incorrect range, missing bar, stale chapter highlights |
| Reveal system | One-time observed visibility with header stagger | Existing entrance hierarchy and readable content | Content stays hidden or repeatedly replays on re-entry |
| Parallax system | Shared cached-layout scene engine, layered CSS variables, one RAF scheduler | Stable depth and composed interactions | Transform feedback, competing loops, overridden hover, lost overlay motion |
| Responsive behavior | 800 px CSS reflow plus engine strength breakpoints | Usable narrow-screen content and details | Sticky rows restored on mobile, clipping, inaccessible detail actions |
| Reduced-motion behavior | Neutral scenes, visible reveals, no extended sticky tracks | Motion-preference accommodation | Hidden content, restored large travel, forced smooth scrolling |
| Data-driven rendering | Existing project/experience/technology/service mappings | Reliable content reuse | Duplicate parallel datasets, selection/content mismatch, lost records |

## Known Limitations

These are source-inspection findings, not authorization to fix them:

- Identity, companies, education, availability, narratives, and example email are placeholder/unverified content. Social links are generic destinations. No real-world claims were verified.
- Project `stack` data is present but not displayed. Implementation code and experience prose are shared examples, not project-specific technical evidence.
- Overlays have no focus trap, background inert handling, or backdrop-click dismissal. Initial Close focus was checked in the recorded Chromium verification; this does not establish complete focus-management or accessible-dialog conformance.
- Clearing selection removes detail content at the start of the close transition rather than retaining it until the exit completes.
- Desktop project description/CTA reveals are hover-specific; keyboard focus does not have equivalent reveal selectors. Mobile always exposes them. Mobile stack references are hidden, and stack buttons have no click action.
- The contact email's magnetic class does not match the engine's pointer-target selector, so it has hover/scroll motion but no implemented magnetic tracking.
- Active navigation starts at Work; the scrolled-header state is initially false and is updated only on scroll. Sections without a matching primary link can leave no primary link highlighted.
- The cursor label listener checks fine-pointer capability on mount, whereas the engine also listens for capability changes. Reduced motion retains cursor-following and some immediate non-scene hover offsets.
- The original documentation task performed no browser validation. Subsequent Chromium checks are recorded in the freeze section above; physical trackpad/mouse consistency, cross-browser certification, complete focus-management conformance, and measured browser performance remain unverified. No automated test script is configured.

## Baseline Verification

Record browser/device, viewport, input method, motion preference, and results; leave unperformed checks unchecked. This checklist verifies the recorded baseline, not future features or remediation of known limitations.

- [ ] Confirm the recorded commit/version and note any intentional differences.
- [ ] Confirm section order, project order, content, typography, spacing, and light/dark surfaces.
- [ ] Follow every navigation anchor, hero cue, and Back to top; check active-link and scrolled-header behavior.
- [ ] Scroll slowly/quickly with trackpad and stepped/rapid physical wheel input; reverse direction and repeatedly cross section boundaries. Record simulated input separately.
- [ ] Confirm desktop hero/contact sticky scenes, project track sticking, and distinct internal layer depth without transform feedback or unintended position corrections.
- [ ] Hover every project, then move the pointer and scroll simultaneously; confirm title/description/CTA/metadata/art composition remains intact.
- [ ] Open every project detail; confirm selected content, nested scrolling, chapter highlights, and architecture activation by hover/focus/click.
- [ ] Open every experience and capability detail; confirm correct selected content and service email action.
- [ ] Close each overlay using Close and Escape; check body lock/release, page position, attempted Close focus, and focus restoration. Record the known lack of a focus trap.
- [ ] Check stack reference reveals on desktop hover/visible focus and the intentionally hidden narrow-screen references.
- [ ] Check cursor following, labels, magnetic Close movement, email hover, and actual contact/social destinations.
- [ ] Check document progress at top/middle/bottom; verify overlay scrolling changes chapter state rather than document progress.
- [ ] Confirm one-time reveals leave content visible after scrolling away and back.
- [ ] Check widths above/below 1100, 800, and 600 px, narrow touch layouts, and orientation changes; confirm reflow and reachable overlay controls.
- [ ] Enable reduced motion before load and toggle it at runtime; verify visible content, neutral scene layers, native anchor scrolling, and removed extended sticky tracks.
- [ ] Verify keyboard activation/focus visibility, Escape, and coarse-pointer native behavior, documenting existing accessibility gaps rather than assuming compliance.
- [ ] For later code changes, run applicable build/type checks and compare against this baseline; this documentation-only task did not run them.

Do not declare later feature work complete if an existing working interaction disappears or changes unintentionally. Record approved differences and regression results rather than rewriting this historical record to hide regressions.
