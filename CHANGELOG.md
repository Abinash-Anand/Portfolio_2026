# Changelog

## Stable Baseline

- Date: 2026-10-01
- Status: Stable
- Description: Current known-good portfolio implementation established as the baseline.
- Notes: Existing interactions, motion, responsive behavior and accessibility behavior are protected.
- Reference: `STABLE_BASELINE.md` records the inspected implementation, baseline commit, and known limitations. This entry establishes the engineering record; it does not claim new browser validation or implementation changes.

## [Date] — [Change Name]

This is a reusable entry template, not a completed change. Copy it for each meaningful change, replace the placeholders, and append the completed entry after the preceding historical entry in chronological order. Use ISO dates (`YYYY-MM-DD`); keep same-day entries in execution order. Use “None” for categories with no applicable changes.

### Added

- [New functionality, content, or infrastructure; identify affected systems.]

### Changed

- [Intentional behavior or architectural changes, their reasons, and any explicit protected-system approval.]

### Fixed

- [Defect or regression, observed impact, root cause, and correction.]

### Preserved

- [Existing interactions, motion, layouts, accessibility behavior, and system contracts kept intact.]

### Regression Testing

- [Relevant `REGRESSION_CHECKLIST.md` checks, environments/input methods, commands, and actual results. Distinguish physical-device tests from simulation; disclose failures and unperformed verification.]

### Notes

- [Dependencies, technical trade-offs, known limitations, unresolved regressions, and related documentation or commit references.]

## Recording Rules

- Record meaningful feature changes.
- Record changes to motion systems, architecture, and protected systems, including authorized replacements and their regression risks.
- Record regressions and their fixes. If a regression remains unresolved, state that explicitly; do not present incomplete work as verified completion.
- Do not fill the changelog with trivial typo fixes unless they matter technically.
- Record what actually changed and what was actually tested; do not invent history, approvals, metrics, or successful validation.
- Keep completed entries chronological and preserve their original context. Do not rewrite historical entries to make the project look cleaner; append a dated correction or follow-up when necessary.
- Follow `CHANGE_PROTOCOL.md` and update relevant technical documentation for significant architecture or motion changes. The reusable template may be copied/adapted; it is not a historical event.

## 2026-10-01 — Documentation Consistency Audit

### Added

- Explicit About/education and contact/footer regression checks, including the local interest-strip scroll, actual email/social destinations, and keyboard/touch activation. No new files were created.

### Changed

- Clarified supporting-document roles in `AGENTS.md` and distinguished completed reveal state from independent scene-driven opacity in the baseline, contract, architecture, motion reference, and checklist.
- Clarified that 2026-10-01 is the engineering baseline record date; the original acceptance/restoration date remains unconfirmed if different.

### Fixed

- Corrected documentation that implied hero-art opacity followed its configured scene keyframes; documented the normal-motion CSS opacity overrides for hero grid/art, contact grid, and project backdrop.
- Removed ambiguity in the baseline's overlapping motion-strength ranges and expanded missing link/section coverage. No website defect or implementation was changed.

### Preserved

- All website source, assets, dependencies, configuration, existing interactions, and motion behavior. The original Stable Baseline changelog entry and recorded baseline commit remain unchanged.
- Baseline metadata confirmed from source: package version `1.0.0`; implementation reference `170a6f8e01eec690b91134dec37c8ee1374e8e43`. This is an append-only clarification, not a new release/tag or assertion of additional browser validation.

### Regression Testing

- Reviewed all nine documentation files against each other and the relevant implementation; checked required references and documentation-only scope.
- Compared tracked website source/configuration with the recorded baseline commit: no differences. Checked documentation whitespace and diffs.
- No browser, physical-input, build, or runtime regression tests were performed for this documentation-only audit; existing unverified behavior remains unverified.

### Notes

- Corrected `AGENTS.md`, `STABLE_BASELINE.md`, `STABILITY_CONTRACT.md`, `ARCHITECTURE.md`, `MOTION_SYSTEM.md`, and `REGRESSION_CHECKLIST.md`; appended this entry to `CHANGELOG.md`. `CHANGE_PROTOCOL.md` and `FEATURE_REQUEST_TEMPLATE.md` were reviewed and required no corrections.
- Absence of backdrop dismissal, a separate hero orbit, image assets, email magnetic tracking, complete dialog focus containment, and reduced-motion desktop-cursor disabling remains accurately identified rather than treated as implemented functionality.

## 2026-10-01 — Self-hosted Inter and Portfolio Favicons

### Added

- The exact Inter WOFF2 files served by the previous Google Fonts stylesheet, retaining its seven Unicode subsets and existing 400/500/600 weights, with the SIL Open Font License in `public/fonts/`.
- A minimal monochrome node-circle favicon based on the existing hero geometry: `public/favicon.svg` and a matching `public/favicon.ico` containing 16/32/48 px PNG images. Explicit HTML icon links respect Vite's deployment base.

### Changed

- Replaced only the external Google Fonts import with local `@font-face` declarations. Font family, intended weights, display strategy, and all CSS from `:root` onward are unchanged.
- Updated the architecture reference and relevant regression checks to describe local font loading and favicon verification. The historical baseline entry remains unchanged.

### Fixed

- Removed the runtime dependency that exposed Inter loading to `ERR_CERT_AUTHORITY_INVALID` in the verification browser. The original Google Fonts URL was valid; its certificate was issued through the environment's Cloudflare TLS interception CA, which Chromium did not trust. No certificate-validation bypass or substitute font was introduced.
- Fixed `/favicon.ico` returning HTTP 404. Both icon formats now return HTTP 200 with the appropriate content types.

### Preserved

- Application rendering, content, navigation, project/experience/service interactions, overlays, cursor, scroll progress, reveals, parallax engine, responsive rules, and reduced-motion behavior. Contact remains navigation/email behavior; no contact modal was added.
- Dependencies, configuration, deployment scripts, and application/motion TypeScript are unchanged. The only website source changes are the CSS font declarations and HTML favicon links.

### Regression Testing

- `pnpm exec tsc --noEmit` passed. `figma make verify-deploy` passed the production build and deployment-output validation; no production publish was performed.
- Verified font/license/icon production copies against their source bytes, ICO directory entries and PNG signatures, correct deployment-base URLs, absence of Google Fonts URLs in production CSS, and HTTP 200 responses for local assets. `git diff --check` passed.
- In Chromium without certificate bypasses and with Google Fonts hosts blocked, confirmed actual custom Inter rendering at weights 400/500/600, not merely a declared font-family. No external Google Fonts requests were needed. Visually inspected desktop and mobile typography.
- Checked navigation, all four project hover/detail interactions, architecture-node and chapter interactions, all three experience details, stack hover/focus, all five service details, contact destinations, custom-cursor states, Close/Escape, initial close-button focus, body scroll locking, and mobile touch opening.
- Checked 1920/1440/1280/1024/768/390 px layouts without horizontal overflow, documented navigation/sticky/cursor fallbacks, and reduced-motion neutral layers and usable overlays.
- Simulated slow/fast continuous scrolling, stepped/rapid wheel input, and alternating direction in the browser; motion values remained finite and progress remained in range. A full scroll sweep revealed all 19 page reveal elements and reached progress 1 at the bottom. These checks do not certify physical-input jitter or measure frame-rate performance.
- Final isolated browser run reported no console errors or JavaScript exceptions. Loaded the built production bundle through a static-file browser fixture: app mounted, four projects rendered, local Inter loaded, both icon paths were requested, and no runtime errors were reported. This was not a live published-site test.

### Notes

- Physical trackpad/mouse-wheel testing remains unperformed, as does cross-browser/device hardware validation. Verification is limited to the tested Chromium coverage; existing documented accessibility limitations are not remediated by this change.
- An intermediate simulated-input run was interrupted after a background-tab CDP wheel acknowledgment stalled. Repeating the scroll checks in an isolated foreground browser succeeded. A direct live-scroll-height assertion was replaced with checks appropriate to the documented cached scroll range; the engine was not modified.

## 2026-10-01 — Typed Project Editorial Content Foundation

### Added

- Provider-independent `PortfolioProjectMetadata`, `ExistingProjectNarrative`, and composed `PortfolioProject` types in `src/app/domain/portfolioProject.ts`.
- Ordered metadata in `src/app/content/projectMetadata.ts`, with stable slugs for the four existing projects, and separate existing narrative records in `src/app/content/projectNarratives.ts`. Literal slug inference and typed exhaustive maps check narrative/visual coverage.
- Static application composition in `src/app/application/portfolioProjects.ts`; UI consumes domain-level metadata/narrative values without importing content sources or provider infrastructure.

### Changed

- Replaced the mixed local project dataset in `src/App.tsx` with the composed collection; project renderers read separate metadata/narrative fields, while presentation-only visual selectors stay in the UI. Project keys now use stable slugs rather than display titles. Selection, handlers, DOM structure, and motion attributes remain intact.
- Updated only relevant architecture descriptions, source-of-truth entries, and ownership boundaries. Documented the inspected gap before source changes: no GitHub integration, generated project model, repository, or store exists in this checkout. Those remain planned; this change does not create replacements.

### Fixed

- Separated owner-authored metadata and existing engineering narrative from presentation and any future GitHub-derived evidence model. No optional case-study field collection was added to an evidence model; no GitHub model or integration was introduced.

### Preserved

- Every original project field, narrative string, ordering, and visual choice; no project facts were invented or authenticated. Existing content remains placeholder/unverified where documented.
- Project list/detail design, navigation, hover/pointer/cursor interactions, chapter/architecture controls, Close/Escape, focus handling, body/nested scrolling, experience/stack/services/contact interactions, and responsive/reduced-motion behavior.
- All CSS, the motion engine, bootstrap/HTML, assets, configuration, dependencies, deployment scripts, and frozen baseline record/tag. No CMS, runtime fetching, new animations, store/repository, analytics, or full case-study system was added.

### Regression Testing

- `pnpm exec tsc --noEmit` passed. `figma make verify-deploy` passed the production build/output verification; no production publish performed. Production CSS retains the baseline hash, and font/license/favicon output bytes remain identical to source.
- Ad hoc data assertions reconstructed the old flat records and confirmed exact equality against `baseline-verified-2026-10-01`, including all four metadata/narrative records and presentation visual choices; unique slugs verified. A server-rendering comparison with portal-only stubbing produced byte-identical complete initial HTML. These are one-off checks, not a new repository-owned test suite.
- Final isolated Chromium 151.0.7922.173 run passed 75 browser checks: all project hover/scale/cursor states, details, architecture activation, nested chapter scrolling with unchanged document position, Close/Escape, focus restoration, and native Enter activation; all experience/service details, stack hover/focus, navigation, and contact destinations.
- Checked 1920/1440/1280/1024/768/390 px layouts, mobile touch/detail/Close reachability at 390 × 844, runtime reduced-motion neutral layers and usable detail dismissal, simulated slow/fast continuous and stepped/rapid wheel scrolling, alternating direction, and full reveal/progress sweep. Desktop/mobile rendering visually inspected.
- GitHub API/raw-content and Google Fonts hosts were blocked during the final browser run. No GitHub requests, browser console errors, or JavaScript exceptions were reported. Static checks found no new network access in the content/domain/application modules. Protected source/configuration/baseline files were verified unchanged; `git diff --check` passed.

### Notes

- The first browser harness attempt had input/position assertions and a transient missing-element failure, without application console exceptions. The final uninterrupted rerun used native Enter text input and captured locked document position after opening; all 75 checks passed without implementation changes for those harness issues.
- GitHub identity-to-slug mapping, evidence/editorial precedence, repository/store integration, remote validation/fallbacks, missing-narrative policy, and richer case-study schemas remain future scope. Current narratives are relocated baseline snippets, not a newly implemented case-study platform.
- Physical trackpad/mouse-wheel testing, cross-browser certification, measured frame-rate performance, and complete accessibility certification remain unperformed. Existing documented limitations are unchanged.

## 2026-10-01 — Engineering Case-study Model Boundary

### Added

- Independent readonly `CaseStudy` domain model in `src/app/domain/caseStudy.ts`: required project slug and optional overview/context/problem/role/constraints/architecture/decisions/implementation/challenges/results/learnings/visuals/links. Decision records support reasoning and trade-offs without imposing a universal section sequence.
- Discriminated documented/not-documented results, required sources for numeric metrics, and typed structural visual payloads for graphs/flows/topology, sequence messages, code, terminal excerpts, and UI evidence. No visualization renderer or actual diagrams/assets were added.
- Sparse authored content in `src/app/content/caseStudies.ts`, with compile-time key/slug matching. The sole minimal Facility Importer seed references its existing problem/constraint/decision snippets and explicitly records no verified result evidence; no detailed Code Sentinel content or new project facts were written.

### Changed

- Added an optional separate `caseStudy` to the composed `PortfolioProject` application value and extended the existing `portfolioProjects` composition to associate by slug. Other projects have no case study; metadata and the compatibility narrative remain untouched.
- Updated relevant architecture ownership/data-flow/source-of-truth descriptions and protected decisions. `PortfolioStore` remains the intended future UI boundary, not an implemented store in this checkout; no repository/store replacement or duplicate was created.

### Fixed

- None. This is an additive model/integration boundary, not a UI, motion, or infrastructure defect fix.

### Preserved

- All existing project metadata/narrative values, ordering, selected details, current compatibility rendering, and visual choices. Case-study reasoning is not merged into a GitHub-derived model or automatically produced from README data.
- Application component source, CSS/motion, interactions, overlay lifecycle, responsive/reduced-motion behavior, assets, configuration, dependencies, and the frozen baseline record/tag. No runtime fetching, analytics, new state system, animations, detailed case-study renderer, or new visual evidence was introduced.

### Regression Testing

- `pnpm exec tsc --noEmit` passed. `figma make verify-deploy` passed the production build/output verification; no publish performed. Built CSS retains its baseline hash; fonts/license/favicon assets remain byte-identical.
- One-off virtual TypeScript contract tests accepted minimal/variable-depth cases, decision reasoning, sparse slug association, and structured visual variants; nine negative tests rejected missing identity, empty prose, metrics on unknown results, unsourced metrics, wrong visual payloads, missing alt text, executable link schemes, mismatched slugs, and readonly mutation. No persistent test file, framework, dependency, or test script was added.
- One-off unit/integration assertions verified authored registry sparsity, identity association, absent Code Sentinel/deeper content, explicit unknown results without metrics/summary, and verbatim seed prose. Original project metadata/narrative values and complete initial rendered HTML remained identical to the pre-change implementation (portal-only stubbing for server rendering).
- Chromium 151.0.7922.173 passed 76 browser checks: all project hover/cursor/scales, detail selection, architecture/chapter interaction, nested scrolling/body lock, Close/Escape/focus restoration, native Enter activation, navigation, experience/services details, stack hover/focus, and contact destinations.
- Checked 1920/1440/1280/1024/768/390 px layouts, mobile touch/detail/Close at 390 × 844, reduced motion before initial load and at runtime, simulated slow/fast continuous/stepped/rapid wheel/alternating scroll, and full reveal/progress sweep. Desktop/mobile project rendering visually inspected.
- GitHub API/raw-content and Google Fonts hosts were blocked during browser verification. No runtime GitHub requests, console errors, or JavaScript exceptions occurred. Static checks found no network calls in the new boundary and verified protected files unchanged. `git diff --check` passed.

### Notes

- The existing modal still consumes its compatibility narrative; the case-study model is available through application composition but does not change presentation. Its Facility Importer seed is not verified real-world evidence, and the old generic result claim was deliberately not promoted into documented case-study results.
- Runtime graph/reference/ID/URL/asset/finite-metric validation and evidence credibility review remain future import/publication/rendering requirements. Type safety does not authenticate facts or resolve references.
- Physical trackpad/mouse-wheel testing, cross-browser certification, measured frame-rate performance, full accessibility certification, and live production-site certification remain unperformed. Existing documented limitations remain unchanged.

## 2026-10-01 — Selected repository metadata contract and build-time synchronization

### Added

- Version 1 `RepositoryPortfolioMetadata` and normalized `RepositoryProject` contracts in `src/app/domain/repositoryProject.ts`. Repository evidence, owner-controlled editorial metadata, and raw README evidence remain distinct; engineering case studies retain their existing separate domain model.
- Dependency-free runtime validation in `scripts/portfolio-contract.ts`, explicit `owner/repository` allowlist in `scripts/selected-repositories.json`, and build-only fetching/mapping/output in `scripts/sync-github.ts`.
- Sparse `examples/code-sentinel/portfolio.json` containing only version and the supplied title. No repository URL, role, stack, architecture, outcome, metrics, or personal contribution facts were invented.

### Changed

- Production build now validates the example and selections and runs synchronization before Vite. `pnpm sync:github` exposes the same build-time operation. Derived snapshot/temp files are ignored; no dependencies or lockfile changes.
- Architecture documents metadata ownership, explicit selection, lowercase repository-name identity, revision-pinned file reads, validation, deterministic ordering, hidden filtering, absence/error policies, and the normalized future repository/store input boundary.
- Detailed case-study content is reserved for a separate structured JSON file referenced by discovery metadata, rather than embedded narrative fields in `portfolio.json` or repository evidence. Reference payload/asset import and rendering remain future work.

### Fixed

- Established the previously missing external metadata contract and sync/normalization foundation; no baseline UI, motion, or interaction defect was changed.

### Preserved

- All four current local project records, list order, compatibility narratives, case-study association, project visuals, interactions, detail selection/architecture/chapters, overlay lifecycle, navigation/contact behavior, typography, responsive/reduced-motion rules, and existing motion infrastructure.
- Application/UI/content/motion/CSS sources, assets, dependencies, Vite/TypeScript configuration, and frozen baseline record/tag remain unchanged. No runtime GitHub calls, duplicate repository/store, README scraping/rendering, visualization system, new animations, or UI redesign.

### Regression Testing

- Application `pnpm exec tsc --noEmit` and separate strict build-script type checking passed. `figma make verify-deploy` passed production build/output verification with the new sync preflight; no publish performed.
- 48 one-off contract/sync assertions passed using explicitly synthetic responses: sparse/full valid metadata, field/narrative/ID rejection, URL/path/visual validation, explicit selections/collisions, commit-pinned reads, mapped evidence, hidden filtering, deterministic ordering, missing-file fallback, access/network/invalid JSON failures, and token non-persistence.
- 11 isolated CLI/output assertions passed: generated schema/data, clear source/field diagnostics and nonzero exit on invalid metadata, prior snapshot untouched on failure, hidden exclusion, and stale output removal for empty selections. No maintained test suite, dependency, or test file was added.
- Chromium 151.0.7922.173 passed 67 browser regression checks against the existing preview: all project hovers/scales/cursor states, detail selection, architecture/chapter interaction, nested scrolling/body lock, Close/Escape/focus restoration, all experience/services details, stack disclosure, navigation, and unchanged email contact behavior.
- Tested 1920/1440/1280/1024/768/390 px layouts, modal opening at all six widths, mobile touch at 390 × 844, reduced-motion layers/navigation/detail use, simulated slow/fast/stepped/rapid/alternating wheel input, and full-page reveals/progress. No browser console errors or JavaScript exceptions in the completed run; no runtime GitHub requests with API/raw-content hosts blocked.
- Protected source/content/asset/config/baseline paths verified unchanged against the starting commit; `git diff --check` passed.

### Notes

- The selected repository list is intentionally empty because no verified repository owner/URLs or Code Sentinel contribution evidence have been supplied. Normal builds perform no GitHub requests; current local portfolio rendering remains authoritative. Live authenticated synchronization and factual project metadata publication have not been verified.
- `PortfolioRepository` and `PortfolioStore` do not exist in this checkout. This foundation provides their future normalized input without opportunistically creating or migrating those layers. Generated snapshots are not imported by current UI; activation requires separately scoped integration.
- Case-study/visual references currently receive syntax/path validation only, not file existence, payload, asset, or factual credibility checks. README remains raw evidence awaiting a separately scoped safe renderer.
- Physical trackpad/mouse-wheel testing and cross-browser certification remain unperformed. Known baseline accessibility/content limitations remain unchanged.

## 2026-10-01 — Portfolio-wide data contract and generic frontend consumers

### Added

- Root `portfolio.json` version 1 document containing all baseline identity, hero/navigation/section copy, project editorial/narrative fixtures, existing technical-art labels, implementation excerpts, experience/education/stack/capability content, contact/social/footer/accessibility labels, and nullable resume reference. `fixture: true` explicitly marks existing unverified content; no realistic personal/project facts or URLs were invented.
- Strongly typed source/normalized contracts in `src/app/domain/portfolioData.ts`; runtime portfolio/snapshot validation in `src/app/application/portfolioContract.ts`; immutable domain normalization in `normalizePortfolio.ts`.
- One static `PortfolioRepository` and one readonly `PortfolioStore`, replacing the previously planned boundary rather than introducing duplicate infrastructure. `App` supports store injection; generic sections receive domain data through props.

### Changed

- `src/App.tsx` no longer owns person/project copy or a slug-specific visual map. All current text, labels, identity/contact destinations, technical-art labels, project visual selection, detail copy, and row content are supplied by data. Existing JSX geometry, classes, motion attributes for current fixtures, and interaction lifecycle are preserved.
- `portfolioProjects.ts` now composes root content, optional eagerly bundled selected-repository snapshots, and separately authored case studies through validation/normalization → repository → store. Existing metadata/narrative exports derive from the same JSON rather than duplicate authored datasets.
- Existing project metadata validation moved unchanged to application-owned `repositoryContract.ts`; the build script re-exports it. Application code does not import scripts. Build/sync also validates portfolio-wide JSON before any network work; no runtime GitHub fetching.
- Matching root and project-repository editorial content joins by slug with documented precedence; evidence and raw README remain distinct from compatibility narrative and case studies. Visibility/order, links/URLs, case-study/technical-visual references and explicit missing-field placeholders are supported without new UI controls.
- The existing Facility Importer case-study seed remains unchanged when its fixture exists and is absent when that fixture is removed; an otherwise valid portfolio no longer requires that project identity. Existing positional motion cadence remains unchanged for current rows/groups and reusable for additional instances without slug-specific branches.
- Architecture updated for the implemented source/repository/store ownership, complete schemas, normalized data flow, generic consumers, fixture status, precedence, and still-future reference/CV/README rendering boundaries.

### Fixed

- Removed component-owned content and fixed project identity/visual coupling that prevented generic data consumption. No visual, motion, or interaction defect was redesigned.

### Preserved

- Original fixture copy, project order, row structure, technical art, typography, spacing, section layout/contrast, responsive rules, motion/hover/pointer/reveal behavior, navigation, modal/chapter/architecture interactions, Close/Escape/focus restoration, nested scroll/body locking, and email-only contact behavior.
- CSS, motion engine, application bootstrap/HTML, assets/fonts/favicon, dependencies/lockfile, package/Vite/TypeScript configuration, and frozen stable-baseline record/tag are unchanged relative to starting commit `fc9ff2f`. No new motion engine, event scheduler, router, CMS, runtime provider integration, visualization system, or CV control.

### Regression Testing

- Application and strict build-infrastructure TypeScript checks passed. `figma make verify-deploy` passed production build/output verification with root JSON preflight; no publish performed.
- 43 one-off contract/repository/store/generic-rendering assertions passed: exact fixture data preservation, deep immutability, valid/invalid content, safe URLs/email/targets, unique identities, visibility/order, normalized selected-snapshot evidence/editorial/README, explicit placeholders, case-study identity checks, novel project/person data, a fifth project without invalid motion values, and presentation/import boundaries.
- Additional integration checks passed for removal of all fixture projects (empty case-study registry/no hardcoded identity prerequisite), native Node root/shared-metadata validation and synthetic revision-pinned sync, and zero requests for empty selections. These do not authenticate synthetic facts or establish live GitHub synchronization.
- Exact server-rendered markup compared against the pre-change implementation: initial page, all four project detail variants, representative experience and capability details. Portal/hook stubs were used only for the comparison; browser lifecycle was checked separately.
- Final Chromium 151.0.7922.173 run passed 67 existing regression checks: all project hover/cursor/scales, selected details, architecture/chapter behavior, nested scroll/body lock, Close/Escape/focus restoration, all experience/capability details, stack disclosure, navigation/contact, six widths (1920/1440/1280/1024/768/390), touch at 390 × 844, reduced motion, simulated slow/fast/stepped/rapid/alternating wheel input, and reveal/progress sweep.
- No console errors/JavaScript exceptions or runtime GitHub requests with API/raw-content and Google Fonts hosts blocked. Protected source/asset/config/baseline paths verified unchanged; `git diff --check` passed. No persistent test suite or dependencies were added.

### Notes

- Current content remains explicit temporary fixture content, including existing unverified claims; typing/validation is not factual certification. Selected repository list remains empty and no verified owner/repository URLs were supplied.
- Detailed case-study/technical-reference loading, new visual renderers, safe README rendering, actual resume asset/CV activation, analytics, and live authenticated synchronization remain outside this task.
- Physical mouse/trackpad testing, cross-browser certification, full accessibility certification and measured frame-rate testing remain unperformed. Known baseline accessibility limitations are unchanged.

## 2026-10-01 — GraphQL pinned-source synchronization and analytics boundary

### Added

- `scripts/github-source.json` configures the provided portfolio owner/repository, without a project list. GraphQL `pinnedItems(first: 6)` discovery filters repository nodes, excludes portfolio infrastructure, validates owner identity, and preserves connection order.
- Portfolio-wide JSON retrieval, revision-pinned optional resume retrieval, PDF size/signature checks, atomic ignored `githubPortfolio.json` output and sync-owned resume publication/obsolete-file removal. Generated source/pin associations and repository normalization are checked before output.
- Application-owned typed `AnalyticsPort` with allowlisted `cv_download`, `project_open`, `contact_click`, `scroll_depth`, and `app_error`; isolated production-opt-in Vercel Analytics/Speed Insights adapter and privacy documentation in `PRIVACY.md`.
- Conditional, data-provided CV download link inside the existing footer content cell; no link is added to the unchanged null-resume fixture. Deployment-base-aware asset href and typed CV event.

### Changed

- Replaced the explicitly authorized manual project allowlist with owner pins; removed `scripts/selected-repositories.json`. Imported project ordering no longer uses editorial `order` or slug sorting. Hidden filtering preserves remaining pinned order.
- Production build now requires authenticated GitHub synchronization through `PORTFOLIO_GH_TOKEN` and `--production`; fixture mode is rejected by build and production composition. Required remote data/API failures stop before Vite with clear diagnostics and no stale/fixture fallback.
- Application composition selects the marked local fixture for offline development or a validated generated GitHub snapshot. Explicit development fixture synchronization remains available; it is not a production build override. Fixture case-study content no longer imports local JSON into production composition.
- Shared project contract adds an optional existing technical-art descriptor, using the same generic visual kinds/labels; no diagram system or new animation. Sparse metadata uses honest repository evidence or field-name placeholders, including blank descriptions.
- Bootstrap composes the analytics adapter and disposes listeners on HMR. Generic component callbacks depend only on the port. Depth events reuse navigation's existing scroll listener with a resize-cached range; no new motion scheduler. Added only the two requested Vercel SDK dependencies, with package-manager lockfile updates.
- `ARCHITECTURE.md` documents configuration, source ownership, contracts, pin ordering, validation/failure behavior, development mode, normalized store boundary, analytics and still-future README/case-study/visual-reference rendering.

### Fixed

- Prevented placeholder fixtures from silently becoming production content and prevented editorial ordering from overriding GitHub pinned ordering. No unrelated visual, motion or accessibility defect was changed.

### Preserved

- Existing generic row/detail presentation, technical art, typography, spacing, section contrast/layout, responsive rules, navigation, cursor, progress/reveal/parallax and hover/pointer composition.
- Existing three overlay lifecycles, project chapters/architecture controls, experience/services/stack interactions, native scrolling, Close/Escape, focus restoration, body/nested scroll behavior and email-only contact. No contact modal, router, CMS, runtime GitHub integration, duplicate repository/store or motion engine.
- CSS, motion engine, HTML, fonts/favicon, Vite/TypeScript configuration, local fixture content and frozen stable-baseline record/tag remain unchanged against starting commit `57e4af57400b41b1146371bd6e2fdac3e82d6bef`.

### Regression Testing

- Application TypeScript and separate strict Node/build-infrastructure checks passed; `git diff --check` passed. Explicit fixture synchronization/snapshot validation round trip passed; production fixture-mode rejection verified.
- Temporary assertions (no persistent test framework): 58 pinned-sync/validation/normalization/assets/analytics checks against synthetic GitHub responses; 43 existing source/repository/store/generic-rendering checks; 11 analytics runtime checks with stubbed SDKs covering async initial-event queue, middleware stripping, DNT/GPC, disposal and no-op mode.
- Five actual generic UI callbacks emit typed events through an injected port; conditional CV href verified. Exact server-rendered fixture markup matches pre-change initial page, all four project details and representative experience/capability details. Hooks/portals are stubbed only for these structural checks.
- Final Chromium 151.0.7922.173 regression run passed 67 checks: project hover/cursor/scale/details, architecture/chapters, nested scroll/body lock, Close/Escape/focus restoration, all experience/capability details, stack disclosure, navigation/contact, six widths (1920/1440/1280/1024/768/390 at height 900), touch 390 × 844, reduced motion, simulated slow/fast/stepped/rapid/alternating wheel input and reveal/progress sweep. Fine-pointer desktop was explicitly configured in the headless harness; initial no-fine-pointer harness assertions were corrected without source changes.
- No browser console errors/JavaScript exceptions or runtime GitHub requests in fixture regression tests with GitHub/Google Fonts hosts blocked. These are development-fixture checks, not real-data production certification.
- `figma make verify-deploy` correctly failed before Vite because `PORTFOLIO_GH_TOKEN` is not configured. Production build/output, real owner JSON/resume, live pin discovery/order and deployed analytics delivery could NOT be verified. No publish or workaround weakening the production guard was performed.

### Notes

- Implementation is activation/verification-pending, not a fully verified live GitHub portfolio. No actual pinned repositories/order were discovered. Synthetic test repositories and existing fixture names must not be reported as owner pins. The available public request was rate-limited and raw main-branch portfolio JSON unavailable; neither establishes the authenticated repository's content or default branch.
- Configure a secure owner token with required repository/GraphQL access, then run live synchronization and production verification. No manually supplied project URLs are required. The real document must satisfy the existing v1 schema and explicitly be non-fixture; no personal/project facts or metrics were invented.
- Analytics is disabled unless explicitly enabled on supported production infrastructure; application payload/privacy guarantees were tested, not vendor backend policy, delivery, retention or legal compliance. Application code adds no tracking storage/cookies/identifiers; ordinary provider HTTP transport remains subject to its reviewed policy.
- Detailed case-study/technical-reference importing, safe README rendering, physical mouse/trackpad hardware testing, cross-browser certification and full accessibility/performance certification remain unperformed or future scope. Historical baseline limitations are unchanged.

## 2026-10-01 — Pinned-source confirmation and synchronization reporting

### Added

- Successful sync output now lists every discovered repository in pinned order with its revision and project portfolio.json status: present/validated or missing/evidence fallback.

### Changed

- Architecture explicitly states that individual project URLs are not a prerequisite and authentication belongs only in the secure build environment. Corrected remaining testing terminology from empty selections to an empty pinned set; historical changelog entries remain intact.

### Preserved

- Existing GraphQL pinned discovery, repository-only filtering, source order, pin/unpin membership, production fixture rejection, validation/normalization, single repository/store, and build-only GitHub access. The obsolete manual allowlist remains absent.
- No frontend, visual, motion, interaction, responsive, dependency or configuration changes in this follow-up.

### Regression Testing

- Application and strict build-infrastructure TypeScript checks passed; 58 synthetic synchronization/validation/normalization/asset/analytics assertions passed; git diff --check passed.
- Retried live pnpm sync:github and production figma make verify-deploy. Both failed explicitly because PORTFOLIO_GH_TOKEN is absent. No real pins/order or project metadata presence were discovered; no live generated snapshot was written and no successful production build is claimed.
- UI/browser regression tests were not repeated for this diagnostic/documentation-only follow-up; UI and motion source files are unchanged. Prior checks remain historical evidence, not newly performed tests.

### Notes

- The inspected checkout already implements the requested pinned architecture; an older screenshot showing an empty manual selection file does not describe this current source. Development still intentionally displays marked fixtures until GitHub mode is activated with a valid synchronized snapshot.
- No project URLs or token values were requested in chat. Missing build authentication is distinct from missing project-selection implementation; no repository facts or discovered lists were fabricated.

## 2026-10-01 — Data-driven Calendly contact action

### Added

- Portfolio-wide `contact.calendly` configured to `https://calendly.com/abinashanandab/15min`, with owner-controlled booking label, `15 MIN · CALENDLY` detail and accessible duration/new-tab text in the same root `portfolio.json`.
- Optional typed booking contract and shared validation: HTTPS without credentials, nonempty labels, URL/labels supplied together or both omitted. Existing documents without booking remain valid.
- Native whole-row booking link alongside the email, equal desktop columns and vertical stacking at the existing ≤800 px breakpoint. Decorative arrows, existing focus outline, `_blank` and `noopener noreferrer` retained/used.

### Changed

- Extended existing `contact_click` event allowlist with `kind: calendly`. The injected AnalyticsPort and existing adapter/privacy gates remain the only analytics boundary; no URL or personal data is emitted.
- Updated architecture, motion ownership description, privacy event documentation and contact regression checklist for this additive action.

### Preserved

- Configured email/mailto, LinkedIn/GitHub, large editorial CTA, typography/colors, footer, navigation and all overlay behavior. Navbar Contact still anchors to the same section/data; no contact modal was created.
- Existing contact keyframes, central scene engine, reduced-motion/input fallbacks, native scroll and analytics lifecycle. No dependency, embed, API, token configuration, runtime Calendly request or separate data store added.
- Stable baseline record unchanged. Other local personal/project content remains explicitly marked fixture data; the public booking URL does not turn those placeholders into verified facts.

### Regression Testing

- Application TypeScript and strict synchronization-infrastructure TypeScript checks passed. Temporary verification scripts passed 58 existing synthetic sync/data/analytics assertions, 11 existing mocked analytics lifecycle/privacy checks, 12 focused booking contract/privacy/source assertions and five actual component render/callback assertions with an injected port (stubbed hooks/portal).
- Chromium 151.0.7922.173 passed 67 existing browser regression checks: project hover/details, experience/services, stack, navigation, cursor, modal Close/Escape/focus/body lock, six widths, touch, reduced motion, simulated wheel patterns and reveal/progress. No app console errors, JavaScript exceptions or runtime GitHub requests in development-fixture verification.
- Focused browser checks passed at 1920/1440/1280/1024/768/390 × 900: equal desktop columns, mobile stacking, no horizontal overflow, email/link/text/rel/target/arrow correctness, neutral reduced-motion transforms and finite normal-motion transforms. Actual Tab focus had a visible outline; Enter created a new tab at the exact configured booking URL while the portfolio remained open. Desktop/mobile/normal-motion screenshots visually inspected. No runtime Calendly requests from the portfolio before/after external-tab activation.
- `figma make verify-deploy` failed before Vite: `PORTFOLIO_GH_TOKEN` is not configured. Production build/output and live GitHub-sourced data could not be verified; the required synchronization guard was not bypassed. `git diff --check` passed.

### Notes

- Edits affect the local portfolio-wide source file; remote GitHub deployment/synchronization requires the usual repository publishing and authenticated build environment. No live Calendly scheduling flow, production analytics delivery, physical mouse/trackpad, cross-browser certification or complete accessibility audit was performed.

## 2026-10-01 — Canonical project content cleanup before GitHub activation

### Added

- Optional project metadata `narrative`, `implementation` and `caseStudyContent` contracts. The last is the existing distinct CaseStudy model, not narrative fields embedded in GitHub evidence. Shared runtime validation covers section shape, result status, sourced finite metrics, safe links, unique identifiers, graph endpoints and visual references.
- Maintained offline `pnpm test` suite using the existing Node/TypeScript/React dependencies. Tests cover alternate identity/hero/projects/order/experience/stack/services/contact rendering, data-only add/remove/hide/reorder, self-contained repository content, synthetic pins/sync, failure paths, production fixture rejection and authored-source auditing.

### Changed

- Global portfolio document advanced to schemaVersion 2 because the root narratives registry and project visual/implementation siblings were removed. Fixture projects now hold their complete editorial content under metadata. Project metadata and generated snapshot envelopes remain schemaVersion 1; old global documents/snapshots must be migrated/regenerated before activation and fail explicitly if not migrated.
- Existing narrative/visual copy and sparse case-study seed moved into the canonical fixture JSON without changing their values. No new personal/project facts, metrics or outcomes were invented.
- Normalization consumes each pinned repository's own editorial metadata, including its narrative, implementation and inline case-study content, without looking up same-slug content in the global fixture. Pin filtering/order and the single repository/store remain unchanged.
- Architecture now documents inline caseStudyContent as the active self-contained source, superseding the earlier separate-file recommendation. Existing external caseStudy references remain accepted but unimported; inline/reference coexistence is rejected. Updated only the factual test instruction in AGENTS.md; stability/change rules remain intact.

### Removed

- Project-specific `src/app/content/caseStudies.ts` factory, injected case-study registry parameter and fixture-only composition branch.
- Unused `portfolioFixture.ts`, `projectMetadata.ts` and `projectNarratives.ts` compatibility adapters. No relocated TypeScript fixture or replacement registry was introduced.

### Preserved

- App, CSS, motion engine, navigation, hover/cursor, overlay lifecycle, responsive/reduced-motion behavior, Calendly, analytics implementation, baseline record, dependencies and build configuration are unchanged.
- README remains supporting raw evidence only, not a structured metadata/narrative source. Missing optional editorial content remains absent or uses explicit generic display defaults; production continues rejecting fixtures.

### Regression Testing

- `pnpm test`: 11 maintained offline tests passed, including actual generic React static rendering with a structurally different dataset and fully mocked GitHub requests. Motion hook and portal output are stubbed for static tests, not claimed as interaction coverage.
- Application TypeScript and strict synchronization-infrastructure TypeScript checks passed. Source text/AST audit found no fixture identity, companies, titles, descriptions, emails, personal URLs, dates or stack literals in presentation, and no obsolete registry imports in application source.
- All four projects' normalized metadata/narrative/visual/implementation/case-study values match the pre-cleanup commit. Exact initial React markup is unchanged in the static comparison (motion/portal stubs).
- Chromium 151.0.7922.173: 70 browser regression checks passed, covering all project hover/details/architecture, nested scroll/body lock/Close/Escape/focus restoration, experience/services, stack disclosure, navigation/contact/footer, six widths (1920/1440/1280/1024/768/390 × 900), mobile touch at 390 × 844, reduced motion, simulated slow/fast/stepped/rapid/alternating wheel input and reveal/progress. Desktop/mobile contact screenshots visually reviewed; no app console exceptions/errors or runtime GitHub/Calendly requests observed.
- Production verifier stopped at the unchanged missing-token guard before Vite or GitHub requests. No real synchronization was activated, no token was requested, and no production build success is claimed. `git diff --check` passed.

### Notes

- Ready for repository content setup using global schema v2 and project schema v1. Live activation/deployment certification remains a separate task. Existing v1 global documents and generated snapshots require migration/fresh synchronization, not a silent compatibility fallback.
- Rich CaseStudy content is validated and exposed through the store but is not yet rendered as new detail sections. The unchanged modal consumes project narrative/implementation; external case-study/visual assets and safe README rendering remain future work. Missing content defaults do not establish engineering facts.
- Authored fixtures now exist only in JSON data; documentation, synthetic tests and GitHub owner configuration are not UI-authored content. Physical input/cross-browser certification, full accessibility/performance auditing and production analytics delivery remain unverified.

## 2026-10-02 — GitHub-backed content activation: real portfolio data, pinned projects and token hardening

### Added

- Real root `portfolio.json` (`schemaVersion: 2`, `fixture: false`, `projects: []`). Identity, experience, education, stack, capabilities and contact are drawn only from the owner's Master CV, profile data that was already public in the repository's history, and the pinned repositories' READMEs. No phone number is included, `resume` is `null` (owner decision, see Notes), and the Calendly URL `https://calendly.com/abinashanandab/15min` is preserved in data.
- Root `portfolio.json` published to the three repositories currently pinned on the owner's GitHub profile, in pinned order: `SynthGraph` (`02e525c`), `ParkRabbit` (`4941e6e`), `Eber-app` (`3ca00df`). Each file uses the existing project metadata contract (title, summary, category, role, year, stack, highlights, links, visual, narrative, implementation). `kicker` and `caseStudyContent` are deliberately absent because no verified source exists for them.
- `tests/github-activation.test.mjs` (14 offline tests): pin query limit, typename filtering and counts, over-size/null/foreign-owner rejection, empty pin set, hidden-pin semantics, invalid/missing project metadata, production validity and privacy of the checked-in root document, fixture and placeholder rejection, missing/incomplete portfolio-wide data, the build entry point refusing fixture mode and a missing token without writing generated data, token confinement (Authorization header only; absent from output, errors, generated data, client sources and a built `dist/`), and zero network requests on render.
- Sync diagnostics: owner login, pinned items returned, repositories after filtering, per-repository present/missing `portfolio.json`, absent optional metadata fields, hidden state and revision.
- Production guard: a document marked `fixture: false` is still rejected if its contact email, social links or Calendly URL use a reserved placeholder host.
- `.env.example` (empty `PORTFOLIO_GH_TOKEN`) with least-privilege guidance, and a `.gitignore` exception so it stays tracked.

### Changed

- The development fixture moved from root `portfolio.json` to `fixtures/portfolio.fixture.json`. The portfolio repository is also this repository, so one root file cannot be both the production document the sync fetches and a `fixture: true` document. Consumers updated: the dev-only glob in `portfolioProjects.ts`, sync fixture mode, and `tests/content-architecture.test.mjs`. `pnpm dev` still defaults to the fixture.
- One client-side error message no longer names `PORTFOLIO_GH_TOKEN`, so the variable name is absent from the client bundle.
- In `tests/content-architecture.test.mjs`, only the synthetic production document now uses non-reserved hosts, so it remains a valid production document under the new guard.
- `ARCHITECTURE.md` updated to describe the fixture location, the real root document, the new guard and diagnostics, and the verification status. No protected-system or change-protocol document was weakened.

### Fixed

- None. No existing defect was corrected.

### Preserved

- `src/App.tsx`, `src/useParallaxEngine.ts`, `src/index.css`, `index.html`, the Vite configuration, overlays, cursor, scroll progress, reveals, analytics port/adapter and privacy behavior are unchanged. The sync's pin discovery, ordering, validation, atomic generation, resume handling, store boundary and single-repository design are unchanged apart from the additive items above.

### Regression Testing

- `npx tsc --noEmit` and the strict build-script type check passed. The Node test runner (the `pnpm test` script; pnpm is not installed in this environment, so Node was invoked directly): 25 tests passed, 0 failed, 0 skipped, including the built-bundle scan.
- Rehearsal, not the production path: the real `syncPortfolio` code ran against live GitHub data read through the owner's authenticated `gh` CLI (owner `Abinash-Anand`, 3 pinned items returned, 3 repositories, order SynthGraph, ParkRabbit, Eber-app), serving the then-unpublished `portfolio.json` files locally. All three project files and the root document validated; the absent optional metadata was `kicker, caseStudyContent` for each.
- `vite build` against the rehearsal snapshot succeeded. The `dist/` scan found no `PORTFOLIO_GH_TOKEN`, GitHub API host, token-shaped string, `Alex Morgan` or `alex@example.com`.
- Browser (Claude desktop app embedded Chromium pane, `vite preview` of that build, simulated input only): the page showed the real identity and projects in pinned order; no console messages; the only requests were the page, JS, CSS and font, with no GitHub or Calendly request. At 1920/1440/1280/1024/768/390 px there was no horizontal overflow, clipped text or spill; at 1024 px and below the two longest role titles wrap inside their cells. At 1440 px all 3 project, 3 experience and 5 capability overlays opened with the correct selected content, locked the body, closed and restored scroll position. Native Enter activation, Escape and focus restoration to the triggering row worked. At 390 px every overlay type opened, scrolled natively without moving the document, and closed; Close was inside the viewport once rendering was forced. Stepped, rapid and alternating wheel input left all 405 written scene values finite and `--progress` exactly equal to `scrollY / range`, reaching 1 at the bottom with 18 of 18 reveals; hovering a project while scrolling disclosed its description, wrote the project-pointer variables and showed the `OPEN ↗` cursor label. A control run of the unchanged overlay code against the fixture on the existing dev server behaved the same where compared, and showed the dev preview still serves the fixture after the move.
- Not performed: the real authenticated `sync:github`/`build` (no `PORTFOLIO_GH_TOKEN` in this environment; the owner chose to supply it), the Vercel production-build environment, `prefers-reduced-motion` before load and at runtime (no emulation control in the available browser tool; motion and CSS code are unchanged), physical trackpad/mouse and real touch input, cross-browser/device checks, performance recordings, and the initial Close-focus timer (not observable in the embedded pane, where `document.hasFocus()` is false; identical on the control run). No maintained browser regression suite exists, so none was run.

### Notes

- Remaining blockers for "GitHub integration complete": (1) run `pnpm sync:github` / `pnpm build` once with a real `PORTFOLIO_GH_TOKEN` and record the output; (2) set `PORTFOLIO_GH_TOKEN` in the Vercel project's Environment Variables and confirm a production build. The Vercel production deployment of `2f7f94f` failed before this change; its log was not accessible here, so the cause is unconfirmed (an unconfigured token and the fixture-marked root document would each fail the production guards by design).
- Owner decisions and unverified content: `resume` is `null` because the Master CV contains a phone number and the repository is public. The availability text `Open to new opportunities`, the LinkedIn URL (taken from earlier public profile data; LinkedIn blocks automated checks), and the omission of the Instagram link are owner-confirmable. `Eber` is described only from its README and the CV's Elluminati entry; no claim about that repository's origin is made.
- Findings from real content: at 390 px the single-word project title `SynthGraph` is 15 px wider than its content box in the detail overlay; it stays inside the viewport (0 px past it at 360 px) and was left as is because typography is protected. The stack group `AI / Systems` was renamed `Engineering` in data because its former items had no basis in the owner's work. The pinned repositories were updated through direct commits to their default branches (ParkRabbit's `main` is branch-protected; the owner's permissions allowed the commit).
- `.github/workflows/ci.yml` still runs Angular-era scripts that no longer exist in `package.json`; it is outside this change and was not modified. `.github/workflows/scheduled-deploy.yml` can rebuild daily through a Vercel deploy hook (secret `VERCEL_DEPLOY_HOOK`) so pin changes appear without a manual build. `REGRESSION_CHECKLIST.md` lines that name fixture content describe the development fixture, not the production data.

## 2026-10-02 — Serve Inter and favicon.ico as regular git blobs (untrack from Git LFS)

### Fixed

- The live site (`abinashanand.vercel.app`) served 129–130 byte Git LFS pointer text in place of all seven `public/fonts/*.woff2` files and `public/favicon.ico`, because `.gitattributes` routed `*.woff2` and `*.ico` through Git LFS and Vercel does not fetch LFS objects. Inter therefore never loaded in production (`document.fonts.check('500 14px Inter')` was false, with an OTS "invalid sfntVersion" console warning per font), the page fell back to Arial, and the `.ico` favicon was unusable. The defect predates the 2026-10-02 activation entry: the same pointers were already present in `2f7f94f`, and no earlier successful production deployment of this React build existed to expose it.
- Cause removed: the `*.woff2` and `*.ico` LFS rules in `.gitattributes` were replaced with `binary` rules, and the eight files were re-committed so git stores their real bytes. Other LFS rules are unchanged; no LFS-tracked file remains in the repository.

### Preserved

- Font family, weights, `@font-face` declarations, CSS, application and motion code, dependencies and configuration are unchanged. Each re-committed file is byte-identical to its original: the sha256 of every file equals the oid in its former LFS pointer. The file history keeps the earlier pointer commits; their LFS objects remain in LFS storage.

### Regression Testing

- Built with `vite build`: `dist/favicon.ico`, `dist/favicon.svg` and all seven `dist/fonts/*.woff2` plus the license are byte-identical to their `public/` sources, and the built CSS references the same `/fonts/*.woff2` URLs. `tsc --noEmit` passed and 25 of 25 tests passed. Live-site verification after deployment is recorded in the follow-up note below.

### Notes

- `.gitattributes` carries a "Generated" header from the project template. If a platform tool regenerates it, the LFS rules for `*.woff2`/`*.ico` could return and reintroduce the defect; the comment beside each new rule states why. `*.woff`, `*.ttf`, `*.otf`, `*.eot` and the remaining LFS rules were deliberately left alone as no such files are in use.

### Follow-up verification (live site, 2026-10-02, after `c413349` deployed)

- Vercel production deployment of `c413349` succeeded. Every font and icon file now served by `abinashanand.vercel.app` is byte-identical to its `public/` source with the correct content type: `inter-*.woff2` (all seven, `font/woff2`), `favicon.ico` (3765 bytes, `image/vnd.microsoft.icon`) and `favicon.svg`.
- The rebuilt bundle still embeds the GitHub snapshot (owner `Abinash-Anand`, portfolio revision `c413349…`, pins SynthGraph, ParkRabbit, Eber-app in order) and contains no `Alex Morgan`, `PORTFOLIO_GH_TOKEN`, GitHub API host or token-shaped string.
- In the embedded Chromium pane, Inter now loads in production (`document.fonts.check('500 14px Inter')` is true; the latin face reports `loaded` and its 48256-byte body decodes). A reload added no new font-decode warnings to the console; the ten warnings still listed in that tab's buffer came from earlier visits before the fix.
- The six-width layout audit (1920, 1440, 1280, 1024, 768, 390) on the live site matches the earlier local Inter-rendered results: no horizontal overflow, clipped text or spill, three projects, and identical experience-row heights (76/76/76 at 1920–1280, 95/76/95 at 1024, 119 at 768, 119/119/138 at 390). Simulated viewport emulation only; interactions and motion were not re-run because no application, CSS or motion code changed in this fix.

## 2026-10-02 — Replace the stale Angular-era CI workflow

### Fixed

- `.github/workflows/ci.yml` still described the previous Angular project and failed on every push since the React migration (`2f7f94f`, `d0ad8fe`, `c413349`, `7d1eb01`). The recorded failure was at `actions/setup-node`: `cache: npm` requires `package-lock.json`, but this repository tracks `pnpm-lock.yaml`. The later steps (`npm run format:check`, `lint`, `typecheck:scripts`, `test:scripts`, `npm test -- --no-watch`) name scripts that no longer exist in `package.json`, so the workflow could not have passed even with caching fixed.
- The workflow now installs with the pnpm version pinned in `.mise.toml` (`pnpm install --frozen-lockfile`, cached through setup-node) and runs, on Node 22 (the declared toolchain) and Node 24: the application type check, the strict build-script type check, an offline build, `pnpm test`, and `pnpm audit --prod --audit-level=high` (Node 24 only). It adds a concurrency group that cancels superseded runs and a 10 minute timeout; `permissions: contents: read` is retained.

### Changed

- The build step deliberately does not run `pnpm build`. That is the production build: it runs the authenticated GitHub sync and refuses fixture data, so it needs `PORTFOLIO_GH_TOKEN`, which Vercel provides and which GitHub does not give to pull requests from forks. CI instead runs the sync in `PORTFOLIO_DATA_MODE=fixture` and `vite build`, with no secret and no GitHub request. The output is never deployed; it exists so the test that scans a built bundle for tokens and GitHub hosts runs instead of skipping.
- `ARCHITECTURE.md` gained a short description of what CI does and does not certify.

### Preserved

- `.github/workflows/scheduled-deploy.yml`, all application, CSS, motion and content code, scripts, tests, dependencies and the Vercel build are unchanged. No formatting or lint gate was added: no lint script exists, and `oxfmt` has not been applied to this code base, so a format check would fail on untouched files.

### Regression Testing

- Both workflows pass the `@action-validator/cli` schema check. Each step was run exactly as written in a clean clone of the committed tree (no `node_modules`, no `package-lock.json`) using the lockfile's dependency versions (for example vite 8.0.5, TypeScript 5.9.3): `pnpm install --frozen-lockfile`, both type checks, the fixture sync and `vite build`, and `pnpm test` all passed on Node 24.11.0 and on Node 22.23.3, each with 25 of 25 tests and 0 skipped, so the built-bundle scan executed. `pnpm audit --prod --audit-level=high` reported no known vulnerabilities. The first attempt at the Node 22 run silently used Node 24 because of a PATH mistake; it was discarded and redone with the version asserted.
- Not verified locally: execution on GitHub's Linux runners, which is checked by the first run after this commit.

### Notes

- A passing CI run covers types, offline tests and an offline build only. It does not certify the real-data production build (Vercel), browser interaction, motion or accessibility.
- `package-lock.json` remains an untracked local file; CI and Vercel resolve dependencies from `pnpm-lock.yaml`.

### Follow-up verification (GitHub Actions run for `8e81bab`, 2026-10-02)

- The first run of the new workflow passed on GitHub's Linux runners for both matrix legs, Node 22.23.3 and 24.21.0, with no failing or unexpectedly skipped step. Each leg reported 25 of 25 tests passed and 0 skipped, including the built-bundle token/GitHub-host scan; `pnpm install --frozen-lockfile`, both type checks and the offline build passed; the production dependency audit (Node 24 leg only) reported no known vulnerabilities.
- This confirms the workflow executes as designed on its target runners. It does not change what CI certifies (see Notes above): real-data production builds remain Vercel's, and browser behavior was not exercised by CI.

## 2026-10-02 — Repository history: remove the Claude co-author trailer and keep it out

### Changed

- Twenty-six commits on `main` were recreated with the `Co-Authored-By: Claude` trailer removed from the message: the range runs from the first commit that carried the trailer (`d629198`, parent `387946b` untouched) to the then-tip (old `fd01d42`, now `3d2da0b`). Author, committer, author/committer dates, parent structure and every tree are unchanged: for each recreated commit `git rev-parse <old>^{tree}` equals `git rev-parse <new>^{tree}`, and the tip tree is identical. Nothing before that range, and no other repository, was touched. `main` was force-pushed once with `--force-with-lease` after the rewrite was shown and approved.
- Hashes cited in earlier entries for this repository's `main` therefore changed: `2f7f94f` → `a4266ea`, `d0ad8fe` → `aabc3a3`, `c413349` → `120a25e`, `7d1eb01` → `ac5ecfd`, `8e81bab` → `c79673a`. The earlier entries are left as written (see Rules); read them with this mapping. Hashes of commits in other repositories (the `SynthGraph`, `ParkRabbit` and `Eber-app` snapshot revisions) are unaffected.
- Going forward, every commit is authored and committed by the owner's configured GitHub identity with no attribution trailer. This is enforced outside the repository (not tracked by git): local `user.name`/`user.email`, a `commit-msg` hook that rejects an author or committer other than the owner's identity and any Claude/Anthropic attribution in the message, a `pre-push` hook that checks author, committer and message of every outgoing commit before the existing Git LFS step, and the Claude Code `attribution` setting (`commit` and `pr` empty, `sessionUrl` false).

### Preserved

- Application, CSS, motion, content, scripts, tests, dependencies and deployment are unchanged by this step. The working tree before and after the rewrite is byte-identical.

### Notes

- GitHub's contributor graph (Insights) and the REST contributors endpoint now list only the owner. The repository page sidebar and the GraphQL `mentionableUsers` list still showed `claude` when last checked. The cause is not determined: it may be GitHub's cached recalculation, or the pre-rewrite commits that stay reachable through merged branches (`redesign/v2`, `chore/drop-v2-ui`, `fix/hydration-cls`) and `refs/pull/*/head`. No further rewrite or branch deletion was performed. `ParkRabbit`, `Eber-app` and `SynthGraph` still show the contributor and were deliberately left alone.
- The `commit-msg` and `pre-push` hooks live in `.git/hooks` and are not versioned; a fresh clone must reinstall them for the same guard.

## 2026-10-02 — Engineering Stack brick wall and focused motion refinement

### Added

- `src/stackLayout.ts`: a pure, deterministic brick-wall layout for the Engineering Stack. It receives the normalized `portfolio.technologies` groups and returns one rectangular tile per skill with a column span for each of three grids (12 columns at desktop, 7 at ≤1100px, 2 at ≤800px). Spans follow the length of the skill name (short names get narrow tiles, long names wide ones); rows are packed greedily, each row's spans are scaled to fill it exactly (largest remainder, so no gaps and no overflow), and neighbouring rows are offset by up to one column so their seams do not line up, like brickwork. The module contains no skill, category or project name.
- `tests/stack-bricks.test.mjs` (11 tests): every row of all three grids fills exactly for any number of skills; the layout is deterministic and keeps order, names, categories and references; widths follow content and seams are staggered; very long names never overflow a row; the rendered stack contains exactly the technologies in the data; data-only edits (add, remove, reorder, recategorise, a larger set) change the field with no component change; neither the component nor the layout hard-codes a skill, category or project; content layers carry no scroll-mapped opacity; structural parallax travel is small and nothing scales or rotates with scroll; reveals are enter-triggered once; the capability row keeps its inversion while its detail is open.

### Changed

- **Engineering Stack** (`Stack` in `src/App.tsx`, `.stack-field`/`.stack-tile*` in `src/index.css`): the grouped list is replaced by independent rectangular tiles with hairline borders on the paper background — no gradients, shadows, rounded corners or ratings. Each tile shows a two-digit index, the skill, its category as a subtle label and the "Used in" count from the existing data. Category order and membership come from the data and remain visible as the per-tile category label. Hover/focus inverts the tile to the existing black/light treatment and nudges the name 6px; the "Used in" reference replaces the category label in place on hover/focus (desktop) so no tile reserves space for hidden text. ≤800px the reference is hidden and the field is a two-column wall. Reduced motion swaps the label instantly with no transform.
- **Reveals**: content reveals are enter-triggered once and never reverse. The reveal observer is unchanged (adds `.is-visible` once, then unobserves); the experience, service and stack rows and the contact block now use `.reveal` so their opacity is set by the one-time reveal rather than by scroll position, with the existing `cubic-bezier(.16,1,.3,1)` easing. Stack tiles stagger by column (≤5 steps × 45ms).
- **Structural parallax reduced**: scroll-mapped opacity, scale and horizontal drift were removed from content layers (hero title/summary/meta, section headers, project copy/meta/index, experience cells, about, service rows, contact). Their travel is now a small vertical offset (≤14px for most layers; hero title −40px and summary −60px, hero label −20px, contact ≤26px, service arrow ≤8px horizontal). Decorative and ambient layers (hero grid and orbit art, scroll cue, project backdrops, art and overlays, contact grid) and the overlay internals (`ProjectDetail`, `ArchitectureDiagram`) keep their original parallax and opacity behavior.
- **Four-level motion hierarchy** (documented in `MOTION_SYSTEM.md`): ambient/decorative parallax, one-time entrance, hover/focus response, and the overlay hand-off. Each layer type belongs to exactly one level.
- **Capability row → overlay hand-off**: the selected service row now keeps its black inversion (`.service-row.is-selected`, same treatment as hover) while its detail overlay is open, so the row visibly "holds" the state it opened from. The overlay architecture, portal, scroll lock and focus handling are unchanged.
- Documentation updated: `MOTION_SYSTEM.md` (reveal rule, motion hierarchy, stack hover, service hand-off, parallax table), `ARCHITECTURE.md` (stack layout module, data row, reveal row, ≤800px row), `REGRESSION_CHECKLIST.md` (Stack section).

### Preserved

- Native scrolling is untouched: no scroll library, snap, wheel interception or competing scheduler; the single central scene engine and its read → calculate → write loop, geometry cache, `--scene-*` variables and invalidation are unchanged. `src/useParallaxEngine.ts` was not edited.
- Data flow (GitHub pins → sync → generated JSON → repository/store → components), content, copy, typography, spacing, light/dark sections, navigation, project order and visuals, project row hover/pointer interaction, the detail overlays and their scrolling, and the scheduled-deploy and CI workflows are unchanged.

### Regression Testing

- `pnpm exec tsc --noEmit` and the strict build-script type check passed; `node --experimental-strip-types --test tests/*.test.mjs` passed 36 of 36 with 0 skipped (the built-bundle token/GitHub-host scan executed against a local `vite build`). The authenticated sync was not re-run for this change because no data, sync or contract code changed; the content audited below is the GitHub-mode snapshot of revision `3d2da0b` (the pinned `SynthGraph`, `ParkRabbit` and `Eber-app`, in that order).
- Layout audit in the embedded Chromium pane (simulated viewports) at 1920, 1440, 1280, 1024, 768, 390 and a ~360px width, against the real three-project, 19-skill content: no horizontal overflow, no clipped or overflowing tile text, every row fills the field exactly with a uniform height, correct project order and real content, no console errors, and no runtime GitHub or Calendly request. Lg rows are 5/5/4/3/2 tiles with zero seam coincidences; the 7-column grid lays out three tiles per row with zero coincidences; ≤800px is two columns.
- Motion probe on the production preview, scrolling slowly, fast and in stepped alternating directions across all sections (before → after): content layers scrolled above the viewport had opacity ≈0 → 1; the lowest opacity of a revealed on-screen content layer was 0.10 → 1; maximum structural travel was 190px vertical / 34px horizontal → 60px / 8px; reveal classes removed after being added: 0, and no element revealed more than once. Project hover while scrolling, repeated section-boundary crossings and the capability-row open/close cycle were exercised; the selected row stays inverted while open.
- Reduced motion was verified by emulation only: a scratch build with the media query forced to match and `matchMedia` stubbed (the pane cannot toggle `prefers-reduced-motion`). In it, reveals complete with no transform and the stack hover swaps instantly. Not verified with the operating system setting.

### Notes

- All scrolling and pointer input was simulated through the embedded browser; no physical trackpad, mouse wheel or touch device was used. The pane reports the page as hidden, so transitions only progress when a frame is forced; timings were therefore checked from computed styles and class changes rather than watched in real time.
- The overlay internals (`ProjectDetail`, `ArchitectureDiagram`) still map opacity to scroll position inside the overlay; they were out of scope and deliberately left alone. At ≤390px the long `SYNTHGRAPH` title in the detail overlay still spills about 15px: typography is protected and this predates this change.
- A cursor label for stack tiles was not added: the content contract has no field for it, and inventing one would extend the data model.
- `package-lock.json` remains an untracked local file and was not staged.

### Follow-up verification and correction (live site, 2026-10-02, after `c1e5452` deployed)

- CI for `c1e5452` passed on both matrix legs (Node 22 and 24), 36 of 36 tests and 0 skipped on each, and the Vercel production deployment succeeded. On `abinashanand.vercel.app` at 1440px (simulated): 19 tiles in a 12-column field with rows of 5/5/4/3/2, no horizontal overflow, no clipped tile text, projects in the order SynthGraph, ParkRabbit, Eber, Inter loaded, only the site's own origin requested (no GitHub or Calendly request) and no console errors. At 390px: a 2-column field, no overflow and no clipped tile text.
- **Defect found and corrected.** `.stack-tile-foot small{display:block}` (specificity 0,1,1) outranked the bare `.stack-tile-ref{display:none}` (0,1,0) used by both the ≤800px rule and the reduced-motion rule, so neither ever applied. At ≤800px the "Used in" label was therefore `display:block` at `opacity:0` (invisible and out of layout, but in the accessibility tree, contrary to the documented "hidden"). In reduced motion the existing `.reveal *{opacity:1!important}` also forced it to full opacity, so every tile showed "Used in N" on top of its category label until hovered (seen in every tile of a live-page screenshot with the site's own reduced-motion rules applied, and measured as overlapping on the first tile).
- The earlier statement in this entry that reduced motion was verified overstated what was checked: reveals completing without transform and the hover swap were confirmed, but the idle state of a tile was not, which is where the defect sat. Both rules now use `.stack-tile-foot .stack-tile-ref{display:none}`, with a comment beside the base rule explaining why, and `tests/stack-bricks.test.mjs` asserts exactly two such rules and no bare, outranked form (checked to fail against the CSS of `c1e5452`).
- Verification of the fix: with the site's reduced-motion rules applied to the page, all 19 idle tiles show only the category (0 labels displayed over it), hovering a tile gives the black inversion, no name translation, the "Used in" label shown and the category hidden; at 390px the label is `display:none` with a 2-column field, no overflow and no clipped text. `pnpm exec tsc --noEmit` and the full offline suite (36 of 36, 0 skipped, bundle scan included) pass. Reduced motion is still verified by emulation (the site's `prefers-reduced-motion` rules applied unconditionally), not through the operating system setting.

## 2026-10-02 — Content pass: Master CV, repository evidence and a fourth project

### Changed

- **Root `portfolio.json`** (the only file in this repository that changed content):
  - Experience periods are month-precise as on the Master CV (`Jun—Aug 2026`, `Dec 2024—Apr 2025`, `Oct 2023—Oct 2024`). Education now names the institution, the dates and, for the M.Sc., `(expected)`, as on the CV.
  - The Engineering Stack grew from 19 to 26 tiles in the existing four categories: JavaScript, FastAPI, Stripe, LangGraph, TypeORM, Vitest and Pytest were added, and `usedIn` now names pinned projects and CV employers that actually use the technology (TypeScript, React, MongoDB, CI / CD, Automated testing and REST APIs gained `FounderX`; TypeScript, Node.js and REST APIs also gained `Eber`, `SynthGraph` or `ParkRabbit`). Every relationship was checked against the cloned repositories (dependency manifests and source imports) or the CV: 45 pairs, 0 failures, and the check fails on deliberately false pairs.
  - Order inside the Frontend and Engineering categories was adjusted (Frontend is now TypeScript, React, Angular, Next.js, JavaScript, RxJS; Engineering is REST APIs, Docker, Automated testing, CI / CD, Vitest, Pytest) because the real-data seam test of the brick layout rejected the first order (three coincident seams at desktop width, and a single full-width last tile at 801–1100 px). `usedIn` is kept to two names for two-column tiles (React, Python, Docker) because three names wrapped onto the skill name at 1280 px, so `FounderX`'s Python and Docker use is true but not listed.
  - Not added because the contract has no field or the CV does not support it: spoken languages, GPA and phone number (the resume link stays `null`), `Jasmine` (the Eber specs are Angular scaffolds), `Java` and `Git` as tiles.
- **Project `portfolio.json` files** were written for `SynthGraph`, `ParkRabbit`, `Eber-app` and the new `FounderX`, each from the repository's README, source, manifests, workflows and tests plus the Master CV and the LinkedIn project text the owner supplied. They stay in their own repositories and are committed locally under the owner's identity but **not pushed**; production reads them from GitHub, so the live site is unchanged until they are pushed (and `FounderX` additionally has to be pinned on the GitHub profile).
  - Each file now has the fields the UI renders (summary, year, category, role, narrative, implementation, visual) plus a structured `caseStudyContent` (context, constraints, architecture, technical decisions drawn from the repository's own decision records where they exist, results, learnings, one diagram). The UI does not render `caseStudyContent` yet; the contract validates it.
  - Wording follows the evidence. `FounderX`: the LangGraph screening and decision nodes return placeholder scores, and the deterministic evidence-analysis modules (reliability, verification, contradictions, gaps) are implemented and unit-tested but are not called by the analyze endpoint, so the file says so and claims neither a working decision engine nor verified outcomes. `ParkRabbit`: the 500+ updates and 35% figures come from the CV, no benchmark exists in the repository, and the file says they are author-reported; the CV calls it a personal project while the repository description says it is a distributed-systems assignment, so neither label is used. `SynthGraph` takes the Hack-Nation Venture Labs context and key takeaways from the CV and the owner's LinkedIn text; its stale `docs/current-state.md` was not used.
- `ARCHITECTURE.md` and `REGRESSION_CHECKLIST.md` gained a short authoring note and one check about `usedIn` length and stack order.

### Preserved

- No application, CSS, motion, script, test or dependency file changed. The data contract, the data flow and the pinned-repository order logic are unchanged.

### Regression Testing

- The real `syncPortfolio` code and contract validation ran against the new files, reading live pin and repository evidence through `gh` and serving the staged `portfolio.json` files in place of the unpushed ones, with `FounderX` injected as a simulated fourth pin: all four project files validated, the document has `fixture:false`, and the projects render as SynthGraph, ParkRabbit, Eber, FounderX. The only optional field absent from every file is `kicker`.
- `pnpm exec tsc --noEmit`, the strict build-script type check and the offline suite passed (36 of 36, 0 skipped, built-bundle scan included).
- Browser audit of a production build of that snapshot in the embedded Chromium pane (simulated viewports): at 1920, 1440, 1280, 1024, 768, 390 and 360 px there was no horizontal overflow or clipped text, the stack had 26 tiles with every row filling the field (rows of 5/6/4/5/3/3 at desktop, three per row at 801–1100 px, two at ≤800 px), the experience rows did not spill, and all four project overlays opened and closed. A hover audit of the "Used in" text across 1920, 1600, 1440, 1366, 1280, 1180, 1101, 1100, 900 and 801 px found no tile where it touches the skill name. No console error came from the build, and the page made no GitHub or Calendly request.
- Not verified: a real authenticated `sync:github` run with the pushed files (it needs the owner's token and the push); that run, the Vercel deployment and the live site after the push; the "Used in" and overlay audits with physical devices.

### Notes

- Findings that predate this change and were left alone: in the project detail overlay the sticky case-progress rail overlaps the first decision column at 1440 px (the same on the live site), and the `SynthGraph` detail title spills 6 px at 768 px and 15 px at 390 px.
- The brick layout assigns widths from the skill name only. Some skill counts or orders leave a single full-width tile in the last row at 801–1100 px, and long `usedIn` text wraps in two-column tiles; the data was tuned around both, and a follow-up could let `usedIn` length feed the width demand.
- `FounderX` appears on the site only after it is pinned on the GitHub profile (up to six pins are read). Pushing the project files can also start those repositories' own CI and hosting auto-deploys: `SynthGraph` runs CI on every push to `main`, while the `FounderX` workflows ignore a root `portfolio.json`.

### Follow-up verification (live site, 2026-10-02, after the project files were pushed)

- On the owner's approval the four project files were pushed as plain fast-forwards to each repository's `main` (`SynthGraph` `fe0792e`, `ParkRabbit` `41e807d`, `Eber-app` `79ecb6b`, `FounderX` `0f75fb0`), followed by this repository (`5e7fe8c`). `FounderX` had already been pinned on the GitHub profile. ParkRabbit and FounderX printed a protected-branch notice and accepted the push through the owner's rule bypass; no history was rewritten. The pre-push guard verified owner identity and no Claude or Anthropic attribution on each push.
- CI passed for `5e7fe8c` and the Vercel production deployment succeeded. The live bundle embeds exactly the four pushed project revisions and the `5e7fe8c` portfolio revision, and contains no `Alex Morgan`, `PORTFOLIO_GH_TOKEN` or GitHub API host.
- In the embedded Chromium pane at 1440 px (simulated viewport) the live page lists the projects as SynthGraph, ParkRabbit, Eber, FounderX, shows 26 stack tiles in rows of 5/6/4/5/3/3 that fill the field, shows the month-precise experience periods, loads Inter, requests only its own origin, has no horizontal overflow and logged no console error. The earlier statement that the project files were not pushed describes the state at commit time. The authenticated Vercel sync did run on the new files, which is the first real-data confirmation of this content pass; the other widths and the overlays were not re-audited on the live site.
