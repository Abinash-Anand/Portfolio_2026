# Motion System

This is a source-based record of the existing motion implementation in `src/App.tsx`, `src/useParallaxEngine.ts`, and `src/index.css`. It does not authorize changes, introduce a new engine, or claim browser validation. Read it with `STABLE_BASELINE.md`, `ARCHITECTURE.md`, and the stability/change contracts.

## Motion Philosophy

Motion should communicate hierarchy, depth, interaction, continuity, and technical sophistication. It must not exist merely because CSS allows it. Preserve the portfolio's restrained editorial character: reveal what matters, distinguish layers, connect section transitions, and clarify available actions rather than adding spectacle.

This philosophy is a constraint on future work. The implementation details below describe what exists, including limitations, not a claim that every effect fully meets that ideal.

**Motion hierarchy (updated 2026-10-02, this change).** Motion is layered in four levels that must not compete: **primary**, the once-only enter reveal of sections and content (translate plus opacity, then it never replays and is never stranded invisible); **secondary**, parallax depth, now restored on structural content as well as decorative layers, composed multiplicatively on top of the primary reveal; **tertiary**, hover, focus and cursor feedback, short and restrained; **ambient**, the scroll progress bar and scroll cue. A reveal never reverses: scroll position decides *when* a reveal starts, never whether revealed content is allowed to become visible at all. Once revealed, a structural layer's own scroll-mapped opacity may continue to respond to scroll position (settling to full visibility as it centers, receding — never below a readable floor — as it passes), which is a deliberate, explicitly requested reversal of the previous (2026-10-02, `c1e5452`) policy that forbade any scroll-mapped opacity on structural content. See "Section reveal" and "Parallax" below for the restored composition, and `CHANGELOG.md` for the request and verification record.

## Current Motion Systems

### Shared timing and capability rules

- Primary CSS ease: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`. `--ease-secondary: cubic-bezier(0.4, 0, 0.2, 1)` is declared but not referenced by current transition rules. Transitions without an explicit easing use the CSS default `ease`.
- Scene keyframes use smoothstep sampling and elapsed-time-adjusted damping, not a fixed CSS duration. Default damping is `0.18`; explicit current values include `0.11`, `0.13`, `0.14`, and `0.15`.
- Engine strength is `1` at ≥1100 px, `0.66` at ≥600 and <1100 px, and `0.26` below 600 px. The separate CSS layout breakpoint is ≤800 px.
- Fine-pointer effects require a fine pointer; engine pointer depth/magnetism additionally requires no reduced-motion preference. Narrow layouts and coarse pointers hide the custom cursor.
- Reduced-motion CSS forces animation/transition durations to `.01ms`, disables smooth anchor scrolling, neutralizes scene transforms/blur, and exposes scene/reveal content. This does not remove every non-scene hover offset or the cursor itself.

**Configured versus effective opacity:** the engine writes `--scene-opacity` for layers, but later normal-motion CSS rules fix the own opacity of `.hero-grid` at `.24`, `.contact-grid` at `.22`, and `.project-visual-backdrop` at `.3`. Those elements still consume scene transforms; their own opacity does not follow the generic scene expression. Parent opacity/masks may further affect appearance. Reduced-motion `!important` rules force their layer opacity to one. Treat the markup keyframes as configuration, not proof that the cascade applies every configured property. (`.hero-art` no longer exists as of the 2026-10-04 portrait redesign — see "Hero: portrait parallax" below, whose layers all follow their configured `--scene-opacity` directly, with no later fixed-opacity override.)

### Extreme wheel input dampening (2026-10-04; user-authorized narrow exception to native wheel scrolling)

Unlike every other entry on this page, this is not a visual effect — it shapes the *input* that drives everything
else. A single native wheel event can report a `deltaY` of 1000px+ during an aggressive mouse-wheel or trackpad
flick, letting the browser jump through several sections almost instantly. This narrows that specific case without
touching anything else about how the page scrolls.

- **Trigger / element:** a single `wheel` listener on `window` (`{passive:false}`, registered/cleaned up in
  `useScrollSceneEngine` alongside every other input listener — no second engine).
- **Properties:** `dampenWheelDelta()` (`src/useParallaxEngine.ts`, exported and directly unit-tested) passes any
  event at or under 160px straight through untouched — the listener does nothing at all in that case, not even
  `preventDefault()`. Above 160px, only the excess is compressed through an asymptotic curve
  (`160 + 420·(1 − e^(−excess/420))`), so damping grows progressively stronger for more extreme input without ever
  hard-capping it (a single event's contribution approaches but never reaches ~580px). `event.preventDefault()` is
  called only for the dampened case, followed by `scrollBy({top: dampened, behavior: "instant"})`.
- **Timing/easing:** none — this is a per-event, instantaneous delta adjustment, not an animated transition. The
  damped `scrollBy` deliberately uses `behavior: "instant"`, not `"auto"` (which would defer to the page's own
  `scroll-behavior: smooth` and reintroduce an animated, laggy jump — exactly the problem this exists to avoid).
- **Scope:** skipped entirely for pinch-zoom (`event.ctrlKey`) and for any event inside the overlay's own
  `.overlay-scroll` container, which handles its scrolling independently. Keyboard (including Page Up/Down, Home,
  End), scrollbar dragging, and touch scrolling never dispatch `wheel` events, so none of them pass through this
  code at all — they remain exactly as native as before this change.
- **Responsive:** unaffected by viewport width or the engine's own motion-strength attenuation; wheel input is a
  desktop/trackpad concern independent of that scaling.
- **Reduced motion:** unaffected and deliberately left active. Damping does not add or remove any CSS animation or
  transition — it changes how many pixels a single extreme input event moves the page, which is orthogonal to
  `prefers-reduced-motion`'s concern (transitions and scroll-linked visual effects). The engine's existing reduced-
  motion neutralization of `.scroll-layer` transforms is untouched.

### Page scroll progress

- **Trigger / element:** native document scrolling; `.scroll-progress`, a fixed 2 px bar.
- **Properties:** engine writes root `--progress = clamp(scrollY / pageMax)`; CSS owns `scaleX`, with left transform origin. `pageMax` is cached document height minus viewport height; zero range produces zero progress.
- **Timing/easing:** updated through the shared requestAnimationFrame render; no dedicated transition or visual damping on the bar.
- **Responsive:** same document-based indicator across layouts, with range recomputed on geometry invalidation. Overlay scrolling does not drive its value.
- **Reduced motion:** remains functional; it is not a `.scroll-layer` and its informative scale is not disabled.

Project details have a separate five-chapter indicator: an overlay-rooted IntersectionObserver selects the active chapter. Marker color, font-weight, 5 px horizontal shift (was 4 px), and line scale/opacity (`.3`→`1` scale, `.6`→`1` opacity) transition over 350 ms with the primary ease — strengthened in this change for clearer wayfinding, same mechanism and timing. It is hidden at ≤800 px; reduced motion makes transitions near-instant without removing chapter state. It remains informational, not clickable. The case-study content additively rendered within each chapter (see `ARCHITECTURE.md`) now also carries its own `data-scroll-layer` opacity/translate, composed the same way as the chapter's pre-existing internals (`decision-grid` cells, `ArchitectureDiagram`, the implementation/result blocks) — same engine, same `.scroll-layer` composition, no new motion system.

### Section reveal

- **Trigger / elements:** engine IntersectionObserver at threshold `0.12` observes `.reveal`, adds `.is-visible` once, then unobserves it. These include section headers, project rows, stack groups, service rows, and About copy.
- **Properties:** header/About `--reveal-opacity` and `--reveal-y` transition from invisible/26 px to visible/zero. Row/group reveals animate opacity. As of this change, structural content layers (hero title/summary/meta, section headers, project index/copy/meta, about, service index/title, contact meta/headline/actions/socials) again carry a 3-point `data-opacity` keyframe (entry/middle/exit), composed multiplicatively with `--reveal-opacity` so the one-time reveal still gates first appearance, never reverses, and the layer always rests at full opacity (middle keyframe `1`) — only the entry/exit edges dip, bounded to a readable floor (≥0.2, enforced by `tests/stack-bricks.test.mjs`) so scroll-position depth never reads as content disappearing. Decorative/ambient layers (hero grid and art, scroll cue, project annotation, contact grid) and the detail overlay's internals keep their wider-range scene opacity, unchanged. Project and service rows, stack tiles and the contact content still use the same once-only enter reveal at the row/button level (`.is-visible` is added once and never removed); the restored opacity is a second, independent layer composed on top of it, not a replacement. Experience no longer participates in this shared reveal system at all — see "Experience: scroll-stepped sticky timeline" below for its own, separate discrete-step transition system. Education's two chapters likewise do not use `.reveal`: their emphasis is a continuous, reversible scroll-position crossfade (see "About: Education progression" below), not a one-time enter animation. Stack tiles stagger by their position in a row (45 ms per column, capped) for this once-only reveal. As of this change stack tiles additionally carry their own per-tile scroll-driven assembly motion on a separate inner element — see "Stack: assembly motion and category emphasis" below — but their final resting position is the same flat, geometric brick-wall layout as before; nothing about the layout itself moved.
- **Timing/easing:** header/About 800 ms primary ease; heading delay 100 ms, note delay 180 ms; project/stack/service opacity 700 ms primary ease.
- **Responsive:** reveal mechanism remains; reflow does not introduce a second observer system.
- **Reduced motion:** CSS forces reveal content visible, removes offsets/transforms, and minimizes transition durations. Observer behavior remains, but content does not depend on its entrance animation to be visible under this preference.

The `.is-visible` state does not reset on leaving/re-entering. A separate scene's configured opacity may still fade a layer on exit; that is not a replay or failure of its reveal.

### Parallax

- **Trigger / elements:** native document or `.overlay-scroll` position drives `[data-scroll-scene]` timelines and their nearest-scene `[data-scroll-layer]` children.
- **Properties:** x/y translation, scale, opacity where consumed by the CSS cascade, rotation, and optional blur via `--scene-*`; phase shifts individual progress. Current JSX does not explicitly configure blur. Hero art also receives viewport-pointer offsets.
- **Timing/easing:** entry/middle/exit keyframes are sampled with smoothstep, then rendered values converge using damping adjusted for frame elapsed time. Native scroll position itself is not interpolated or controlled.
- **Responsive:** width strength attenuates keyframe deviations and opacity/blur responses. Desktop hero/contact have sticky interiors; project rows stick within tracks. At ≤800 px project sticking is removed; shorter hero/contact sticky tracks remain under normal motion.
- **Reduced motion:** engine uses neutral scene targets and disables pointer motion; CSS removes layer transforms/blur and sets opacity to one. Extended sticky hero/contact tracks, project sticking, and the hero/project overlap are removed.

### Differential parallax depth (2026-10-04, this change; user-requested refinement, no new engine)

Per-layer `data-damping` now follows an explicit role convention on top of the pre-existing per-layer keyframe/phase
system, so the gap between layers reads as depth rather than every layer moving by the same relative amount. This
only tunes existing `useScrollSceneEngine` inputs (`data-damping`, `data-phase`, and travel within each layer's
already-established keyframe shape) — no new property, scheduler, or engine change.

- **Decorative/background layers** (`.hero-grid`, `.contact-grid`, `.project-visual-backdrop`, `.project-overlay`,
  `.scroll-cue`, the hero portrait's backing plates): lowered to `data-damping="0.08"`–`"0.1"` (from the previous
  default `0.18` or unset). Lower damping means the rendered value converges toward its target more slowly each
  frame — visually, the layer lags behind the scroll position, reading as "very slow" / detached background motion.
  Travel amounts on these decorative layers are unchanged; only their settle speed changed.
- **Main structural content** (section note/body copy, hero summary, project copy, contact actions/social links):
  raised to `data-damping="0.19"`–`"0.22"`, snappier convergence that tracks close to the native scroll position —
  the "near-scroll-speed" register the request asked for. Their travel also increased modestly within the existing
  enforced ≤60px structural ceiling (e.g. project-copy 12→16px, contact-action 14→16px) for more perceptible,
  still-restrained depth.
- **Large typography** (`h1`/`h2` `.type-parallax` elements — hero title, every `SectionHeader` heading, contact
  heading): kept at an intermediate `data-damping` (`0.15`–`0.16`) distinct from both the surrounding body copy and
  the slower decorative layers, per "large typography should move slightly differently from surrounding content."
- **Portraits/visual objects** (hero portrait image): travel widened from `[-18,0,24]` to `[-30,0,38]` (still inside
  the ≤60px structural cap) for the "stronger independent movement" the request asked for; damping (`0.14`) kept
  snappier than the backing plates so the portrait visibly separates from them, not just from the grid.
- **Metadata** (`.hero-meta`, `.contact-meta`): its own distinct `data-damping` (`0.19`) and small phase offset,
  different from both the copy above it and the portrait/grid beside it.
- **Stack tile assembly** (`stackTileMotion` in `src/stackLayout.ts`) and **Education's chapter crossfade /
  indicator dot** (`educationChapterMotion`/`educationMarkerTravel` in `src/educationMotion.ts`): travel widened
  within their own existing ceilings (stack tiles still ≤60px per axis; Education chapters still ≤20px y, indicator
  track still ≤220px) for more perceptible depth; Education's chapter layers additionally gained `data-damping`
  (`0.11` chapters, `0.16` dot) for a more gradual crossfade. No shape, invariant, or mirrored-curve requirement
  changed — `tests/stack-bricks.test.mjs` passes unmodified against the new values.

None of this raises the enforced structural ≤60px travel ceiling, adds scale/rotate to a structural layer, or
changes the opacity floor/resting invariants — it only uses more of the existing headroom and widens the *relative*
spread between layers' damping, which those tests do not (and should not) constrain.

### Project hover

- **Trigger / elements:** `.project-row:hover` affects row background, title, description, CTA, and metadata; row selection remains a separate click action.
- **Properties:** background lightens; title moves 8 px right; description changes opacity and translates from 8 px below; CTA appears; metadata darkens.
- **Timing/easing:** title 350 ms primary ease; description, CTA, and metadata declare 350 ms transitions with CSS default ease. The more-specific `.project-row.reveal` transition list overrides the row's base transition list, so its declared 350 ms background transition is not effective on current reveal-marked rows; their background changes without that transition.
- **Responsive:** at ≤800 px description and CTA are always visible; title/other hover selectors remain where hover is available. Desktop disclosure selectors do not provide a matching focus-visible reveal.
- **Reduced motion:** transition durations become near-instant. Transform overrides on reveal descendants suppress project title/description movement; opacity disclosures are exposed by reveal overrides.

### Project image movement (technical art, not an image asset)

- **Trigger / elements:** project-track scrolling, row hover, and fine-pointer position affect `.project-copy`, `.project-art-layer`, and internal visual layers. There are no photographic images or screenshot assets in this system.
- **Properties:** scroll supplies translation/scale/rotation; hover multiplies art scale by `1.04`. Pointer position writes inherited `--project-x/y` on the stable row; copy/art consume those values. The backdrop and foreground annotation have different scroll travel.
- **Timing/easing:** scene damping as above; hover-scale transition 450 ms primary ease; registered project offset transitions 200 ms primary ease.
- **Responsive:** engine strength affects scene targets; mobile art is smaller and row sticking is disabled. Project-pointer offsets are capability-gated but are not multiplied by the viewport strength factor themselves.
- **Reduced motion:** engine project-pointer targets become zero and CSS removes art/scene transforms, so hover scale does not restore visual movement.

### Service hover

- **Trigger / elements:** `.service-row:hover`, its background pseudo-element, and arrow.
- **Properties:** dark background translates from `-101%` to rest, text changes to light, left/right padding becomes 12 px, and arrow variables add `(4px, -4px)` to scene translation.
- **Timing/easing:** pseudo-background sweep 500 ms primary ease. The base row declares padding/color at 500 ms, but the more-specific `.service-row.reveal` transition list overrides it: current rows use 350 ms primary-ease padding and have no effective color transition. Arrow variable transitions are declared at 250 ms primary ease; these variables are not registered with `@property`, so the declaration alone does not guarantee interpolated custom-property motion.
- **Detail hand-off (2026-10-02):** while the capability's detail overlay is open, its row keeps the same inversion through `.is-selected` (set from the section's existing selection state), so the dark row and the dark panel read as one continuous surface; the class clears when the selection clears and the 500 ms sweep returns to rest as the overlay slides out. This adds no listener, timer or transform owner.
- **Responsive:** rows shorten/reflow at ≤800 px; no separate touch animation is installed. Tap opens the existing capability detail without requiring hover.
- **Reduced motion:** transitions become near-instant, and the arrow's scene-layer transform is suppressed. The non-scene background can still change between its hover states.

### Experience: scroll-stepped sticky timeline (2026-10-02; replaces the former row-list hover)

The three-row `.experience-row` list and its hover state no longer exist. Experience is now a discrete, scroll-driven
sequence: a sticky two-column panel (year selector left, active entry right) pinned while the user scrolls through a
tall track, advancing to the next/previous entry at each step. This is deliberately **not** part of the continuous
`useScrollSceneEngine` system — no `data-scroll-scene`/`data-scroll-layer` is used anywhere in this section — to
guarantee the discrete, "snap to a state" interaction never competes with or is diluted by continuous scroll-linked
parallax. See `ARCHITECTURE.md`'s "Experience: scroll-stepped sticky timeline" section for the full structural
reasoning (why this composes Hero's sticky-track pattern with `ProjectDetail`'s `IntersectionObserver` chapter-step
pattern instead of inventing a third scroll mechanism).

- **Trigger / elements:** native document scroll through `.experience-track` (height `entries.length × 100svh`);
  `.experience-sticky` (`position:sticky;top:0;height:100svh`) is the pinned panel. One invisible, non-interactive
  marker per entry (`[data-experience-step]`) is watched by an `IntersectionObserver` (`rootMargin:"-50% 0px -50%"`,
  `threshold:0`, root = viewport) that sets `activeIndex` when a marker's box crosses the exact vertical center.
- **Properties:** `.experience-years` translates via `transform:translateY(calc((1 - var(--active-index)) * var(--year-row)))`
  — a plain CSS custom property set from React state (the same `style={{"--x":...}}` idiom `.stack-tile` already
  uses), not a scroll-layer. Each year's font-size/opacity/scale/color is driven by its own `data-distance` attribute
  (`0` = active: 44px, full color, scale 1; `±1`: smaller, 0.4 opacity, scale .88). `.experience-panel` plays a single
  enter transition (`opacity 0→1`, `translateY(28px)→0`) each time the active entry's `id` changes, via an
  `is-entered` class toggled through one `requestAnimationFrame` tick (not an exit+enter crossfade — the old entry's
  content is replaced, not separately animated out, a deliberate simplification over a dual-mount approach).
- **Timing/easing:** `transition:transform 700ms var(--ease)` on the year rail; `transition:opacity 650ms var(--ease),transform 650ms var(--ease)` on the panel container (lengthened from 550ms on 2026-10-04 for a more "continuous mechanical progression" feel, per user request — same `--ease`, no new curve). Same `--ease` (`cubic-bezier(0.16, 1, 0.3, 1)`) as everywhere else in the system — no new easing curve.
- **Internal stagger (2026-10-04, this change):** the panel's own children (period/company/role/tech/description/
  highlights/expand link) each carry their own `transform:translateY(16px)` and `transition:transform 600ms
  var(--ease)`, released at increasing `transition-delay` (0ms through 140ms) when `.experience-panel.is-entered`
  is set — composed on top of, not replacing, the panel container's own opacity/transform entrance. This gives the
  "content transitions with slight vertical/parallax separation" the request asked for without touching the
  discrete `activeIndex`/`IntersectionObserver` mechanism, the year-selector's own transform, or turning the
  section into a crossfade/carousel. Reduced motion explicitly forces these children's `transform:none!important`
  (added alongside the pre-existing `.experience-panel{opacity:1!important;transform:none!important}` override,
  since this panel sits outside any `.reveal` ancestor and needs its own explicit reduced-motion rule).
- **Click/keyboard parity:** a year button's `onClick` cannot set `activeIndex` directly without the still-active
  `IntersectionObserver` immediately reverting it back on its next check, since the scroll position would not have
  moved (found and fixed during this change's own verification — see `CHANGELOG.md`). It instead calls
  `scrollIntoView({block:"center"})` on the corresponding step marker — native programmatic scrolling, the same
  category of mechanism Navigation's hash links already use, not a custom scroll implementation — so the observer's
  next check agrees with the click. Keyboard `Tab` reaches each year button and the "Read full story" link in normal
  document order; `Enter`/`Space` activates them exactly as any native `<button>` would, no custom key handling.
- **Full-story hand-off:** the "Read full story" button in the active panel opens the same, unchanged `DetailOverlay`
  + `.simple-detail` (+ optional `.simple-detail-story`) record this entry already had before this change — the
  deep-reading experience is preserved, just re-triggered from new UI instead of the old row's whole-row click.
- **Responsive (≤800 px):** the sticky pin and scroll-stepping are both dropped — `.experience-steps{display:none}`
  removes the markers from layout entirely (so the observer structurally cannot fire; a `display:none` element never
  intersects), and `.experience-track{height:auto}` / `.experience-sticky{position:relative}` return the section to
  normal flow. The identical component, the identical `activeIndex` state, and the identical click handler now serve
  a flat, horizontal tap-to-switch year row above a full-width panel — a CSS-only mode switch on one implementation,
  not a second one.
- **Reduced motion:** mirrors the established `.hero,.contact{height:auto}.hero-sticky,.contact-sticky{position:relative}`
  pattern exactly: `.experience-track{height:auto!important}.experience-sticky{position:relative}`, plus
  `.experience-panel{opacity:1!important;transform:none!important}` so an entry can never rest hidden regardless of
  transition timing. The year selector's own transform/opacity are left alone under reduced motion (they are
  functional state indicators, not decorative motion), and the sitewide `*{transition-duration:.01ms!important}`
  rule already makes every state change in this section land instantly rather than animate.

### About: Decision Lens principle selector (2026-10-02; replaces the former static description/education layout)

Unlike Experience, this section is explicitly **not** scroll-driven — per the user's own instruction not to
duplicate Experience's scroll-stepping language here, selection only ever changes through direct interaction.

- **Trigger / elements:** `PrincipleSelector`'s four `role="tab"` buttons (click, `Enter`/`Space`, or touch to
  select; `ArrowUp`/`ArrowDown` to move keyboard focus between them without selecting) and `PrincipleContent`'s
  `role="tabpanel"`.
- **Properties:** the selected tab's label gets a larger font-size and full-color treatment
  (`.principle-tab[aria-selected="true"] .principle-tab-label`) versus muted/smaller inactive tabs; the panel plays
  the same `opacity 0→1`/`translateY(24px)→0` enter transition `ExperiencePanel` already uses, via an `is-entered`
  class toggled through one `requestAnimationFrame` tick, skipped on first mount.
- **Timing/easing:** tab label color/font-size 400 ms `var(--ease)`; panel enter 550 ms `var(--ease)` (was 500ms).
  Same `cubic-bezier(0.16, 1, 0.3, 1)` as the rest of the system.
- **Internal stagger (2026-10-04, this change):** `.principle-statement`, `.principle-explanation`, and
  `.principle-evidence` each carry their own `transform:translateY(16px)`/`transition:transform 600ms var(--ease)`,
  released at 0ms/60ms/130ms delays when `.principle-content.is-entered` is set — the "selector, headline,
  supporting copy, and evidence row should have slightly different movement rates" the request asked for, layered
  on top of the panel's own unchanged opacity/transform entrance. No reduced-motion override was needed: unlike
  Experience's panel, `.principle-content` is a descendant of `.principle-layout.reveal`, so the existing
  `.reveal *{opacity:1!important;transform:none!important}` rule already catches these new child transforms too.
- **Section entrance:** the whole layout (`principle-layout`) still uses the existing shared one-time `.reveal`
  entrance (the same `--reveal-opacity`/`--reveal-y` mechanism every other section's header/copy uses) as it enters
  the viewport — this is the only scroll-linked behavior in the section, and it never changes which principle is
  selected, only when the block first fades/rises into view.
- **Responsive:** at ≤800 px the selector becomes a horizontal, wrapping tap row (`flex-direction:row`) above a
  full-width panel; evidence collapses from 4 columns to 1. Same component and state as desktop, CSS-only mode
  switch.
- **Reduced motion:** the section's `.reveal`-classed wrapper is already covered by the existing
  `.reveal *,.reveal{opacity:1!important;transform:none!important}` rule (no new override needed, since
  `principle-content` is a descendant of `principle-layout.reveal`, unlike Experience's panel which deliberately
  sits outside any `.reveal` ancestor and needed its own explicit override). `aria-selected`/focus state remain
  fully functional; only the animated transition is removed.

### About: Education progression (2026-10-02; replaces the former quiet qualification list)

A continuous, reversible scroll-driven crossfade between two fixed chapters (Foundation, Depth) — a third
interaction language in this same section, after Decision Lens's click/keyboard selection and distinct from
Experience's discrete scroll-stepping, while still built entirely from the shared engine's existing primitives.

- **Trigger / elements:** native document scroll through the pinned `.education-track`/`.education-sticky` shell
  (same generic tall-track-plus-sticky-inner-panel pattern as Hero/Contact/Experience). No click or keyboard
  activation changes which chapter is emphasized — this is a passive, read-as-you-scroll narrative, not a control.
- **Properties:** each `.education-chapter` is a `data-scroll-layer` with its own `data-opacity`/`data-y` keyframes
  from `educationChapterMotion()` (`src/educationMotion.ts`) — Foundation's curve and Depth's are exact mirrors of
  each other, so Foundation starts fully emphasized and recedes to a `0.2` floor by scroll-exit while Depth does the
  reverse, meeting at a shared `0.6` "transition zone" at the midpoint. A small `.education-indicator-dot` layer
  translates along a fixed-height track (`educationMarkerTravel`) from the Foundation end to the Depth end, driven
  by the same scroll progress — a passive echo of the crossfade, not a second signal.
  Travel is a subtle ≤10 px per chapter (well inside the sitewide 60 px structural ceiling); no layer scales or
  rotates.
- **Timing/easing:** continuously sampled through the shared engine's existing phase/smoothstep/damping pipeline —
  the same `cubic-bezier(0.16, 1, 0.3, 1)` as every other scene, no bespoke transition timing.
- **Reversibility:** scrolling up samples the identical curve at an earlier progress value — there is no separate
  "reverse" state or one-shot animation to undo; the crossfade is simply a continuous function of current scroll
  position at every instant.
- **Responsive:** at ≤800 px `.education-grid` becomes a single stacked column (a thin horizontal rule replaces the
  vertical divider between chapters) and `.education-indicator` is hidden (meaningful only against a side-by-side
  layout); the crossfade itself keeps running, further dampened by the engine's existing viewport-width motion-
  strength attenuation (as every scene already is on narrow viewports).
- **Reduced motion:** `.education-track`/`.education-sticky` un-pin (`position:relative`, matching Hero/Contact/
  Experience's own reduced-motion override), and both chapters settle at the sitewide
  `.scroll-layer{opacity:1!important}` rule — both render at full, equal emphasis as a readable static fallback,
  rather than arbitrarily picking one chapter "active" with no scroll position to justify it.

### Stack: assembly motion and category emphasis (2026-10-02; extends the former hover-only tile)

Two independent motion channels on the same tile, deliberately kept on two different elements (see
`ARCHITECTURE.md`'s "Engineering Stack: assembly motion and category emphasis") so neither's reduced-motion override
can cancel the other.

- **Assembly (scroll-driven, `.stack-tile-motion`):** as each tile's own scroll scene crosses the viewport, it
  animates from a per-tile displaced/faded entry position to its resting position (zero displacement, full opacity)
  at the scene's midpoint, and back out on the way past — continuous and fully reversible with scroll direction, not
  a one-shot entrance. Displacement direction/magnitude and the opacity floor come from `stackTileMotion(tile)`
  (`src/stackLayout.ts`), a pure function of the tile's index/column only (never its name or category), drawn from a
  fixed 8-direction palette so assembly is varied per tile without being random or hand-authored per technology.
  Bounded to this codebase's existing structural-layer limits: ≤60 px travel per axis, opacity resting at 1 with a
  ≥0.2 floor, no scale or rotate (reserved for decorative-only layers elsewhere).
- **Category emphasis (hover/focus-driven, the outer `button`):** hovering or focusing any tile sets
  `data-emphasis="self"|"category"|"muted"` on every `<li>` from component state compared against `data-category`.
  The hovered tile inverts exactly as the former hover-only treatment did (`--dark` background, name shift, used-in
  swap); same-category tiles are left at full strength; every other tile's button drops to `opacity:.4`. Keyboard
  focus produces the identical state as pointer hover, so the effect works without a pointer.
- **Timing/easing:** assembly settles through the shared engine's smoothstep/damping sampling, same
  `cubic-bezier(0.16, 1, 0.3, 1)` as every other scene. Emphasis background/colour/name transitions stay at 350 ms
  primary ease; the muted-opacity transition is 350 ms primary ease; the category/reference swap is 300 ms.
- **Responsive:** above 1100 px a 12-column field, 801–1100 px a 7-column field, ≤800 px a 2-column field; spans for
  each come from `src/stackLayout.ts`. At ≤800 px the reference is hidden and the category stays; assembly motion and
  emphasis both still apply, unchanged from desktop.
- **Reduced motion:** assembly collapses through the sitewide `.scroll-layer{transform:none!important;
  opacity:1!important}` rule, so tiles render directly at their resting position with no entrance to skip. Category
  emphasis is on a different element and is untouched by that rule, so hover/focus highlighting (including the muted
  `opacity:.4` tier) keeps working identically under reduced motion. Tiles still do not open details on click.

### Custom cursor

- **Trigger / element:** pointer movement schedules positional writes to `.cursor`; document mouseover finds nearest `[data-cursor]` and updates label/active state.
- **Properties:** `--cursor-x/y` drives translation. The default 12 px circle becomes 62 px with an active label; width/height, left/top centering offsets, font size, colors, and blend mode change.
- **Timing/easing:** position follows pointer through the shared frame renderer without a dedicated cursor easing loop; shape/label dimensions transition over 200 ms primary ease. Color/blend-mode changes are not separately transitioned.
- **Responsive:** cursor hidden at ≤800 px and on coarse pointers; native body/button cursors return. Label listener checks fine-pointer capability when mounted; the engine also responds to capability changes.
- **Reduced motion:** cursor still follows and can display contextual labels on supported desktop layouts; shape transitions become near-instant. This baseline does **not** fully remove complex cursor behavior. Engine magnetic/depth contributions are gated off.

Close buttons additionally use `.magnetic-anchor` as a stable pointer reference and `--mag-x/y` translation at 12% of pointer displacement, with a 350 ms primary-ease CSS transition. Reduced motion sets target offsets to zero. Contact email and the optional booking action have magnetic styling but do not match the current handler selector; they have no implemented magnetic tracking. Both contact actions reuse y `[95, 0, -145]` and opacity `[0.05, 1, 0.18]` scene keyframes with the existing CSS padding hover transition, responsive strength and reduced-motion overrides; the two-column/stacked wrapper owns layout only.

### Hero: portrait parallax (2026-10-04; replaces the former node-visual "Hero orbit")

There is **no `.hero-orbit`/`.hero-art` component/selector or node illustration** as of this change. Hero's visual
is now a portrait photograph with two geometric backing plates and a metadata stack, per an explicit, pixel-
annotated design reference — see `ARCHITECTURE.md`'s "Hero: portrait composition" for the full structural rationale.

- **Trigger / elements:** hero scene scroll (and, for the portrait image specifically, fine-pointer position via
  `data-pointer="8"`) independently affects three layers — `.hero-portrait-image`, `.hero-portrait-plate-top`, and
  `.hero-portrait-plate-bottom` — plus the `.hero-eyebrow`/`.hero-title`/`.hero-summary` copy block and the
  `.hero-meta` metadata stack, each its own `data-scroll-layer`.
- **Properties:** every layer's travel/opacity stays within this codebase's ordinary structural bounds (≤60 px, no
  scale or rotate, opacity resting at `1` with a readable floor) — unlike the old orbit, nothing here uses rotation
  or scale, both because the generic motion-policy tests forbid them on structural layers and because rotating or
  scaling a human photograph would read as distortion, not restraint. The two backing plates use slightly different
  `data-y`/`data-phase` values than the portrait image itself, so they visibly separate from it as the section
  scrolls — the "subtle independent movement of backing plates" the design brief asked for — rather than the three
  elements moving as one rigid block.
- **Timing/easing:** smoothstep keyframes through the same shared engine as every other scene, `data-damping="0.13"`
  on the portrait image; no time-driven looping animation, no new scheduler.
- **Responsive:** the portrait/metadata zones are absolutely positioned at desktop/tablet widths (reusing the same
  "text flows normally, art floats independently" layering the old `.hero-art` established) and switch to normal
  document flow at ≤800 px, stacking below the copy. Hero's pin shell itself un-pins at ≤800 px
  (`.hero-sticky{position:relative;height:auto;overflow:visible}`) because the new stacked mobile composition does
  not reliably fit a single clipped viewport height — the same accommodation Experience's and Education's own
  mobile overrides already make, not a new pattern.
- **Reduced motion:** every layer's transform is neutralized and opacity forced to `1` by the same sitewide
  `.scroll-layer{transform:none!important;opacity:1!important}` rule every other scene layer already uses; no
  Hero-specific reduced-motion code was added. Pointer depth on the portrait image is disabled the same way fine-
  pointer-gated effects already are elsewhere.

### Modal transitions

- **Trigger / element:** section-local selection controls `.overlay.open` on each reusable, body-portaled `DetailOverlay`.
- **Properties:** fixed overlay translates from `translateY(101%)` to rest; visibility changes. Body class controls background scroll lock; nested `.overlay-scroll` remains native-scrollable.
- **Timing/easing:** transform/visibility transition 800 ms primary ease. Close focus is scheduled at 350 ms using `motion.normal`; this is not synchronized to completion of the 800 ms entrance.
- **Responsive:** overlay/bar/detail content reflows at ≤800 px; Close remains available. Project chapters and internal layers continue using the nested scene engine. `.detail-body` is a two-column CSS Grid (sticky chapter rail + content) at desktop widths and ≤1024 px, and becomes a single-column block at ≤800 px; as of this change the chapter indicator (`.case-progress`) is no longer hidden on narrow screens — it becomes a horizontal, sticky-positioned, scrollable row of the same chapter markers instead, so wayfinding remains available on mobile (previously `display:none` below 800 px).
- **Reduced motion:** entrance/exit transitions become near-instant, but state changes, body locking, focus timer, and Close/Escape handlers still operate.

Closing clears selected content immediately; the container transition continues without retaining its outgoing detail content. No backdrop dismissal or focus trap is implemented. These are recorded limitations, not authorization to replace the modal system.

### Scroll cue

- **Trigger / element:** hero scroll drives `.scroll-cue`; activating its native anchor navigates to `#work`.
- **Properties:** y `[-10, 0, -110]` px and opacity `[1, 1, 0]`, with phase `.03`.
- **Timing/easing:** shared smoothstep/damping (default `.18`); native anchor scrolling follows browser CSS smooth-scroll behavior, with no custom duration. The arrow has no independent bounce animation.
- **Responsive:** cue repositions on narrow layouts and uses attenuated scene motion; it remains a link.
- **Reduced motion:** scene translation disappears, opacity becomes one, and anchor scrolling uses `auto`.

Other existing motion includes layered section headings/About copy, contact grid/headline/supporting links, navigation hover/header treatment, and architecture-node activation. These reuse scene variables or CSS transitions rather than separate animation engines. Active architecture buttons move 5 px upward with a 300 ms primary-ease transition; reduced motion minimizes duration but does not remove that non-scene button transform.

## Transform Ownership

**A given element's `transform` must have one clear owner.** Multiple input systems may supply independent variables to that owner's composed expression; they must not independently overwrite the property.

| Element | Existing transform owner / contributors |
| --- | --- |
| Generic `.scroll-layer` | CSS composition of scene, pointer, hover, and reveal variables supplied by their established owners |
| `.project-copy` | Specialized CSS composition of scene and inherited project-pointer offsets |
| `.project-art-layer` | Specialized CSS composition of scene, pointer/project offsets, and hover scale |
| `.project-title` | Child-level CSS hover transform, distinct from the copy wrapper's scene transform |
| Service arrow | CSS expression combining scene translation with service-hover variables |
| `.contact-action.scroll-layer` | CSS expression combining scene and magnetic variables; current pointer selector does not activate email magnetism |
| Close `.magnetic` | CSS translation consuming engine magnetic variables |
| `.cursor` | CSS translation consuming engine cursor variables; label/shape state belongs to `Cursor`/CSS |
| `.overlay` | CSS open/closed transition; internal detail layers have their own scene owners |
| Progress bar / chapter markers | Their respective CSS expressions, fed by document progress or chapter state |

Independent writes to the same transform can erase translation/scale components, snap between states, produce inconsistent hover/scroll behavior, and cause visible jitter. Feedback loops arise when a rendered transform changes geometry that is then used to calculate the next transform. The current scroll engine avoids that by measuring layout references; pointer-anchor rectangle reads serve a different purpose.

Do not add `style.transform` writers or libraries that seize an existing owner without an explicitly authorized architectural change. CSS reduced-motion overrides intentionally supersede normal composition as a capability fallback, not a competing scheduler.

## Scroll Motion Rules

Future scroll motion must:

- Use the existing coordinated animation loop where appropriate; do not create independent per-component scroll loops.
- Preserve native browser wheel, trackpad, touch, keyboard, scrollbar, and nested-overlay scrolling. No scroll hijacking.
  **Narrow, explicit exception (2026-10-04, user-authorized):** a single `wheel` listener dampens only the portion
  of a wheel event's delta that exceeds a fixed pass-through threshold (160px) — see "Extreme wheel input dampening"
  below. Every wheel event at or under that threshold, and every non-wheel input (keyboard, Page Up/Down, Home/End,
  scrollbar dragging, touch), remains fully native and untouched. This is not scroll hijacking: it never replaces
  native scrolling with a custom engine, never adds artificial delay, and never forces section-by-section or
  snapped scrolling.
- Use cached stable geometry and native `window.scrollY`/root `scrollTop`; avoid transformed geometry as scene-progress truth and never create transform feedback loops.
- Avoid continuously querying layout unnecessarily or doing expensive measurement inside wheel/scroll handlers.
- Preserve read → calculate → write batching and geometry invalidation rather than mixing mutations and measurements.
- Distinguish decorative-layer interpolation from native scroll position; do not smooth or control the latter.

Current geometry is refreshed through initial measurement, observed size/layout changes, viewport/orientation, relevant child mutations, font events, and capability changes. The active pointer anchor may still be read during a frame. These existing paths must be understood before extending them.

## Parallax Rules

The baseline does not use a global “depth tier” or translateZ model. Depth values are per-layer keyframes, phase, strength, and pointer amplitude, composed with CSS perspective (`1200px`) and different movement/scale responses. Preserve those distinctions rather than applying a uniform offset to every layer.

Representative configured desktop values (before damping, additional reveal/hover/pointer contributions, and viewport attenuation):

| Layer | Existing travel / scale |
| --- | --- |
| Hero grid | y `[-45, 0, 85]` px; scale `[1.025, 1, .99]`; `data-damping="0.08"` (2026-10-04: slowed, travel unchanged) |
| Hero headline / summary | y `[0, 0, -48]` / `[0, 0, -60]` px (structural; headline widened from -40 to -48 on 2026-10-04; both reduced on 2026-10-02 from `[24, 0, -150]` / `[38, 0, -190]`) |
| Hero portrait / plates / meta | portrait y `[-30, 0, 38]` px (2026-10-04: widened from `[-18, 0, 24]` for "stronger independent movement"), `data-damping="0.14"`; plates y `[-16,0,22]`/`[18,0,-14]` at `data-damping="0.09"`/`"0.1"` (slower, so they visibly lag the portrait); meta y `[0,0,-24]` at `data-damping="0.19"` |
| Project art | y `[±44]`, `[±52]`, `[±48]`, `[±58]` px by row, with middle zero; x `[22, 0, -18]`; scale `[1.1, 1.04, 1.1]`; `data-damping="0.16"` (2026-10-04) |
| Project backdrop / foreground | y amplitude `0.35 ×` art travel, opposite direction / `1.35 ×` art travel; `data-damping="0.09"`/`"0.1"` (2026-10-04, slower/decorative) |
| Contact grid / headline | y `[-80, 0, 90]` px (decorative, `data-damping="0.08"` as of 2026-10-04) / `[28, 0, -24]` px (structural, widened from `[24,0,-20]` on 2026-10-04; was `[145, 0, -105]` with scale and opacity before 2026-10-02) |
| Other structural layers | section headings, kicker and note, project index/copy/meta, About and service labels: at most 18 px y as of 2026-10-04 (was 14px); service arrow: up to 8 px x; hero label 24 px y; contact meta/actions/links: up to 28 px y. Each role now also carries its own `data-damping` (≈0.12 for labels/kicker, ≈0.16 for headings, ≈0.19–0.22 for body copy) — see "Differential parallax depth" above. None scale, rotate or fade with scroll. Experience is excluded: it uses its own discrete, non-scene transition system, not this scroll-linked travel table. |
| Detail art | y `[90, 0, -90]` px; scale `[1.08, 1, 1.06]` |

**Maximum movement:** there is no global runtime travel cap. The largest absolute configured structural scroll y value is 60 px (hero summary) and x is 8 px; the largest decorative values are hero art (y 115 px, x 42 px) and the scroll cue (y 110 px). Before 2026-10-02 the largest structural values were 190 px (hero summary) and 34 px. Current configured rotation reaches 1.4 degrees and scale keyframes span `.94`–`1.1`; hover can additionally multiply project art by `1.04`. These describe this markup, not combined screen-space bounds or a new mandated limit. The 2026-10-04 differential-depth refinement widened several structural values toward this existing 60px ceiling (never past it) and introduced a `data-damping` role convention (`0.08`–`0.22`) across almost every layer in this table; see "Differential parallax depth" above for the full convention.

Within a project row, normalized pointer offsets are approximately ±5 px x and ±4 px y at row edges. Hero pointer amplitude 18 yields approximately ±9 px per viewport axis at full strength. Magnetic displacement is proportional, without a global clamp. Do not describe these as universal hard limits.

Desktop retains sticky storytelling and layered composition. Mobile/narrow layouts attenuate scene deviations, remove project sticking at ≤800 px, and preserve usable content without hover. Reduced motion neutralizes scene transforms and removes extended sticky tracks. Future travel changes must be justified per layer and verified for clipping, stacking, readability, and boundary stability; do not impose a replacement engine or increase all amplitudes indiscriminately.

## Animation Rules

Prefer the existing easing language and established durations. New motion must communicate entry/exit, importance, relationship, depth, or action feedback. Avoid bounce, elastic effects, random rotations, excessive scaling, unnecessary blur, and decorative motion with no semantic purpose.

Do not replace scene sampling/damping with additional easing layers as an unexamined fix. Preserve transform ownership and geometry determinism first. The `motion` duration object in `App.tsx` is not a centralized driver for every CSS transition; its `normal` value currently supplies the modal focus timer.

## Performance Rules

- Prefer transform/opacity for continuous visual motion. Avoid introducing layout-triggering top/left/margin/padding/size animation in scroll-linked work.
- Existing discrete hover padding and cursor-size/centering transitions are recorded behavior, not a template for continuous layout animation or authorization for unrelated cleanup.
- Reuse cached geometry, WeakMap layer/write caches, and batched writes. Avoid unnecessary DOM reads/writes and repeated scene discovery.
- Use the guarded requestAnimationFrame scheduler; render on requested input and while visual layers settle, not through unnecessary always-running loops.
- Preserve observer/listener/frame cleanup and StrictMode safety. Do not introduce multiple competing loops after mounting or overlay reopening.
- Limit `will-change` to necessary layers. Current hints target project art and hero art/grid, contact grid, and detail art; do not promote the entire page.

Performance and physical-input stability require browser observation; source correctness, builds, or screenshots alone do not prove them.

## Reduced Motion

For future additions, `prefers-reduced-motion: reduce` requires removing or minimizing scroll-linked transforms, removing complex cursor embellishments, disabling unnecessary animation, and preserving usability and information hierarchy.

**Current implementation:** both engine and CSS handle the preference, including runtime changes for the engine. Scenes become neutral, content remains visible, anchor scrolling becomes immediate, sticky extensions are removed, and engine pointer depth/magnetism is disabled. Document progress and detail chapter state remain meaningful.

**Current gap:** the desktop cursor still follows and changes contextual state; only its transition duration is minimized. Some non-scene hover states remain instantaneous transforms or padding changes. The modal focus timer also remains 350 ms. Do not claim a completely static cursor or fully motion-free baseline, and do not silently implement those improvements during documentation work. Any extension must respect existing fallbacks and avoid adding complex reduced-motion effects; remediation of current gaps follows the protected-change protocol.

## Motion Change Protocol

Before modifying a protected motion system, document:

1. Existing behavior, including relevant responsive/reduced-motion fallbacks.
2. Desired behavior and intentional differences.
3. Reason for the change and why extension is necessary.
4. Affected elements and stable reference containers.
5. Transform ownership, variable contributors, and how composition remains conflict-free.
6. Performance implications: geometry reads, invalidation, writes, scheduling, subscriptions, and cleanup.
7. Regression tests and actual results after implementation.

Follow `CHANGE_PROTOCOL.md` and `REGRESSION_CHECKLIST.md`. Obtain required approval before replacing an owner/system or materially changing protected behavior. Verify slow/fast trackpad input, stepped/rapid physical wheel input, alternating direction, repeated boundaries, hover while scrolling, and detail open/close across relevant viewport and preference combinations. Distinguish simulation from hardware tests and record unavailable verification honestly.

Update motion/architecture documentation and the changelog for authorized meaningful changes. Do not declare completion with unintended lost depth, overwritten hover, jitter, scroll trapping, or broken reduced-motion behavior.
