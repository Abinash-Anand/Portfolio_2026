# Architecture

This document describes the current portfolio source, not a proposed replacement architecture. Existing behavior is defined by `STABLE_BASELINE.md`; change permissions and verification requirements are defined by `AGENTS.md`, `STABILITY_CONTRACT.md`, and `CHANGE_PROTOCOL.md`. Source inspection does not constitute browser validation.

## Architectural Principles

| Principle | Current implementation and boundaries |
| --- | --- |
| Data-driven rendering | Validated portfolio-wide content and pinned-project evidence normalize into reusable UI. The only local fixture is `fixtures/portfolio.fixture.json`, explicitly fixture-only; no browser GitHub API or CMS exists. |
| Reusable sections | Named section components compose the page; `SectionHeader`, `TechnicalVisual`, `DetailOverlay`, and other helpers provide shared patterns. All live in `src/App.tsx`, not separate component modules. |
| Content/rendering separation | The portfolio repository's root `portfolio.json` (`fixture: false`) owns production page content; the only fixture is `fixtures/portfolio.fixture.json`. Separate case-study models/content remain outside GitHub evidence. Validation/normalization and one repository/store supply generic components with no person/project copy or slug-specific visual selection. |
| Progressive enhancement | Native anchors, buttons, scrolling, and CSS input/motion fallbacks underpin interactions; pointer effects are supplementary. The site is client-rendered and has no implemented no-JavaScript content fallback. Reveals depend on the engine/observer under normal motion, so full progressive-enhancement resilience is not established. |
| Responsive behavior | Fluid sizes and an 800 px CSS reflow adapt desktop composition to narrow screens; motion has separate width-based strength rules. The stylesheet is desktop-base with overrides, not a mobile-first utility implementation. |
| Accessibility | Semantic controls, focus outlines, dialog labels, Escape handling, focus-management code, and reduced-motion support exist. Known dialog and hover-disclosure gaps remain; this is not a claim of complete compliance. |
| Motion as a system | One scene engine owns scroll/pointer variables and reveal observation; CSS composes them with hover and transition states. Motion is coordinated through scene/layer metadata rather than independent per-element scroll controllers. |

## Application Structure

### HTML and bootstrap

`index.html` supplies viewport metadata, a `#root` mount, and the module script for `src/main.tsx`. Language/title/head/body slots use Figma placeholders; the Vite site-configuration plugin processes them. The HTML file does not contain a pre-rendered portfolio.

`src/main.tsx` imports global CSS, composes the production-opt-in analytics adapter, and mounts App under React StrictMode. App receives AnalyticsPort, never provider APIs. Existing effects tolerate remount; bootstrap disposes analytics listeners on HMR.

The toolchain remains React 19, TypeScript, Vite 8, Tailwind v4 and the existing preview integration/alias. The server uses $PORT, defaulting to 8443. Production build runs required GitHub synchronization before Vite. Existing dev/preview/format scripts remain. The content cleanup adds `pnpm test`, using Node’s test runner and existing TypeScript/React dependencies for offline contract, synchronization and generic-rendering tests.

### CSS

`src/index.css` imports Tailwind and declares self-hosted Inter faces for the existing 400/500/600 weights, using the same WOFF2 subsets previously served by Google Fonts. Files and the SIL Open Font License are in `public/fonts`, and these fonts plus `public/favicon.ico` are stored as regular git blobs, not Git LFS (`.gitattributes` marks `*.woff2` and `*.ico` binary), because the Vercel build does not fetch LFS objects and would otherwise serve text pointer stubs; CSS asset URLs are handled by Vite's existing base-path processing. Font family, display strategy, typography rules, and component/layout architecture are unchanged. The current JSX primarily uses semantic class names rather than Tailwind utilities.

Root variables include paper/ink/muted/line/dark/light colors, easing curves, and document progress. Registered custom properties include reveal offsets/opacity, hover scale, and inherited project-pointer offsets. The stylesheet owns typography, section/grid layouts, CSS-built technical visuals, sticky positioning, hover states, overlay/cursor styling, responsive overrides, and reduced-motion overrides.

Scene transforms are composed in `.scroll-layer`, with specialized composition for project copy/art, service arrows, and the contact email. There is no separate `src/styles` hierarchy or Tailwind configuration file in this implementation.

Engine configuration and effective styles must be distinguished: later class rules override generic scene opacity for hero grid/art, contact grid, and project backdrop under normal motion. Reveal-specific transition lists also override some row-level hover declarations. `MOTION_SYSTEM.md` records these cascade effects; writing a scene variable does not guarantee that every element consumes it.

### JavaScript/TypeScript and rendering functions

Page components and motion remain principally in two modules, with typed data/application boundaries:

- `src/App.tsx`: generic React components receiving normalized data, local interaction state, native/React event handling, and existing overlays. `App` reads the injected/default store and passes data down.
- `src/useParallaxEngine.ts`: scene types, interpolation/layout helpers, cached measurement, central scheduling, pointer state, observers, and CSS-variable rendering.
- `src/stackLayout.ts`: a pure, dependency-free function of the normalized technologies data that packs skills, in their given order, into the Engineering Stack brick wall. It knows no skill, category or project names and no counts; it returns per-tile column spans for the 12-, 7- and 2-column grids the stylesheet switches between (above 1100 px, 801–1100 px, and ≤800 px), plus each tile's position in its row for the entrance stagger. Widths follow name length, every row fills its grid exactly, spare columns are shared in proportion to demand, and neighbouring rows are offset so seams do not line up. The same data always produces the same layout; no layout work happens in the browser at resize time.
- `src/app/domain/portfolioProject.ts`: provider-independent editorial metadata, existing narrative, and composed portfolio-project types, with an optional separate `CaseStudy`; no React or provider imports.
- `src/app/domain/caseStudy.ts`: optional-depth engineering case studies, decision reasoning, explicit result status, sourced metric contracts, structured visual evidence, and relevant links; no rendering or provider integration.
- `src/app/application/projectContentContract.ts`: shared runtime validation for inline narrative, implementation and structured case-study content. The TypeScript fixture factory and unused content compatibility adapters were removed.
- `src/app/application/portfolioProjects.ts`: selects the development fixture or required generated GitHub snapshot and composes the existing single repository/store; retains compatibility exports.
- `portfolio.json` (repository root): the real portfolio-wide owner document (`fixture: false`, `projects: []`). It is not imported by the application; the build-time sync fetches it from the configured GitHub repository at the default-branch SHA. `fixtures/portfolio.fixture.json`: the explicitly marked fixture used by `pnpm dev` and tests. Pinned project JSON is authoritative for each project’s editorial content.
- `src/app/domain/portfolioData.ts`: typed source/normalized portfolio, section identity, experience/capability, and existing technical-art descriptors.
- `src/app/application/portfolioContract.ts`: portfolio/snapshot runtime validation.
- `src/app/application/repositoryContract.ts`: existing project metadata validator shared with build infrastructure through the `scripts/portfolio-contract.ts` re-export.
- `src/app/application/normalizePortfolio.ts`: domain mapping, associations, placeholders, ordering/visibility, and immutable output.
- `src/app/application/portfolioRepository.ts`: one static repository supplying validated normalized content.
- `src/app/application/PortfolioStore.ts`: one readonly UI data boundary; no network, subscriptions, or replacement of component-local state.

`App` invokes `useMotionSystem`, a local alias of `useScrollSceneEngine`, then renders progress, cursor, navigation, `main`, and footer. Main section order is Hero → Projects → Experience → Stack → About → Services → Contact. Shared helpers include `SectionHeader`, `TechnicalVisual`, `ProjectRow`, `ProjectDetail`, `ArchitectureDiagram`, `MagneticButton`, and `DetailOverlay`.

There is no router, external state store, backend, canvas renderer, or third-party animation runtime used by the portfolio.

## Data Model

### Editorial foundation: inspected gap and scoped decision

Before the editorial foundation change, `src/App.tsx` colocated a single `Project` shape with list metadata, presentation visual selectors, and owner-authored narrative fields. No dedicated content module, GitHub-derived project model, repository, or store existed. Extending that mixed shape with more optional case-study fields would blur ownership rather than establish the requested boundary.

The original editorial foundation established stable slugs and separate narrative content without a repository/store. The newly authorized portfolio-wide extension introduces one static repository/store while preserving all current copy, order, and rendering. Evidence, editorial metadata, and case-study reasoning still join at the application boundary rather than becoming fields on a GitHub-derived model.

The former component-local content object has been removed. `App` obtains the immutable normalized portfolio from `PortfolioStore`; section components receive domain data through props. Data is not React selection state or a runtime-fetched resource.

| Data | Representation | Rendering path |
| --- | --- | --- |
| Projects | Separate normalized metadata, compatibility narrative, visual descriptor, implementation copy, optional case study/evidence/README | Generic row/detail consumers; no project-slug switches. Current detail still renders compatibility narrative, not deeper case-study sections. |
| Experience | Typed ID/company/role/period/tech/description records | Row selection passes the same record to the existing simple detail. |
| Stack | Ordered typed label/items groups with name/usedIn records | `layoutStackTiles` flattens the groups in order into one brick-wall field; each tile shows a running number, the skill and its category, and its hover/focus “Used in” disclosure. Adding, removing, reordering or recategorizing a skill, or growing the list to any length, is a data-only change. Authoring note: tile width follows the skill name, not the “Used in” text, so keep `usedIn` to about 25 characters (two project names) for short skill names; a longer value wraps to three lines in a two-column tile at laptop widths and crowds the name. Order inside a category can also matter for seam stagger; `tests/stack-bricks.test.mjs` pins the real data. |
| Services | Typed ID/title/description records | Row selection passes the record to the existing capability detail and shared email action. |

`portfolio.person` supplies shared identity and hero copy; statement is split on newlines. Wordmark/footer use the same name, footer uses the same role, and contact/service actions share one email. About, education, availability, navigation/footer/accessibility/detail copy and technical-art labels come from the contract.

`TechnicalVisual` branches on a data descriptor’s nodes/pipeline/radar/retrieval kind and supplies its labels to the unchanged DOM/CSS geometry. These are not screenshots or live integrations. Stack remains stored but not displayed in project rows. Existing generic implementation fragments and experience prose remain explicit fixture content, not inferred engineering facts.

Projects use stable slugs; experience/services use authored record IDs; technologies/nodes use labels. Runtime document/snapshot validation checks shapes, identities, existing visual variants, URLs, and associations. The renderer has no fixed project-slug union or name-to-visual lookup.

### Editorial content ownership (implemented)

```text
portfolio.json + optional generated snapshot
                    ↓
        validation / normalization
                    ↓
      PortfolioRepository / PortfolioStore
                    ↓
        generic section/detail props
```

`PortfolioProjectMetadata` contains normalized owner-controlled list/detail metadata, not a GitHub response or engineering-evidence model. `ExistingProjectNarrative` preserves the already-displayed narrative fields separately. `PortfolioProject` is a composed UI-facing value. Readonly typing provides compile-time protection; repository construction separately validates source data and deeply freezes normalized output at runtime.

The four baseline slugs remain unchanged and independent of display titles. Slugs are open strings validated as lowercase repository names. Inline case-study `projectSlug` must match its enclosing project/repository slug; there is no separate narrative or case-study registry. Visual kind/labels are data descriptors; layout, DOM geometry, CSS, and motion parameters remain presentation-owned.

Production synchronization derives selected repositories from GraphQL pins and retrieves the configured portfolio-wide JSON. Development uses the explicit marked fixture by default; production never falls back to it. Live authentication/content verification is still pending. UI never reads provider transports/JSON directly, and narrative remains separate from evidence.

No new project/personal facts were authored: baseline content was relocated verbatim and remains marked fixture/unverified, not authenticated GitHub evidence. Missing normalized display fields use field-name placeholders, not realistic invented facts. Richer case-study rendering and external-reference loading remain separate scope. Motion ownership is unchanged; analytics extends its existing planned port/adapter boundary.

### Portfolio-wide version 2 contract

The configured GitHub portfolio repository’s root portfolio.json is the production owner-authored document. The portfolio repository is also this repository, so one root file cannot be both the production document and a fixture: the development fixture (fixture=true) lives at `fixtures/portfolio.fixture.json`, and the root file is the real document with `projects: []` because pins own project membership. Both use `schemaVersion: 2`: the root narrative registry and project-level visual/implementation siblings were removed in favor of each project’s metadata. Older v1 documents must be migrated before activation; unsupported old fields fail rather than silently losing content. Project metadata and generated snapshot envelopes remain version 1. Sync validates fetched content at a commit SHA, rejects production fixture=true, and fails on unsupported fields, wrong types, unsafe links, duplicate identities, invalid visual payloads, or mismatched case-study/project identities. Repository construction validates again.

| Fields | Meaning |
| --- | --- |
| person | Shared name, role, location, newline-delimited hero statement and summary |
| navigation / hero / sections | Labels, targets, initial active section, cursor/scroll cue, existing visual descriptor, heading indices/eyebrows/titles/notes |
| projects | Offline fixture project instances: slug, versioned owner metadata, nullable repository/live URLs. Metadata includes narrative, visual, implementation and optional caseStudyContent. GitHub mode does not read this array as an editorial registry or membership list; use an empty array in the production global document |
| projectDetail | Shared chapter/decision/section labels, generic implementation fallback and architecture explanation; no project-specific registry. Optional `caseStudyLabels` (overview, context, role, category, decisions, rationale, alternatives, chosen, implementationDetail, technicalSurface, learnings, metrics, links, undocumentedResult, questions — a five-tuple of per-chapter guiding-question micro-copy) supplies the data-driven chrome for `ProjectDetail`'s additive `caseStudyContent` rendering and for the evidence-row/technical-surface/evidence-grid chrome described below; omitted means those extra sections never render even if a project supplies `caseStudyContent` |
| experience / technologies / education / services | Typed ordered content and all current detail/disclosure copy |
| about / contact / footer / labels | Remaining text, availability, email/social links, footer and shared accessible/cursor labels |
| resume | Nullable label/href. Source schema permits HTTPS or safe root-relative PDF; production sync requires /resume.pdf and rewrites it to a revision-pinned generated asset. A conditional footer CV link exists when supplied; the current fixture remains null. |

PortfolioProjectSource.metadata reuses RepositoryPortfolioMetadata: title/summary, category/kicker, role/year/stack/highlights, ordering/featured/hidden, links, narrative, implementation, visual, optional structured caseStudyContent and optional external evidence references. Normalized metadata.description is the display name for authored summary, not a second authored value. CaseStudy remains a distinct typed concern nested under owner editorial data, never GitHub evidence. Inline content is validated, attached, and rendered: `ProjectDetail` additively presents `caseStudyContent` inside the existing five `data-story-step` chapters, each answering one guiding question (`caseStudyLabels.questions[n]`, shown as a small chapter-level prompt when present), when a project supplies it — falling back to the unchanged compact narrative/implementation when it does not. A fixed-width `header` (`.detail-intro`: kicker/title/summary/meta) introduces the project; below it, `.detail-body` is a CSS Grid pairing the existing informational chapter rail (`.case-progress`, now `position:sticky` within the grid rather than viewport-pinned) with `.detail-chapters`:
- **01 Overview** (step 0): the existing metadata/title/description, plus a two-up evidence row (category, role — reusing existing metadata fields, captioned by data-driven chrome) and `overview`/`role` prose.
- **02 Problem** (step 1): `narrative.problem` as the chapter statement, `problem` prose, then a two-column split (`context`, moved here from Overview, beside the richer `constraints` list — falling back to the compact `narrative.constraints` string when `constraints` is absent).
- **03 Architecture** (step 2): `narrative.decision` as inline framing, the existing `ArchitectureDiagram` (unchanged hover/focus/click), then any graph-shaped `CaseStudyVisual`s (`architecture-diagram`/`request-flow`/`data-flow`/`component-map`/`deployment-topology`) rendered through the new interactive `CaseStudyDiagram` component — hover/focus/click a node to invert it, mute unrelated nodes, highlight its connections, and reveal its `responsibility` text, mirroring `ArchitectureDiagram`'s existing interaction pattern — followed by any remaining visual kinds via the pre-existing static `CaseStudyVisualBlock`, then `architecture` prose. `technicalDecisions` no longer renders in this chapter (see Implementation).
- **04 Implementation** (step 3): `implementation` prose, the existing implementation code/summary, a new `TechnicalSurface` list sourced from `metadata.stack` (previously unused by `ProjectDetail`), and the full `technicalDecisions` list — moved here from Architecture so "what was engineered" and "why each technical choice was made" live together — each decision restyled with a numbered column (`CaseStudyDecision`) but still presenting the same `rationale`/`alternatives`/`implementation`/`result`/`learning` fields nested as one unit.
- **05 Result** (step 4): the existing large result statement, a new non-card `EvidenceGrid` sourced from `metadata.highlights` (previously unused by `ProjectDetail`; large leading numeral/token split from its caption when the string starts with one, e.g. `"230+ automated tests"`, otherwise rendered as plain body text), then `results` (summary/metrics/links), `learnings`, and top-level `links`.

The compact `decision-grid` (four labels: Problem/Constraint/Decision/Result) was retired by this change: each chapter now carries its own statement sourced directly from `narrative.*`/`caseStudy.*` instead of a shared grid-cell component, so no chapter duplicates another's content — the pre-existing duplication where both the Problem-era grid and the Result chapter showed the same `narrative.result` text no longer exists. `TechnicalSurface` and `EvidenceGrid` render whenever `caseStudyLabels` is present, independent of whether a project supplies `caseStudyContent` — both are driven by baseline `metadata` fields (`stack`, `highlights`) already present on every project, so these two chrome elements appear even for projects with no case-study document at all (e.g. a project with only `narrative`/`implementation`), not merely documented ones. `caseStudyLabels` supplies all new chrome (`overview`, `context`, `role`, `category`, `decisions`, `rationale`, `alternatives`, `chosen`, `implementationDetail`, `technicalSurface`, `learnings`, `metrics`, `links`, `undocumentedResult`, `questions`); external-reference loading (the separate `caseStudy: {path}` file form) remains future work.

Fetched owner JSON + self-contained pinned-project snapshot (or explicit development fixture)
→ validation → normalization → PortfolioRepository → PortfolioStore → generic component props.

The repository maps once; the store exposes deeply frozen readonly content without network access, subscriptions, or global modal state. App supports store injection. Components do not import JSON/scripts/content registries or provider transports. No separate content adapters or authored TypeScript registries remain.

Fixture mode keeps the previous local project order/slug tie-break. GitHub mode uses ONLY pinned repository records in returned connection order, including zero projects when pins are empty. Project editorial fields come only from that repository’s JSON; there is no same-slug portfolio-wide project fallback. Title/summary fall back to repository name/description. Missing visual descriptors use the shared hero descriptor, missing narratives use explicit field-name placeholders, and missing implementation uses the shared projectDetail fallback. These generic defaults are not evidence of a project’s implementation. Raw README is neither scraped nor rendered. Imported metadata.order is retained for compatibility but NEVER reorders pins. hidden filtering preserves remaining pinned order.

The generic renderer retains five existing detail chapters and four existing decorative visual variants; it is not a new page-builder or technical visualization system. Geometry and scroll/hover attributes retain baseline values for current data; existing positional cadence is reusable for additional data instances without slug-specific motion. Resume/reference support does not imply new CV/case-study/visual interactions.

### Engineering case-study ownership (implemented model boundary)

The three concerns remain distinct: **GitHub-derived metadata = engineering evidence; portfolio metadata = owner editorial control; case study = owner-authored engineering reasoning.** `CaseStudy` is not part of a GitHub response/model, and its sections must never become a collection of optional fields on that evidence model. `PortfolioProject` is a composed application value, not the import boundary's `RepositoryProject`. Imported evidence crosses the repository/store boundary in GitHub mode; actual live data remains unverified without owner access.

| Model | Contract |
| --- | --- |
| `CaseStudy` | Required `projectSlug`; optional overview, context, problem, role, constraints, architecture, technical decisions, implementation, challenges, results, learnings, visuals, and links. No project is required to supply all sections or a fixed narrative sequence. |
| `CaseStudySection` | Optional editorial title, a nonempty readonly paragraph tuple, and optional visual IDs. Paragraphs are plain text, not arbitrary HTML/React nodes. |
| `CaseStudyDecision` | Stable decision ID, title, and decision prose; optional constraints, rationale, alternatives/trade-offs, implementation, result, and learning. Supports Problem → Constraint → Decision → Implementation → Result → Learning without making every step mandatory. |
| `CaseStudyResults` | Discriminated `documented` summary with optional metrics/links, or `not-documented` with an optional explanatory note and no asserted summary/metrics/links. Omitted results mean no result information was supplied. Never infer an outcome from an absent section. |
| `CaseStudyMetric` | Numeric value, label, unit, and required source link. A typed source is not proof of factual accuracy; owner verification is still required before claiming a result. No metrics are authored by this change. |
| `CaseStudyVisual` | Discriminated structural payloads for architecture diagrams, request/data flows, component maps, deployment topology, sequence participants/messages, code excerpts, terminal commands/output, and UI evidence asset paths/alt text. Every visual has an ID and description; captions/source links are optional. No embedded markup, layout, motion, or component props. |
| `CaseStudyLink` | Typed purpose, label and HTTPS/local-path/fragment href. Runtime validation rejects unsafe schemes, credentialed URLs and traversal. Asset availability and evidence credibility still require separate verification. |

```text
Portfolio/global JSON + inline project editorial JSON
                             ↓
         validation / normalization / repository
                             ↓
                      PortfolioStore
                             ↓
              generic project components
```

`RepositoryPortfolioMetadata.caseStudyContent` contains an optional complete `CaseStudy` object. Shared validation checks its projectSlug against the enclosing fixture/repository identity before normalization. Composition attaches that object directly, or leaves caseStudy undefined; there is no slug-keyed TypeScript registry or fixture-only factory. Domain identity remains provider-independent.

The existing sparse Facility Importer fixture is preserved in that fixture project’s JSON metadata, with its prior problem, constraint and decision prose. Results are explicitly `not-documented` because no verified outcome evidence was supplied. The old unverified result text remains unchanged in the existing modal; this seed does not promote it to a verified case-study claim. No detailed Code Sentinel case study, implementation/learnings, metrics, diagrams, screenshots, or new project claims were invented.

`ExistingProjectNarrative` continues to support the stable modal as its required compatibility projection; it is not the case-study model and must not accumulate new optional narrative fields. `ProjectDetail` now additively consumes `caseStudy` from the application boundary (see `projectDetail.caseStudyLabels` below for the data-driven chrome labels this uses) without replacing the compatibility renderer/projection: the existing five `data-story-step` chapters, `IntersectionObserver`, `ArchitectureDiagram`, and modal lifecycle are unchanged, and the narrative/implementation fallback still renders unconditionally for projects without `caseStudyContent`. Case-study content does not automatically become README content, and no README parsing/generation is implemented.

`PortfolioStore` is now the implemented UI data boundary. Its single static repository composes validated inline project content and evidence, without a case-study registry. Pages/components must not independently import generated data, sync scripts, provider adapters, or raw content. Local selection, active-node, and chapter state retain their existing owners.

Runtime content validation now checks required/nonempty text, optional section shape, result status, sourced finite metrics, unique visual/decision/node IDs, graph endpoints, section-to-visual references and safe links. It does not establish evidence credibility or asset existence. Future visual/README rendering must display authored text safely and verify referenced assets; no new visual renderer or animation system is introduced here.

**Protected decisions:** keep evidence, editorial metadata, and case-study reasoning separate; preserve stable slug association and optional depth; represent unknown results honestly; keep visuals structural and provider/presentation-free; extend the existing application/intended store boundary rather than introducing another repository, store, runtime GitHub integration, or motion engine.

## Rendering Architecture

### Initial render

React builds the page and three reusable overlay instances. Each overlay is portaled into `document.body` even when closed, while selected detail children render conditionally. Effects attach observers/listeners after render; the scene engine schedules initial measurement and variable writes. Navigation starts with Work active and its scrolled state false, then updates through observation/scroll events.

### Event delegation and ownership

There is no hand-written global delegated click router. Project, experience, and capability buttons have React `onClick` handlers that set section-local selection state; React manages its synthetic-event dispatch. Architecture buttons additionally use `onMouseEnter` and `onFocus`.

Native shared delegation is used for supplementary effects:

- `Cursor` listens to document `mouseover` and finds the closest `[data-cursor]` for label/state updates; it checks fine-pointer capability at effect setup.
- The engine handles window `pointermove`/`pointerover`, identifies `.project-row` or `.magnetic-anchor .magnetic` through `closest`, and resets targets on document-element pointer leave.
- One captured passive document scroll listener schedules engine rendering for document and nested scrollers.
- `Navigation` has its own existing passive scroll listener for the header threshold and an IntersectionObserver for section activation. It does not render parallax.
- Each open `DetailOverlay` attaches an Escape listener. `ProjectDetail` uses a separate IntersectionObserver rooted in its overlay scroller for chapter state.

The separate cursor-label and navigation listeners are existing responsibilities, not competing animation loops. New work should reuse those owners instead of duplicating them.

### Detail rendering and interaction lifecycle

Projects, Experience, and Services each hold a nullable selected record. Selecting sets `open`; Close/Escape clears selection. There is no global modal manager or URL-backed detail route.

`DetailOverlay` adds `body.overlay-open`, saves the previously focused element, schedules Close focus after 350 ms, and registers Escape. Cleanup removes the body class/listener, clears the timer, and attempts previous-focus restoration with `preventScroll`. CSS supplies a fixed bar and `.overlay-scroll` with native overflow and overscroll containment.

`ProjectDetail` owns active-chapter state; five observed story sections update the informational indicator. `ArchitectureDiagram` independently owns active-node state; each `CaseStudyDiagram` instance (rendered per graph-shaped `CaseStudyVisual` in the Architecture chapter) independently owns its own active-node state the same way, so multiple diagrams on one project never share highlight state. Conditional unmounting removes these components/observers when selection clears. Selected detail content disappears immediately on close while the overlay container runs its exit transition.

Navigation uses native hash links plus CSS `scroll-behavior`, not a programmatic scrolling service. Engine, navigation, cursor, chapter, and overlay effects have cleanup paths; actual lifecycle behavior must still be checked in-browser after changes.

## Motion Architecture

| Responsibility | Current owner and mechanism |
| --- | --- |
| Document scroll progress | Engine reads `window.scrollY` and cached document range; writes root `--progress`; CSS scales the fixed bar. |
| Detail chapter progress | `ProjectDetail` observer updates React `activeStep`; `.case-progress` styles the current marker. This is separate from document progress. |
| Reveal | Engine IntersectionObserver adds `.is-visible` once at threshold `0.12`, then unobserves; CSS animates reveal opacity/offset and header staggering. The completed reveal state persists independently of scene-driven opacity: a reveal still only ever gates *when* content first becomes visible, never reversing. As of this change, structural content layers again carry their own scene-driven opacity on top of that one-time reveal (composed multiplicatively), so a revealed layer can still settle/recede with scroll position, bounded to a readable floor (≥0.2) and always resting at full opacity when centered — restoring the depth a prior "focused motion refinement" pass (2026-10-02, `c1e5452`) had removed. Rows, stack tiles and the contact content use the same once-only reveal at the row/button level; stack tiles themselves remain without scroll parallax, unchanged, since the brick wall is intentionally flat. |
| Parallax | Engine discovers scenes/layers and samples keyframes from native scroll state; CSS consumes scene variables. |
| Hover | CSS owns project title/disclosure/art scaling, experience feedback, stack disclosure, service sweep/arrows, and contact/link feedback. |
| Cursor | Engine writes positional variables; `Cursor` sets contextual labels; CSS owns shape/label transitions and pointer fallbacks. |
| Magnetic movement | Engine writes magnetic offsets for matched Close buttons, using their stable wrapper as the pointer anchor. Contact email has magnetic styling but does not match the current pointer-target selector. |
| Modal transitions | Selection controls `.open`; CSS transitions overlay translation/visibility over 800 ms. React owns body lock, focus attempts, and Escape. |

### Scene configuration and geometry

`data-scroll-scene` defines a timeline reference. Only layers whose nearest scene is that reference belong to it. `data-scroll-layer` attributes configure x/y/scale/opacity/rotate/blur keyframes and phase/strength/damping/pointer settings. Ordinary three-value keyframes describe entry/middle/exit; the parser also accepts one or two values. Blur is supported by the engine but not explicitly configured by current layer markup.

`layoutTop` sums `offsetTop` across `offsetParent` ancestors. Scene bounds use layout positions and `offsetHeight`; nested overlay positions are relative to their root. Ordinary ranges span viewport plus scene height; the hero's `data-scene-origin="visible"` selects a different centered range. Progress is clamped, phase-adjusted, and smoothstep-sampled. Visual values converge with elapsed-time-adjusted damping; browser scroll position is not smoothed or controlled.

### Scheduling and composition

One guarded requestAnimationFrame scheduler performs dirty measurement, reads scroll/pointer inputs, calculates all targets, then batches variable writes. It schedules subsequent frames only while values remain unsettled. WeakMaps preserve layer state and suppress unchanged variable writes; sets/maps track reveals, measured roots, and observed sizes.

ResizeObserver, resize/orientation events, relevant child-list MutationObserver records, font readiness/loading, and media-query changes invalidate geometry. Attribute/style changes are not independently mutation-observed. Closed-overlay scenes are skipped during rendering. Cleanup disconnects observers/listeners, cancels the frame, and guards deferred font readiness against disposal.

The render's `getBoundingClientRect()` read is for an active pointer anchor, not scroll progress. CSS composes `--scene-*`, `--pointer-*`, `--project-*`, `--mag-*`, reveal, and hover variables on their existing owners. Whole-section layout references do not derive their next position from a previously transformed layer.

## Responsive Architecture

| Condition | Current behavior |
| --- | --- |
| Default desktop CSS | Multi-column editorial layouts; fixed navigation; sticky hero/contact interiors and project rows; hover disclosures; custom cursor. |
| Width ≤800 px | Primary nav links hidden; wordmark/Contact retained; custom cursor hidden. Project tracks/rows lose desktop sticking, descriptions/CTAs remain visible, and art shrinks to a corner. Experience reflows, the stack brick wall becomes a two-column field (it is a seven-column field from 801 to 1100 px and twelve-column above), About/details stack, footer becomes vertical, and architecture becomes a vertical sequence. Stack references and chapter progress are hidden. Hero/contact use shortened sticky tracks under normal motion. |
| Engine width ≥1100 px | Full motion strength `1`. |
| Engine width ≥600 and <1100 px | Motion strength `0.66`. |
| Engine width <600 px | Motion strength `0.26`. |
| Coarse pointer | Native body/button cursor; custom cursor hidden. Pointer-depth/magnetic behavior requires a fine pointer. |
| Reduced motion | Overrides scene/reveal effects and extended sticky tracks, independently of viewport width. |

Fluid `clamp`, viewport/small-viewport units, grids, and media overrides provide sizing. There is no separate tablet navigation or hamburger menu. The 800 px layout breakpoint and 600/1100 px motion breakpoints are distinct responsibilities.

## Accessibility Architecture

- Navigation has an accessible label and native anchors. Interactive rows/controls use buttons; `:focus-visible` supplies an outline. Architecture nodes support focus/click as well as hover.
- Overlays declare `role="dialog"`, `aria-modal`, labels, and closed-state `aria-hidden`. Close has an accessible name; Escape, initial-focus scheduling, and focus restoration are implemented.
- Cursor, progress decoration, and selected geometry are marked decorative where specified; the cursor ignores pointer events.
- Both CSS and the engine read reduced-motion preferences. CSS forces near-instant transitions, neutral scene transforms/blur and visible reveals, disables smooth anchor scrolling, removes extended hero/contact tracks and project sticking, and removes hero/project overlap. Engine scene targets become neutral and pointer motion is gated off; preference changes invalidate geometry.
- Reduced motion does not disable cursor-following or every immediate non-scene hover transform. Existing behavior must not be described as a completely motion-free mode.

**Existing limitations:** no focus trap or background inert handling, no backdrop-click dismissal, desktop project disclosures are hover-specific, and narrow-screen stack references are hidden. These are not implemented accessibility features. Readable contrast and usable controls are design intentions requiring actual browser/accessibility verification, not proven conformance from source inspection.

## Layer Ownership and Dependency Direction

### Implementation status

The checkout has typed source/project/case-study contracts, one static repository/store, the shared motion engine, GraphQL pinned synchronization, and implemented AnalyticsPort/Vercel adapter. Resume retrieval and a conditional CV link are implemented; the local fixture has no resume. Live GitHub data, deployed telemetry, safe README rendering and detailed case-study/visual-reference importing are not certified or remain future work as described below.

Current data flow is structured owner content plus optional normalized import evidence and separate case studies → validation/normalization → repository → store → component props → native/React controls and component-local detail state. The layer direction below applies to the implemented GitHub and analytics boundaries.

```text
External Sources
    ↓
Build / Infrastructure
    ↓
Domain Models
    ↓
Repository
    ↓
Store
    ↓
Pages / Components
    ↓
User Interaction
```

These arrows describe data flow and responsibility, not permission for every layer to import its downstream consumer. Code dependencies should point toward stable application/domain abstractions rather than outward toward specific infrastructure providers. Mapping at an adapter boundary converts external data into application-owned models.

- UI components may depend on application/domain abstractions; they must not call GitHub APIs, import synchronization scripts, read generated JSON directly, or import infrastructure-specific analytics adapters.
- Stores may depend on repository contracts and domain models; they must not perform provider-specific fetching.
- Repository implementations may depend on data sources/adapters while exposing application-owned contracts to consumers.
- Build-time synchronization may depend on GitHub and external parsing/rendering libraries. Provider response shapes must be mapped and validated, not reused as application domain models.
- Infrastructure must not leak external provider types into UI props, store contracts, or domain models. Wiring of concrete adapters belongs at the application composition boundary, not inside presentation components.

### GitHub import boundary and consumption

```text
Configured owner → GraphQL pinnedItems → repository nodes in pinned order
Portfolio repository → portfolio.json + optional resume.pdf
Pinned repositories → metadata + optional portfolio.json + optional README
    ↓ build-time validation / normalization preflight
src/app/generated/githubPortfolio.json + public/generated resume asset
    ↓ PortfolioRepository → PortfolioStore → generic UI
```

Sync owns network access, provider mapping, validation and generation. Generated documents/records are provider-independent inputs to the existing repository, not raw API shapes. The same normalization is checked before writing and used at application composition. Components never parse JSON/import scripts or call GitHub. README stays raw evidence; sanitize before any future rendering.

### Configuration, pins, order and synchronization

- scripts/github-source.json contains owner Abinash-Anand and repository Abinash-Anand/Portfolio_2026 only. It is NOT a project list. The old selected-repositories.json was removed as part of this explicitly authorized selection change.
- Configure PORTFOLIO_GH_TOKEN securely in the build environment. It must authenticate the configured owner and have access to required repositories/GraphQL. Never prefix this secret with VITE_, commit it, print it, or persist it in generated data. Platform tokens are not used as a fallback.
- GraphQL reads viewer.login and user(login: $owner).pinnedItems(first: 6).nodes with __typename and Repository fields. Both identities must match the configured owner. Ignore non-repository nodes. Null/inaccessible items, malformed responses and GraphQL errors are fatal. Exclude the portfolio repository itself even if pinned.
- Preserve connection order exactly. Pinning/unpinning/reordering changes the next successful snapshot. hidden=true filters only display membership; featured does not select/reorder. Legacy editorial order is ignored for GitHub ordering. No second ordering system or all-account repository discovery exists.
- Individual project URLs are never a configuration prerequisite. A successful synchronization reports each discovered repository in pinned order, its revision, and whether project portfolio.json was present and validated or absent with the explicit evidence fallback. Authentication is supplied only through the secure build environment, never chat.
- Slug is the lowercase repository name. Duplicate/case-insensitive slugs, including collisions across different owners, fail clearly. Pins may reference other owners’ repositories. No new ID/slug-override system is introduced.
- Resolve each default branch to a SHA; read its JSON/README at that SHA. The portfolio document and resume share the portfolio SHA. These are per-repository revisions, not one atomic GitHub-wide revision. Repository evidence is fetch-time metadata.
- The required portfolio document uses the portfolio-wide version-2 schema and must have fixture=false. Project JSON uses the shared strict dependency-free metadata validator. Structured content is limited to 1 MB, UTF-8 decoded and checked against declared size. No README prose parsing or automatic case-study generation.
- Non-null resume must reference /resume.pdf in the source document. Download at the portfolio SHA, limit to 20 MB and validate PDF signature. Write public/generated/resume-<revision>.pdf; normalized href is /generated/resume-<revision>.pdf. The generic conditional footer link applies the existing deployment base. Null means no CV, not a fabricated asset.
- Atomically generate ignored src/app/generated/githubPortfolio.json after all validation/normalization succeeds. Shape: schemaVersion:1, source:{mode:'github',owner,repository,revision,pinnedRepositories}, document:PortfolioDocument, projects:RepositoryProject[]. Source pins must match projects in order. No token/provider response objects are output. Write a required asset before its referencing snapshot; remove obsolete sync-owned revision-named PDFs after success so old resumes are not bundled indefinitely. This generated namespace is not owner-authored content.
- pnpm sync:github and the pre-Vite build step share scripts/sync-github.ts. Native Node 22 fetch/filesystem/type stripping and existing validators are reused. No GitHub SDK, new validator dependency, CMS, router, second repository or second store.

### Development and failure behavior

- pnpm dev deliberately defaults to `fixtures/portfolio.fixture.json` (fixture=true) to preserve the offline preview. VITE_PORTFOLIO_DATA_MODE=github instead uses an already synchronized snapshot. A missing/malformed snapshot in GitHub mode fails rather than reverting to fixtures. The local fixture is not eagerly imported into production composition.
- Production sync defaults to PORTFOLIO_DATA_MODE=github. The build script passes --production and rejects fixture mode; production application composition also rejects a fixture snapshot. Missing credentials/data/API access are fatal. PORTFOLIO_DATA_MODE=fixture is an explicit LOCAL/TEST-only synchronization override: validate the marked local fixture, emit a marked fixture snapshot and warn. It cannot be used for a production build. No automatic stale-data or fixture fallback.
- Missing portfolio-wide JSON, unavailable repository/default branch, API/auth/rate-limit/network/GraphQL failures, malformed JSON, wrong types/versions, unsafe links/paths, identity mismatch and invalid referenced resume are fatal with source/field diagnostics. Do not dump response bodies, tokens or raw GraphQL error payloads.
- Only optional project JSON/README HTTP 404 is non-fatal: warn and use null. Invalid existing optional JSON is still fatal. Name/description may supply title/summary; unavailable editorial facts stay absent or explicit field-name placeholders. README is not a metadata fallback.
- Production additionally rejects a document marked fixture=false whose contact email, social links or Calendly URL use a reserved placeholder host (example.com/org/net, `.invalid`, `.test`, `.example`, `.localhost`), so flipping the flag cannot publish placeholder identity. `.env.example` documents PORTFOLIO_GH_TOKEN (empty value); `.gitignore` keeps it tracked despite the `.env*` rule. The variable name is deliberately absent from client code: the only client-side message that mentioned it now points at `.env.example`, and a test scans `src/`, `index.html` and any built `dist/` for the name, GitHub API hosts and token-shaped strings.
- Sync output reports the owner login, pinned items returned, repositories after filtering, the pinned order, and per repository: portfolio.json present/missing, which optional metadata fields are absent, hidden state and revision.
- Verification status: the owner’s real pins were read read-only through an authenticated `gh` CLI (3 items, repositories SynthGraph, ParkRabbit, Eber-app, in that order), and the real sync/validation code was rehearsed against that live data with the portfolio.json files served locally before publishing. That rehearsal is not the production path. The real authenticated `pnpm sync:github` / `pnpm build` run with PORTFOLIO_GH_TOKEN and the Vercel production build environment are verified only to the extent recorded in `CHANGELOG.md`. Synthetic tests must never be reported as discovered owner pins.

### `portfolio.json` version 1 contract

`src/app/domain/repositoryProject.ts` defines the selected-project contract. Its existing runtime validator now lives in `src/app/application/repositoryContract.ts`, shared through the scripts re-export so application code never imports scripts. Evidence, editorial metadata and case-study reasoning remain distinct. The owner-controlled metadata contract now explicitly accepts nested narrative, implementation and caseStudyContent; unknown fields and prose incorrectly added to GitHub evidence remain errors.

| Field | Type / rule |
| --- | --- |
| `schemaVersion` | Required literal `1` |
| `title`, `summary`, `category`, `kicker`, `role`, `year` | Optional non-empty strings; `year` is authored text, not inferred from repository timestamps |
| `stack`, `highlights` | Optional arrays of non-empty strings; empty arrays are valid |
| `order` | Optional non-negative safe integer; compatibility only, ignored for GitHub pin ordering |
| `featured`, `hidden` | Optional booleans; omission means not featured/not hidden |
| `links` | Optional array of `{ kind, label, href }`; kind is repository/demo/documentation/evidence/other, label non-empty, href absolute HTTPS without credentials |
| `caseStudy` | Optional `{ path, title?, summary? }`; path references a repository-relative `.json` file, strings non-empty |
| `technicalVisuals` | Optional array of `{ id, kind, path, description }`; IDs unique within the project, strings non-empty, path repository-relative |
| `visual` | Optional existing art descriptor: nodes/radar with label, pipeline with 3 labels, retrieval with 4 labels. Not the future engineering-evidence visualization system. |
| `narrative` | Optional existing modal projection: problem, constraints, decision, result nonempty text; architecture string array. Supply the whole projection when present |
| `implementation` | Optional `{ lines: string[], summary: string }` for the current detail renderer |
| `caseStudyContent` | Optional structured CaseStudy with matching projectSlug, optional-depth sections, decisions, result status, structural visuals and links; cannot coexist with caseStudy file reference |

Visual kinds are architecture-diagram, request-flow, data-flow, component-map, sequence-flow, deployment-topology, code-excerpt, terminal-excerpt, and ui-evidence, aligned with the existing case-study model. Safe paths disallow absolute paths, traversal, empty segments, backslashes, URLs, percent escapes, queries/fragments, and whitespace. Validation errors include the repository/file/revision and JSON field path. Files must be GitHub base64 file responses no larger than 1 MB. Invalid metadata never silently becomes missing metadata.

All editorial fields except the version are optional so unavailable role, stack, results, or links remain absent rather than invented. `examples/code-sentinel/portfolio.json` is the first sparse contract example, containing only version and the supplied title. It is a local schema example, not a selected repository or verified engineering case study; production validates fetched metadata instead. The actual Code Sentinel repository, contribution evidence, and approved metadata remain unavailable. The same schema applies to Facility Importer, Northstar, VC Brain, and future repositories without project-specific parsing.

### Structured engineering case-study content

For the current self-contained repository contract, owner-authored detailed reasoning belongs in `portfolio.json.caseStudyContent`, using the existing distinct CaseStudy domain type. This explicitly supersedes the earlier separate-file recommendation for the active import path. GitHub-derived evidence remains separate; no overview/problem/decision/result fields were added to its evidence shape. `narrative` is the modal's required compact projection; `caseStudyContent` carries richer reasoning that `ProjectDetail` additively renders when present. Both are authored project data, not UI logic or inferred README content.

The older `caseStudy: {path, title?, summary?}` reference remains accepted for externally authored metadata, but reference-file retrieval is still unimplemented. Reference and inline content are mutually exclusive to prevent two competing sources. For usable content today, supply inline caseStudyContent and, where needed by the unchanged modal, narrative/implementation. Technical visual references similarly validate shape/path only; no diagrams, asset fetching or README renderer are built by this cleanup.

In development, the root fixture’s projects[].metadata holds those same project contracts. In production, each pinned repository’s portfolio.json owns them and passes through the existing sync/validation/snapshot/repository/store flow; the frontend maintains no project registry. Missing optional case-study content remains absent, never auto-generated. No claims/metrics were invented, and the old fixture modal’s displayed copy remains unchanged.

### Missing-file fallback and normalized frontend boundary

- Missing `portfolio.json` (HTTP 404): warn, preserve mapped repository evidence, set `editorial: null`. No synthetic role/stack/highlights, fabricated case study, or copying local placeholder metadata into imported evidence. Normalization uses `evidence.name` as title, `evidence.description` as summary when present, and `evidence.url` as repository link; README is not a metadata fallback.
- Present but sparse import metadata: absent editorial fields remain absent in the evidence snapshot. Composition uses only that repository’s editorial metadata, evidence title/summary and explicit field-name display placeholders; it never consults a same-slug root fixture. It does not manufacture editorial facts inside repository evidence.
- Missing README (HTTP 404): warn and set `readme: null`; a repository without documentation remains honestly undocumented. Auth/access/rate-limit/transport/JSON/validation failures are errors, not absences.
- `RepositoryProject` groups stable `slug`, whitelisted provider-independent `evidence`, nullable owner `editorial`, and nullable raw README evidence. External GitHub response objects are not domain models. Detailed `CaseStudy` stays separate and joins by slug at application composition.
- src/app/application/portfolioProjects.ts selects the documented fixture or generated GitHub source through the same repository/store. Synthetic verification is not live authenticated synchronization.

### Analytics boundary (implemented, production opt-in)

```text
Pages / Components → AnalyticsPort → Vercel adapter → Analytics / Speed Insights
```

src/app/application/AnalyticsPort.ts owns the discriminated event union and runtime payload allowlist. src/app/infrastructure/vercelAnalytics.ts is the ONLY vendor import/call owner; bootstrap supplies the port to generic components. @vercel/analytics and @vercel/speed-insights are the only new dependencies.

VITE_PORTFOLIO_ANALYTICS=vercel opts in only on a production deployment with both Vercel services enabled. Development/unconfigured production are no-op. SDKs load on the first permitted event, with a bounded memory-only queue preserving initial events during module loading. Scroll depth reuses navigation’s existing scroll listener and a resize-refreshed cached range; no extra scroll listener, motion loop or rAF scheduler was added.

Events: project_open {project_index:0..5}, cv_download {}, contact_click {kind:email|social|navigation|calendly}, scroll_depth {percent:25|50|75|100}, app_error {kind:error|unhandledrejection}. Extra fields are stripped; unknown/invalid values dropped. No names, emails, phone numbers, raw authored URLs, stacks/error messages, source code, secrets, arbitrary text or explicit IP payloads. CV emits only from a data-provided footer link; fixture has none.

### Public booking contact action (implemented)

The portfolio-wide root `portfolio.json` owns optional `contact.calendly` (an absolute HTTPS URL without credentials) and `contact.booking` (`label`, `detail`, `accessibleLabel`). The shared portfolio-wide v2 validator requires both fields together or neither; existing documents without booking remain valid and retain the full-width email action. Normalization passes this contact content through the existing repository/PortfolioStore unchanged. Booking copy and URL are not hardcoded in presentation; the configured public event is `https://calendly.com/abinashanandab/15min`. The local document remains explicitly fixture-marked for other content; adding this verified URL does not certify the placeholder identity or update the remote repository by itself.

Contact renders equal-width editorial email/booking actions above the unchanged social links, stacked at the existing ≤800 px breakpoint. Both reuse the existing scene keyframes and transform composition; no scheduler, embed, API or Calendly dependency is introduced. Booking is a native link with `target="_blank"`, `rel="noopener noreferrer"`, decorative arrow and data-authored accessible text identifying the 15-minute meeting/new tab. Navbar Contact continues native navigation to `#contact`, not a panel/modal, and therefore reaches the same normalized contact data. Social links remain `contact.socials`; the CV remains the existing top-level `resume` rather than duplicated contact data.

Booking uses the existing analytics port's `contact_click` with `kind: "calendly"`; the provider allowlist receives only that identifier, not the booking URL or personal information. Existing opt-in and DNT/GPC gates remain unchanged.

Respect DNT/GPC before initialization, at every track call and at beforeSend. Middleware keeps only type and canonical origin / URL (Speed Insights route /); no path/query/hash data. Application code creates no cookie/storage identity, fingerprint, cross-site profile or personal analytics payload. SDK/transport failure never blocks interaction. Bootstrap listeners and pending events are disposed on HMR. See PRIVACY.md for transport/provider limits: deployed provider behavior/delivery is not certified by local mocks.

## Source-of-Truth Matrix

“Planned” entries describe intended boundaries only. `src/app/content/profile.ts` is an explicitly proposed location from the request; it does not exist in this checkout. No other missing content, adapter, or generated-data filenames are implied.

| Information | Current source of truth | Status / boundary |
| --- | --- | --- |
| Owner name / role | Root portfolio.json person | Shared by hero/wordmark/footer; no duplicated identity literals |
| Tagline / hero / About | Root person, hero, about, sections | Plain text through validated store |
| Email / availability / social links | Root contact | Shared by contact and capability email actions |
| GitHub owner / portfolio source | scripts/github-source.json | Build-only owner/repository configuration, not a project list |
| Project selection / repository evidence / README | GitHub profile pins / pinned repositories | GraphQL repository nodes, source order, mapped optional raw README |
| Project editorial metadata | Pinned repository portfolio.json; root projects[].metadata only in fixture mode | Authoritative self-contained owner data; no root registry fallback or README scraping |
| Current modal narrative / implementation | Project metadata.narrative / metadata.implementation | Validated owner-authored projection; explicit generic fallbacks when absent |
| Engineering case studies | Project portfolio.json caseStudyContent; fixture projects[].metadata.caseStudyContent | Validated inline CaseStudy, no TypeScript content registry, additively rendered by `ProjectDetail` when present (chrome labels from `projectDetail.caseStudyLabels`); the external `caseStudy: {path}` file-reference loader remains future work |
| Project ordering / visibility | GitHub pinned order / effective hidden | Imported ordering never overridden by editorial order; fixture keeps legacy sorting |
| Experience / education / stack / capabilities | Root experience, education, technologies, services | Typed ordered data through store |
| Navigation / detail / accessibility labels | Root navigation, sections, projectDetail, labels | Generic renderers, existing DOM/lifecycle preserved |
| Resume | Portfolio repository resume.pdf + document.resume | SHA-pinned asset and conditional generic CV link; fixture remains null |
| Visual design / motion | Existing CSS/JSX/engine and governance contracts | Data supplies labels/kinds, not animation/layout rules |
| Analytics events / provider | AnalyticsPort.ts / infrastructure/vercelAnalytics.ts | Implemented typed events, production opt-in, privacy controls |
| Architecture rules | ARCHITECTURE.md and governance documents | Current contracts; future features explicitly distinguished |

Root JSON is now the centralized owner-content boundary; previously proposed profile.ts is not implemented and must not become a duplicate source of truth.

## Ownership Boundaries

Logical responsibilities do not require immediate extraction into separate modules. Preserve the current colocated implementation until a specific, approved change requires otherwise.

| System | Status / current location | Owns | Must not own |
| --- | --- | --- | --- |
| GitHub sync | Existing sync script, GraphQL pins, shared validators | Build-only fetching, mapping, validation and generation | UI state/rendering/motion |
| Generated data | Ignored githubPortfolio.json / public/generated assets | Build-time application data snapshots | Business logic, presentation, event handling; it is derived output, not an independently edited source of truth |
| Domain models | Portfolio source/normalized types, existing project/case-study types, import evidence/editorial contracts | Provider-independent contracts | Provider API shapes, narrative embedded in evidence, analytics SDK types |
| Project application composition | `src/app/application/portfolioProjects.ts` | Wire validated global document and self-contained project snapshot into the single store | Fetching, UI behavior, parallel stores/repositories |
| Repository | `src/app/application/portfolioRepository.ts` | Validate/map sources to one application-facing immutable portfolio | Presentation, interaction state, provider transports/types in UI contracts |
| Store | `src/app/application/PortfolioStore.ts` | Readonly UI data boundary from the repository | Provider fetching, DOM/motion, subscriptions or duplicate authoritative content |
| Components | Current `src/App.tsx` | Presentation, semantic controls, local interaction/detail lifecycle | GitHub API knowledge, synchronization scripts, direct generated JSON access, provider-specific analytics calls |
| AnalyticsPort | Application-owned AnalyticsPort.ts | Typed analytics contract and application event vocabulary | Provider implementation or UI behavior |
| Analytics adapter | Infrastructure-owned vercelAnalytics.ts | Provider integration and event mapping | UI behavior, application content, a second analytics contract |
| Content files | Global portfolio.json and pinned project portfolio.json; root projects only for explicit fixtures | Owner-authored global/project content, including narrative and case-study reasoning, distinct from provider evidence | Authored TypeScript registries, external API fetching, UI/motion control, generated README narrative, duplicated identity/resume |
| README boundary | Planned | Safe conversion/validation of external README content and presentation of the resulting application data | Raw provider types in components or unvalidated executable HTML |
| Motion system | Current `src/useParallaxEngine.ts` plus established CSS/component responsibilities | Scene/pointer scheduling, geometry, reveals, transform composition and motion lifecycle | Business/content data, repository access, analytics provider integration |

## Testing Architecture

### Existing verification

`tests/github-activation.test.mjs` adds real-workflow coverage on top of that suite: pin limits/counts/ordering, hidden semantics, fixture and placeholder rejection in production, missing-data failures, a production-validity check of the checked-in root `portfolio.json` (including no phone-number-like text), and token handling (Authorization header only; absent from generated data, logs, errors, client sources and a built `dist/`; zero network requests on render). The approved cleanup adds tests/content-architecture.test.mjs and pnpm test. It exercises JSON contracts, repository/store composition, synthetic pinned discovery/sync, fixture rejection, source auditing and structurally different data through the actual generic App. The static React-rendering harness stubs the motion hook and portal output; it does not certify interactive overlays or motion. No maintained browser end-to-end suite exists. TypeScript checking and the Vite production build are additional validation capabilities, not interaction tests. `REGRESSION_CHECKLIST.md` is the current manual verification contract; `CHANGELOG.md` records actual prior checks, including ad hoc browser simulations. Those historical checks are not a maintained automated suite and do not establish physical-input or cross-browser coverage.

`.github/workflows/ci.yml` runs on pushes to main and on pull requests, on Node 22 and 24 with pnpm from the lockfile: both type checks below, an offline build, `pnpm test`, and a production-dependency audit. It never uses `PORTFOLIO_GH_TOKEN` or calls GitHub: the production build (`pnpm build`, which runs the authenticated sync) belongs to Vercel, so CI synchronizes the development fixture with `PORTFOLIO_DATA_MODE=fixture` and builds that output only so the tests can scan the built bundle. A green CI run does not certify the real-data build or any browser behavior.

For the implemented import boundary, run `pnpm exec tsc --noEmit` for the application and `pnpm exec tsc --noEmit --strict --skipLibCheck --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions scripts/sync-github.ts scripts/portfolio-contract.ts` for build infrastructure. Production build includes authenticated pinned discovery and remote document/snapshot validation. Temporary assertions exercise the injected fetch boundary and analytics port without authenticating synthetic project facts. Live synchronization and deployed provider delivery are additional required checks, not replaced by those assertions.

### Unit Tests

The following remains required coverage when the corresponding boundary changes. The new offline suite covers project content shape/associations, sourced metrics and references, fixture rejection, repository/store mapping, pin filtering/order/membership, alternate-content static rendering and source ownership. Complete analytics-provider lifecycle tests and browser end-to-end automation remain future coverage.

- GitHub response mapping: convert provider fields into domain records without leaking provider types.
- Validation: invalid/missing editorial metadata, README inputs, and unexpected response shapes.
- Fallback behavior: pinned ordering, missing metadata/README, hidden state, an empty pinned set, and synchronization failure policy defined above; future consumer fallbacks must preserve that contract.
- Repository behavior: access, record selection, and errors defined by its eventual contract.
- Store behavior: derived access and application state without provider-specific fetching.
- Analytics event typing: compile-time assertions for valid event names/payloads and rejection of invalid combinations once event types exist.
- Analytics adapter mapping: provider calls match the port contract without component knowledge of the SDK.
- Content/data validation: required fields, ordering/visibility rules, and identity/resume consistency once those schemas exist.

### Integration Tests

Future coverage must verify generated data → repository, repository → store, project metadata → project rendering, project detail data loading, and analytics port → adapter boundaries. The maintained offline suite now covers repository → store → generic initial rendering and synthetic sync → snapshot → repository, including inline case-study association. Current detail rendering uses an already-selected local record, not asynchronous detail loading. Test both supported success and defined failure paths once implemented; do not claim loading/fallback functionality before it exists.

### End-to-End Tests

These are current manual regression flows and candidates for a future automated suite:

- Native navigation, hero scroll cue, and return-to-top behavior.
- Project activation/opening, correct project detail, architecture/chapter interaction, Close/Escape, focus restoration, and body/nested scrolling.
- Experience and services interaction and detail content.
- Stack hover/focus disclosures and contextual desktop cursor behavior.
- Contact navigation and email/social links; there is no contact modal to test.
- Responsive navigation/layout/touch and reduced-motion behavior, including runtime preference changes.
- Scroll progress, reveals, composed hover/scroll/pointer motion, repeated boundaries, and direction reversal; record simulated and physical input separately.
- Conditional CV activation and cv_download event when resume data is present. The fixture has no CV; mocked PDF retrieval is not evidence of a real resume.

After relevant implementation changes, use `pnpm exec tsc --noEmit` and the applicable build validation, then the existing browser/manual checklist. Automated coverage cannot replace visual motion review or certify physical trackpad/mouse-wheel stability. Record passed, failed, not-applicable, and unperformed checks honestly.

## Extension Rules

The following are requirements for future work, not claims that additional infrastructure already exists:

1. Reuse existing architecture and identify the owning component/utility before editing.
2. Extend existing data models where appropriate; keep selection and rendering consumers coherent.
3. Avoid duplicated rendering systems, parallel datasets, or a second detail-overlay implementation.
4. Avoid duplicated animation systems; extend scene metadata and established CSS-variable ownership.
5. Avoid duplicated event listeners; reuse current handlers/delegation and preserve lifecycle cleanup.
6. Preserve existing contracts, responsive fallbacks, native scrolling, and reduced-motion behavior; follow the change protocol and regression checklist.

Potential future improvements, such as more explicit tuple/record typing, unified identity content, or accessible-dialog enhancements, are not current architecture and are not authorized by this document. Any such work must be separately requested or justified through the protected-change process. A recommendation is not permission for a rewrite.

### Feature Extension Rules

Before implementing a feature, classify each responsibility:

1. Is this content? Use the current owner-authored data/JSX boundary, or an approved content module when one exists.
2. Is this domain/data? Extend the existing application model; keep external response types outside it.
3. Is this application state? Extend the current state owner; use `PortfolioStore` only after it actually exists.
4. Is this presentation? Reuse section/detail rendering and the established stylesheet.
5. Is this interaction? Extend the owning component/handler and its lifecycle cleanup.
6. Is this infrastructure? Keep source/provider integration in its approved adapter/build boundary, not components.
7. Is this analytics? Use `AnalyticsPort` when implemented; do not introduce provider calls inside UI.
8. Is this motion? Extend the existing scene engine, metadata, and CSS-variable ownership.

New functionality should extend an existing architectural boundary whenever one already exists.

Do not create a second repository, second store, second analytics system, second GitHub integration, or second motion engine for a feature that belongs to an existing boundary.

Where a requested boundary is absent, do not create it incidentally during an unrelated feature. Propose the smallest justified addition through the architecture change protocol, including the migration from current ownership. A feature may span layers, but each responsibility must have one clear owner.

## Anti-Patterns

- Rewriting the entire application file for a small feature instead of making a focused change.
- Creating duplicate motion engines or component-specific parallax schedulers.
- Adding separate scroll listeners for individual components when the shared engine or existing observer can provide the behavior; the existing navigation listener is not a blanket precedent.
- Manipulating transforms from unrelated systems or measuring transformed layers to drive their own motion.
- Mixing feature work with unrelated refactoring, cleanup, renaming, or formatting sweeps.
- Hardcoding content in presentation or adding independently authored duplicates instead of extending the typed source/store boundary.
- Introducing framework-level complexity, routing, global state, or dependencies without a concrete requirement.
- Treating these documentation descriptions as permission to fix known limitations, redesign the portfolio, or replace stable systems.

Additional prohibited or discouraged patterns, including safeguards for the implemented integration boundaries:

- Components directly calling GitHub, reading generated JSON, or importing synchronization scripts.
- Provider-specific analytics calls from components or duplicate analytics implementations.
- Duplicate repository abstractions or state stores for the same domain.
- Hardcoded project data inside new templates rather than the existing project data owner.
- Copying profile information across multiple files or duplicating resume content; root owner JSON is the shared source.
- Introducing a new motion engine for a local animation.
- Changing architecture because a different pattern is fashionable, or replacing stable infrastructure without a documented reason and appropriate approval.

## Architecture Change Protocol

An ordinary feature request is not permission to rewrite architecture. Before proposing an architectural change, briefly identify:

- Current architecture and the concrete problem with it.
- Proposed change and why extending the existing boundary is insufficient.
- Affected layers and contracts, including what remains untouched.
- Migration requirements for data, consumers, lifecycle ownership, and compatibility.
- Regression risks and required unit/integration/manual or end-to-end verification.

Architecture changes require explicit user approval unless required to correct a documented defect and they do not alter externally observable behavior. That narrow exception still requires a stated rationale, risks, and verification plan; it does not authorize replacement of a protected system without the authorization required by `AGENTS.md` and `CHANGE_PROTOCOL.md`. Preserve stability, avoid unrelated refactoring, and document actual implementation/testing afterward. This section does not authorize implementing any planned boundary listed above.

## Relationship With Other Documentation

```text
AGENTS.md                 → governs how agents work
ARCHITECTURE.md           → defines how the system is structured
STABILITY_CONTRACT.md     → defines what stable behavior must be preserved
CHANGE_PROTOCOL.md        → defines how changes are introduced
REGRESSION_CHECKLIST.md   → defines how changes are verified
CHANGELOG.md              → records what changed
```

`ARCHITECTURE.md` is the architectural source of truth, distinguishing implemented ownership from planned contracts. It does not supersede agent instructions, authorize behavior changes, or convert a proposed system into an existing one.

- `AGENTS.md` establishes mandatory reading, protected systems, scope, and completion rules.
- `STABLE_BASELINE.md` is the historical record of accepted structure/behavior and known limitations; do not rewrite it to imply future features existed.
- `STABILITY_CONTRACT.md` protects visual, interaction, motion, responsive, accessibility, and performance behavior.
- `CHANGE_PROTOCOL.md` governs inspection, impact analysis, implementation, authorization, review, and documentation.
- `MOTION_SYSTEM.md` is the detailed motion/transform reference; this document records its architectural ownership, not a competing motion specification.
- `REGRESSION_CHECKLIST.md` supplies practical verification requirements; testing strategy here does not replace it.
- `FEATURE_REQUEST_TEMPLATE.md` scopes future requests, protected systems, and measurable completion criteria; it is not evidence that a feature exists.
- `CHANGELOG.md` records dated changes and actual verification, including gaps. Meaningful future feature/architecture work must update it; meaningful implementation work appends records without rewriting history.

If documents and inspected code disagree, report the discrepancy and distinguish historical behavior, current implementation, and proposed direction before changing protected systems. Never silently choose a more convenient architecture or claim missing functionality is implemented.
