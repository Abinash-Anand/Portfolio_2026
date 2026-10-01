# Motion System

This is a source-based record of the existing motion implementation in `src/App.tsx`, `src/useParallaxEngine.ts`, and `src/index.css`. It does not authorize changes, introduce a new engine, or claim browser validation. Read it with `STABLE_BASELINE.md`, `ARCHITECTURE.md`, and the stability/change contracts.

## Motion Philosophy

Motion should communicate hierarchy, depth, interaction, continuity, and technical sophistication. It must not exist merely because CSS allows it. Preserve the portfolio's restrained editorial character: reveal what matters, distinguish layers, connect section transitions, and clarify available actions rather than adding spectacle.

This philosophy is a constraint on future work. The implementation details below describe what exists, including limitations, not a claim that every effect fully meets that ideal.

## Current Motion Systems

### Shared timing and capability rules

- Primary CSS ease: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`. `--ease-secondary: cubic-bezier(0.4, 0, 0.2, 1)` is declared but not referenced by current transition rules. Transitions without an explicit easing use the CSS default `ease`.
- Scene keyframes use smoothstep sampling and elapsed-time-adjusted damping, not a fixed CSS duration. Default damping is `0.18`; explicit current values include `0.11`, `0.13`, `0.14`, and `0.15`.
- Engine strength is `1` at ≥1100 px, `0.66` at ≥600 and <1100 px, and `0.26` below 600 px. The separate CSS layout breakpoint is ≤800 px.
- Fine-pointer effects require a fine pointer; engine pointer depth/magnetism additionally requires no reduced-motion preference. Narrow layouts and coarse pointers hide the custom cursor.
- Reduced-motion CSS forces animation/transition durations to `.01ms`, disables smooth anchor scrolling, neutralizes scene transforms/blur, and exposes scene/reveal content. This does not remove every non-scene hover offset or the cursor itself.

**Configured versus effective opacity:** the engine writes `--scene-opacity` for layers, but later normal-motion CSS rules fix the own opacity of `.hero-grid` at `.24`, `.hero-art` at `.75` (`.45` at ≤800 px), `.contact-grid` at `.22`, and `.project-visual-backdrop` at `.3`. Those elements still consume scene transforms; their own opacity does not follow the generic scene expression. Parent opacity/masks may further affect appearance. Reduced-motion `!important` rules force their layer opacity to one. Treat the markup keyframes as configuration, not proof that the cascade applies every configured property.

### Page scroll progress

- **Trigger / element:** native document scrolling; `.scroll-progress`, a fixed 2 px bar.
- **Properties:** engine writes root `--progress = clamp(scrollY / pageMax)`; CSS owns `scaleX`, with left transform origin. `pageMax` is cached document height minus viewport height; zero range produces zero progress.
- **Timing/easing:** updated through the shared requestAnimationFrame render; no dedicated transition or visual damping on the bar.
- **Responsive:** same document-based indicator across layouts, with range recomputed on geometry invalidation. Overlay scrolling does not drive its value.
- **Reduced motion:** remains functional; it is not a `.scroll-layer` and its informative scale is not disabled.

Project details have a separate five-chapter indicator: an overlay-rooted IntersectionObserver selects the active chapter. Marker color, 4 px horizontal shift, and line scale (`.35` → `1`) transition over 350 ms with the primary ease. It is hidden at ≤800 px; reduced motion makes transitions near-instant without removing chapter state.

### Section reveal

- **Trigger / elements:** engine IntersectionObserver at threshold `0.12` observes `.reveal`, adds `.is-visible` once, then unobserves it. These include section headers, project rows, stack groups, service rows, and About copy.
- **Properties:** header/About `--reveal-opacity` and `--reveal-y` transition from invisible/26 px to visible/zero. Row/group reveals animate opacity. Scene-layer opacity is composed with reveal opacity where applicable.
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
- **Responsive:** rows shorten/reflow at ≤800 px; no separate touch animation is installed. Tap opens the existing capability detail without requiring hover.
- **Reduced motion:** transitions become near-instant, and the arrow's scene-layer transform is suppressed. The non-scene background can still change between its hover states.

### Experience hover

- **Trigger / elements:** `.experience-row:hover`, its internal scroll layers, and arrow.
- **Properties:** lighter background, inherited `--hover-x: 12px` on scroll-layer content; arrow appears and moves `(3px, -3px)`.
- **Timing/easing:** background transition 350 ms default ease; arrow transform/opacity 200 ms default ease. The inherited hover variable has no dedicated interpolation declaration, so do not describe its offset as a separate eased animation. Padding has a transition declaration but the hover rule does not change padding.
- **Responsive:** row reflows at ≤800 px and its arrow is hidden; detail opening remains.
- **Reduced motion:** scene-layer content translation is disabled; arrow transition is near-instant. A non-scene arrow offset can remain on desktop hover.

### Stack hover

- **Trigger / elements:** technology button hover or `:focus-visible`, including its “Used in” reference.
- **Properties:** left padding becomes 8 px; reference opacity increases and its `translateX(-6px)` returns to rest. Buttons do not open details on click.
- **Timing/easing:** 300 ms primary ease for padding and reference transition.
- **Responsive:** ≤800 px uses two columns and hides reference text, including on focus/hover.
- **Reduced motion:** reveal-descendant transform/opacity overrides expose reference state where CSS displays it; transitions are near-instant. The padding state can still change.

### Custom cursor

- **Trigger / element:** pointer movement schedules positional writes to `.cursor`; document mouseover finds nearest `[data-cursor]` and updates label/active state.
- **Properties:** `--cursor-x/y` drives translation. The default 12 px circle becomes 62 px with an active label; width/height, left/top centering offsets, font size, colors, and blend mode change.
- **Timing/easing:** position follows pointer through the shared frame renderer without a dedicated cursor easing loop; shape/label dimensions transition over 200 ms primary ease. Color/blend-mode changes are not separately transitioned.
- **Responsive:** cursor hidden at ≤800 px and on coarse pointers; native body/button cursors return. Label listener checks fine-pointer capability when mounted; the engine also responds to capability changes.
- **Reduced motion:** cursor still follows and can display contextual labels on supported desktop layouts; shape transitions become near-instant. This baseline does **not** fully remove complex cursor behavior. Engine magnetic/depth contributions are gated off.

Close buttons additionally use `.magnetic-anchor` as a stable pointer reference and `--mag-x/y` translation at 12% of pointer displacement, with a 350 ms primary-ease CSS transition. Reduced motion sets target offsets to zero. Contact email and the optional booking action have magnetic styling but do not match the current handler selector; they have no implemented magnetic tracking. Both contact actions reuse y `[95, 0, -145]` and opacity `[0.05, 1, 0.18]` scene keyframes with the existing CSS padding hover transition, responsive strength and reduced-motion overrides; the two-column/stacked wrapper owns layout only.

### Hero orbit (current equivalent: layered node geometry)

There is **no `.hero-orbit` component/selector, autonomous orbit loop, or orbit keyframe animation** in the inspected version. The existing circular node illustration is `.hero-art` containing `TechnicalVisual(kind="nodes")`.

- **Trigger / element:** hero scene scroll and fine-pointer position affect the art wrapper; individual nodes do not independently orbit.
- **Properties:** y `[-70, 0, 115]` px, x `[42, 0, -36]` px, scale `[1.06, 1, .96]`, rotation `[-1.2, 0, 1.4]` degrees; `data-pointer="18"` adds viewport-relative pointer depth. Opacity keyframes `[.48, .78, .38]` are configured/written, but later CSS fixes the art's own opacity at `.75` (`.45` at ≤800 px) under normal motion.
- **Timing/easing:** smoothstep keyframes and damping `.11`; no time-driven looping animation.
- **Responsive:** art resizes/repositions at ≤800 px; engine strength attenuates travel. Hero track is 135svh desktop and 112svh narrow, with a 100svh sticky interior under normal motion.
- **Reduced motion:** art transform/blur removed, opacity one, pointer depth disabled, and extended hero track/sticking removed.

### Modal transitions

- **Trigger / element:** section-local selection controls `.overlay.open` on each reusable, body-portaled `DetailOverlay`.
- **Properties:** fixed overlay translates from `translateY(101%)` to rest; visibility changes. Body class controls background scroll lock; nested `.overlay-scroll` remains native-scrollable.
- **Timing/easing:** transform/visibility transition 800 ms primary ease. Close focus is scheduled at 350 ms using `motion.normal`; this is not synchronized to completion of the 800 ms entrance.
- **Responsive:** overlay/bar/detail content reflows at ≤800 px; Close remains available. Project chapters and internal layers continue using the nested scene engine; the chapter indicator is hidden on narrow screens.
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
| Hero grid | y `[-45, 0, 85]` px; scale `[1.025, 1, .99]` |
| Hero headline / summary | y `[24, 0, -150]` / `[38, 0, -190]` px |
| Project art | y `[±44]`, `[±52]`, `[±48]`, `[±58]` px by row, with middle zero; x `[22, 0, -18]`; scale `[1.1, 1.04, 1.1]` |
| Project backdrop / foreground | y amplitude `0.35 ×` art travel, opposite direction / `1.35 ×` art travel |
| Contact grid / headline | y `[-80, 0, 90]` / `[145, 0, -105]` px |
| Detail art | y `[90, 0, -90]` px; scale `[1.08, 1, 1.06]` |

**Maximum movement:** there is no global runtime travel cap. The largest absolute configured scroll y value is 190 px (hero summary); largest absolute scroll x is 42 px (hero art). Current configured rotation reaches 1.4 degrees and scale keyframes span `.94`–`1.1`; hover can additionally multiply project art by `1.04`. These describe this markup, not combined screen-space bounds or a new mandated limit.

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
