# Stability Contract

This contract defines the behaviors and architectural properties that future changes to the portfolio MUST preserve. `STABLE_BASELINE.md` records the actual implementation; `AGENTS.md` defines the required workflow. This contract protects that baseline without claiming that its documented limitations are solved or that browser validation has occurred.

**MUST / MUST NOT** indicate binding requirements. **SHOULD** indicates the preferred approach unless a documented, justified exception is necessary. New features SHOULD be additive. An explicit user request may authorize a specific behavior change, but does not authorize unrelated redesigns or regressions.

Before changing a protected system, identify the affected system, necessity, existing behaviors at risk, and verification plan. Deliberate replacements require explicit authorization and an explanation of regression risks before implementation.

## 1. Visual Stability

Changes MUST preserve:

- The existing typography hierarchy: large editorial headings, readable supporting copy, and distinct small labels/metadata.
- The spacing system, generous whitespace, section rhythm, alignment, and responsive proportions.
- The warm monochromatic visual language, thin rules, light/dark contrast, and overall premium/minimal aesthetic.
- Editorial composition and recruiter-first scanning with deeper technical exploration.
- Project row structure: index, title/copy, metadata, and internal technical visual, including its narrow-screen adaptation.
- The dark contact section and its relationship to the dark footer; existing detail-overlay surfaces MUST remain coherent with this language.

An unrelated feature MUST NOT introduce new typography, colors, density, card-heavy layouts, or decorative effects that silently change the hierarchy. Visual redesign requires explicit approval.

## 2. Interaction Stability

Existing interactions MUST continue working unless the user explicitly requests their change:

- **Navigation:** native hash navigation, hero scroll cue, Back to top, active-link indication, and scrolled-header treatment.
- **Projects:** row activation opens the correct project; existing hover/pointer composition, detail content, architecture activation, and scroll-tracked chapters remain functional.
- **Experience (2026-10-02, explicit user-authorized redesign of the former row list):** scrolling through the section advances/reverses the active entry in data order; clicking a year jumps directly to it without being reverted by the next scroll-triggered check; the sticky pin releases cleanly at the section's start/end; the "Read full story" control still opens the correct employer's full detail overlay (the one interaction carried over unchanged from the row-list design). At ≤800 px the sticky pin and scroll-stepping are disabled in favor of a flat, tap-to-switch layout, same component and state.
- **Services:** row activation opens the correct capability; hover treatment and detail email action remain intact.
- **About (2026-10-02, explicit user-authorized redesign of the former static description/education layout):**
  selecting a principle (click, `Enter`/`Space`, or touch) updates the selector and the statement/explanation/
  evidence together, never one without the other; `ArrowUp`/`ArrowDown` move keyboard focus between the four
  principle tabs without changing the selection, matching an accessible manual-activation tablist; scrolling the
  page never changes which principle is selected, unlike Experience's deliberately different, scroll-driven
  interaction language. Education remains present as a quiet continuation.
- **Modals:** preserve the shared portal-based overlay pattern, independent detail scrolling, body scroll lock while open, and restoration of normal document scrolling on close.
- **Close behavior:** Close and Escape dismiss the active detail. Existing focus-management attempts and restoration of previous focus MUST NOT be removed or weakened.
- **Keyboard behavior:** preserve native link/button activation, visible focus, architecture-node focus interaction, and Escape handling. Stack reference disclosure on visible focus remains available where the baseline displays it.
- **Cursor behavior:** retain contextual labels and pointer-following on supported desktop layouts without blocking hit targets; retain native-pointer fallbacks on narrow/coarse-pointer layouts.

Document progress and project chapter progress MUST remain distinct. New interactions MUST NOT intercept clicks, keyboard input, or scrolling intended for existing controls.

## 3. Motion Stability

- Scroll-linked motion MUST react to native document or nested-overlay scrolling, not replace browser scrolling or control wheel/touch input.
- Parallax progress MUST derive from scroll state and cached, transform-independent layout geometry. Previously rendered transforms MUST NOT become inputs to subsequent scene-progress calculations.
- Preserve meaningful separation between existing internal layers and stable coordinate-reference containers. Do not remove depth or introduce visible corrections to accommodate a new feature.
- Hover, pointer, reveal, and scroll motion MUST compose through existing ownership and CSS-variable patterns. Hovering while scrolling MUST NOT erase either interaction.
- Reveal animations MUST leave their completed reveal state visible after entrance; additions MUST NOT strand content in an invisible state or unintentionally replay existing one-time reveals. This does not forbid the existing scene-driven opacity changes during entry/exit; preserve reveal and scroll responsibilities separately.
- Preserve restrained transitions and modal entrance/exit behavior. Avoid bounce, elastic overshoot, random transforms, or abrupt state changes introduced by new work.
- Reduced-motion support MUST remain effective on initial load and preference changes: visible content, neutralized scene layers, non-smooth anchor scrolling, and removal of extended sticky tracks.

**New animation systems MUST NOT compete with or overwrite existing transform systems without deliberate, explicitly authorized architectural changes.** Such changes must define property ownership, lifecycle cleanup, and regression tests before implementation. Preserve the existing central scheduler rather than introducing a parallel motion engine.

## 4. Performance Stability

Changes MUST NOT introduce:

- Multiple competing requestAnimationFrame loops controlling the same visual system, including duplicate loops after StrictMode remounts or overlay reopening.
- Excessive DOM queries or geometry measurements inside scroll/wheel handlers. Events SHOULD update state or request the existing scheduled render.
- Layout thrashing, interleaved style writes and layout reads, or avoidable forced synchronous layout in hot paths.
- Unnecessary event listeners, leaked observers, stale callbacks, or repeated subscriptions. Cleanup MUST match registration.
- Page-wide or indiscriminate `will-change`; promotion hints SHOULD be limited to active elements that need them.
- Expensive continuous animations when scenes are settled or inactive, or unnecessary repeated style writes.

Preserve cached geometry, deliberate invalidation, and read → calculate → write batching. Existing pointer-anchor measurement is not permission to measure every animated layer every frame. New work MUST NOT materially degrade scrolling responsiveness, input latency, or normal interaction performance.

## 5. Responsive Stability

Desktop, tablet, and mobile layouts MUST remain functional through viewport and orientation changes.

- Preserve the current narrow-screen navigation model: primary navigation links are hidden at ≤800 px; wordmark and Contact remain reachable. Do not assume a mobile menu exists.
- Touch users MUST retain direct project, experience, service, and close actions without requiring hover or custom-cursor interaction.
- Preserve hidden/disabled desktop-only effects: custom cursor fallback, non-sticky mobile project rows, hidden narrow-screen chapter indicator, and hidden mobile stack references.
- Maintain existing column-to-stacked layout changes, readable text, usable visual sizing, and reachable controls without unintended horizontal page overflow.
- Overlays MUST fit the viewport, support native nested scrolling, and keep Close reachable on every supported layout.
- Preserve viewport-scaled parallax strength and fine-pointer gating. Additions MUST NOT restore desktop-sized travel or sticky project behavior to narrow layouts unintentionally.

## 6. Accessibility Stability

Preserve keyboard navigation, visible focus, Escape-to-close, readable contrast, usable touch targets, and semantic anchors/buttons for existing actions. New features MUST NOT require pointer precision or hover alone for essential functionality.

Reduced-motion behavior MUST NOT be bypassed by a new library, animation, or transition. Content MUST remain readable and actions usable with motion disabled.

The baseline documents accessibility gaps, including the absence of a modal focus trap/background inert handling and some hover-only disclosures. This contract does not claim those features exist or require retaining their deficiencies. Authorized accessibility improvements SHOULD extend existing systems and MUST preserve other working behavior.

## 7. Architectural Stability

Inspect existing implementation and ownership before adding infrastructure. Extend the current portfolio data, mapped rendering, selection state, shared detail overlay, event handling, and scene engine instead of creating parallel datasets, modal systems, cursor systems, scroll controllers, or reveal engines.

Preserve existing exports, CSS-variable composition, component responsibilities, and preview/build integration unless their change is explicitly justified and authorized. New features MUST NOT silently rewrite architecture or replace working code merely because an alternative appears cleaner.

When a feature conflicts with a stable system, preserve that system and work around or extend it. Review every meaningful change against `REGRESSION_CHECKLIST.md`, verify existing interactions, and update `CHANGELOG.md` after meaningful feature work. Missing required documents MUST be handled according to `AGENTS.md`, not silently skipped.

## 8. Regression Definition

A regression is any unapproved change that causes:

- An existing feature to disappear or materially weaken.
- An interaction to become unreliable or produce incorrect selected content.
- Visible jitter, oscillation, snapping, or positional correction.
- Scroll trapping, scroll hijacking, or failure to release the intentional modal body lock.
- Broken responsive behavior or unreachable controls.
- Broken reduced-motion behavior or hidden content under that preference.
- Accidental visual hierarchy, typography, spacing, or composition changes.
- Duplicated infrastructure or competing ownership of existing systems.
- Performance degradation during scrolling or normal interaction.
- Unexpected behavior caused by a new feature.

Intentional modal background locking with working dismissal is not itself scroll trapping. Known baseline limitations are not newly introduced regressions, but MUST NOT be worsened or used to excuse new failures.

Completion requires checking new behavior and preserved behavior, including relevant scrolling, hover, overlay lifecycle, keyboard, responsive, and motion-preference combinations. Build success or screenshots alone do not establish interaction stability. Record actual validation and distinguish simulated input from physical-device testing; disclose gaps instead of asserting unverified results. Do not declare completion while an unintended regression remains.

Stable behavior is a product requirement, not an implementation detail.
