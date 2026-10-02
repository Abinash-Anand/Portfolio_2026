# Regression Checklist

Use this manual checklist after meaningful changes, alongside `STABLE_BASELINE.md`, `STABILITY_CONTRACT.md`, and `MOTION_SYSTEM.md`. Compare with the protected implementation rather than assuming every desired behavior already exists. This document records no completed tests.

Record before testing:

- Change / commit: __________
- Tester / date: __________
- Browser / version / OS: __________
- Device / viewport width × height / zoom: __________
- Input: physical trackpad / physical mouse wheel / touch / keyboard / simulation (specify): __________
- Motion preference: normal / reduced: __________
- Approved behavior differences and affected systems: __________

Check a box only after verification. Record failures, known baseline limitations, not-applicable checks with reasons, and unperformed checks separately; do not treat an unavailable test as passed. Repeat relevant checks across the input, viewport, and preference combinations below. Baseline limitations are not permission to introduce new regressions or silently fix unrelated behavior.

## Navigation

- [ ] Persistent navigation remains at the top while scrolling (implemented with `position: fixed`, not CSS sticky).
- [ ] Scrolling beyond 24 px applies the existing header background/blur/border treatment.
- [ ] Work navigates to `#work` correctly on layouts where the link is displayed.
- [ ] About navigates to `#about` correctly.
- [ ] Experience navigates to `#experience` correctly.
- [ ] Contact navigates to the dark `#contact` section; it does not open a modal.
- [ ] Active-link indication updates where a matching primary link exists; note the baseline's initial Work state and sections without matching links.
- [ ] Wordmark and footer Back to top return to `#top`.
- [ ] Keyboard activation and focus outlines remain usable; hash navigation preserves native scrolling.
- [ ] At ≤800 px, wordmark and Contact remain reachable while primary links are intentionally hidden; do not expect a hamburger menu.

## Hero

- [ ] Headline renders all existing lines without clipping or unexpected wrapping.
- [ ] Inter actually renders at weights 400/500/600 after font loading, including when Google Fonts hosts are blocked; no external font dependency or missing local font request remains.
- [ ] Role, location, summary, technical node art, and generous spacing retain their hierarchy.
- [ ] Desktop hero track/sticky interior and the projects' emergence preserve the baseline composition.
- [ ] Grid, headline, supporting text, and technical art retain distinct scroll responses; no unintended corrections or jitter appear.
- [ ] Fine-pointer art response works under normal motion; there is no independent orbit animation to verify.
- [ ] Scroll cue remains visible/usable as appropriate to scene progress and navigates to Work.
- [ ] Narrow-screen and reduced-motion hero layouts match their documented fallbacks.

## Projects

For each project, perform every check below on a normal-motion pointer desktop, then repeat relevant opening/content/closing checks on narrow/touch and reduced-motion layouts. “Image visual” means the existing CSS technical art, not a photographic asset. On mobile, descriptions/CTAs are always visible; hover is not required.

### Code Sentinel

- [ ] Row renders in the correct order with matching title, metadata, and copy.
- [ ] Hover background/title/description/CTA/metadata behavior works.
- [ ] Node technical visual and its internal depth render correctly.
- [ ] Art hover scale works and composes with scroll/pointer movement.
- [ ] Click or keyboard activation opens the Code Sentinel detail.
- [ ] Detail content, architecture nodes, and chapter progression match the selected record.
- [ ] Close and Escape dismiss the modal correctly without losing page position.

### Facility Importer

- [ ] Row renders in the correct order with matching title, metadata, and copy.
- [ ] Hover background/title/description/CTA/metadata behavior works.
- [ ] Pipeline technical visual and its internal depth render correctly.
- [ ] Art hover scale works and composes with scroll/pointer movement.
- [ ] Click or keyboard activation opens the Facility Importer detail.
- [ ] Detail content, architecture nodes, and chapter progression match the selected record.
- [ ] Close and Escape dismiss the modal correctly without losing page position.

### Northstar

- [ ] Row renders in the correct order with matching title, metadata, and copy.
- [ ] Hover background/title/description/CTA/metadata behavior works.
- [ ] Radar technical visual and its internal depth render correctly.
- [ ] Art hover scale works and composes with scroll/pointer movement.
- [ ] Click or keyboard activation opens the Northstar detail.
- [ ] Detail content, architecture nodes, and chapter progression match the selected record.
- [ ] Close and Escape dismiss the modal correctly without losing page position.

### VC Brain

- [ ] Row renders in the correct order with matching title, metadata, and copy.
- [ ] Hover background/title/description/CTA/metadata behavior works.
- [ ] Retrieval technical visual and its internal depth render correctly.
- [ ] Art hover scale works and composes with scroll/pointer movement.
- [ ] Click or keyboard activation opens the VC Brain detail.
- [ ] Detail content, architecture nodes, and chapter progression match the selected record.
- [ ] Close and Escape dismiss the modal correctly without losing page position.

Additional shared checks:

- [ ] Hover a project while scrolling and reversing direction; copy/art motion remains composed rather than overwritten.
- [ ] Desktop rows stick within their tracks; ≤800 px rows no longer stick and remain directly tappable.
- [ ] Architecture nodes activate by hover, focus, and click and update explanatory text.
- [ ] Desktop chapter markers follow Overview → Problem → Architecture → Implementation → Result in a sticky rail beside the content grid; at ≤800 px they become a horizontal, sticky, scrollable indicator instead of disappearing.
- [ ] Document progress and detail chapter state remain separate during nested scrolling.

### Case-study content (additive, present only when a project's portfolio.json supplies caseStudyContent)

Each chapter answers one question (shown as a small `caseStudyLabels.questions[n]` prompt when present); verify a rich project (e.g. SynthGraph's real repository data, or Northstar in the dev fixture) shows the right content in the right chapter, never duplicated across chapters:

- [ ] **01 Overview**: existing title/description, plus a two-up evidence row (category, role, data-driven captions) and overview/role prose. No arbitrary empty gap before the evidence row.
- [ ] **02 Problem**: `narrative.problem` as the chapter statement, problem prose, then a two-column split row (context beside constraints; falls back to `narrative.constraints` when `constraints` is absent, and collapses to one column when only one side has content — no empty second column).
- [ ] **03 Architecture**: `narrative.decision` framing, the existing `ArchitectureDiagram` (hover/focus/click activation unchanged), then any graph-shaped visuals rendered as interactive `CaseStudyDiagram`s (hover/focus/click a node: it inverts, unrelated nodes mute, its connections highlight, its responsibility text appears — verify with a real pointer hover and with keyboard Tab, not just `.focus()`), any remaining visual kinds via the existing static block, then architecture prose. **No technical-decisions list appears in this chapter** (moved to Implementation — verify it is actually absent here, not just unlabeled).
- [ ] **04 Implementation**: implementation prose, the existing implementation code/summary, a Technical Surface list (from `metadata.stack`, thin-ruled, no boxes), and the full technical-decisions list (numbered units, each with rationale/alternatives/implementation/result/learning where supplied) — this is where technical decisions now live.
- [ ] **05 Result**: existing large result statement (the sole place `narrative.result` appears), a non-card evidence grid (from `metadata.highlights`; a leading numeral/stat renders large with its remainder as a caption, a plain sentence renders as normal body text — check this split visually, not just by element count), then results (summary/metrics/links), learnings, and top-level links.
- [ ] A project without `caseStudyContent` (e.g. Eber, Code Sentinel) renders no `cs-*` elements from `caseStudyContent` itself, but — since `caseStudyLabels` is document-level chrome, not gated on a project's own case study — the evidence row, Technical Surface, and evidence grid still render from baseline `metadata` fields alone; confirm this is the intended, correct elevation of the universal fallback rather than a leak of rich-project chrome onto bare projects.
- [ ] A project with a sparse/`not-documented` case study (e.g. Facility Importer) shows the data-driven "no verified outcome" copy, not an invented result, and no empty section headings for absent fields.
- [ ] The chapter rail ("01 OVERVIEW" … "05 RESULT") stays visible throughout scroll as a sticky grid column beside the content (not viewport-fixed), its active item advances naturally with the IntersectionObserver as each chapter centers, and it remains purely informational (not clickable). The five `data-story-step` anchors, nested overlay scrolling, Close/Escape, and focus restoration all work exactly as before.
- [ ] No case-study block overlaps the rail at any width — this should no longer require per-block margin/grid-column fixes, since the rail/content relationship is now a single CSS Grid with a sticky column rather than a fixed-position rail requiring ad-hoc indentation.
- [ ] At ≤800 px: the rail becomes a horizontal sticky scrollable indicator (not hidden), the two-column Problem split and the evidence grid collapse to one column, technical-decision units stack vertically, and architecture diagram node flows reflow vertically — with no horizontal page overflow at any point.
- [ ] Vertical rhythm between chapters and within each chapter looks intentional, not arbitrary — no very large unexplained empty gaps between a chapter's label/statement/body/evidence.

## Experience

Experience (2026-10-02) is a scroll-stepped sticky timeline, not a row list — see `ARCHITECTURE.md`'s "Experience:
scroll-stepped sticky timeline" and `MOTION_SYSTEM.md`'s matching entry for the full mechanism.

- [ ] On entering the section (desktop, ≥801 px), the latest/first entry (by data order) is active by default: its
      year is large/dark/centered in the selector window, and its period/company/role/tech/description render in
      the right-hand panel.
- [ ] Scrolling down through the section advances the active entry forward through the data in order; scrolling back
      up reverses it. Each entry's year becomes centered/large/dark and its content replaces the previous entry's.
      Verify with slow, fast, and reversed-direction scrolling (stepped wheel input, alternating directions,
      repeated crossings of each step boundary) — not just one pass in one direction.
- [ ] The active year sits large/dark/centered between two fixed thin rules; the previous/next years are visible
      above/below it, smaller and lower-opacity; years not adjacent to active are clipped by the selector window,
      not rendered oversized or overlapping.
- [ ] Clicking any year in the selector jumps directly to that entry (no scroll required) and the jump does not get
      reverted by the next scroll-triggered check (a regression caught and fixed during this feature's own
      verification: a click that only sets state without moving scroll position gets immediately overridden back by
      the still-active `IntersectionObserver`).
- [ ] The sticky panel is pinned (does not move with scroll) while stepping through all entries, and releases
      cleanly into normal document flow once the section's full scroll range is exhausted — no visual jump, jitter,
      or stuck/trapped scrolling when entering or leaving the section.
- [ ] The "Read full story" control in the active panel opens the same detail overlay (and, when present, the same
      `story.paragraphs` body copy) this entry has always had; Close/Escape and focus restoration work exactly as
      for Projects/Services. This is the one interaction carried over unchanged from the previous row-based design.
- [ ] When an entry supplies the optional `highlights`, they render as a short evidence row (not a card) beneath the
      description; an entry without `highlights` or without `story` renders identically minus that block (no empty
      block, no stray rule).
- [ ] No horizontal overflow at any width; no overlap between the selector column and the content column.
- [ ] At ≤800 px: the sticky pin and scroll-stepping are both disabled (confirm `.experience-sticky` computes to
      `position: relative`, not `sticky`); the year selector becomes a horizontal row above a full-width content
      panel; tapping a year switches the panel's content; the active year is visually distinguished (not just by a
      color most users won't notice — check for a visible weight/underline difference too).
- [ ] Keyboard: `Tab` reaches each year button and the "Read full story" link in document order; `Enter`/`Space`
      activates them; a visible `:focus-visible` outline appears on the year buttons.
- [ ] Reduced motion: the sticky pin is removed (`.experience-track` height becomes auto, `.experience-sticky`
      becomes `position: relative`) exactly like Hero/Contact already do; the active entry's content is always at
      `opacity: 1` (never caught mid-transition at a lower opacity) whether reached by scroll or by clicking a year.

## Stack

- [ ] Every technology in the data renders exactly once as a brick-wall tile, in data order, numbered from 01, with its category label; the field has no gaps, and every row fills edge to edge (12 columns above 1100 px, 7 from 801 to 1100 px, 2 at ≤800 px).
- [ ] Desktop hover and visible keyboard focus invert the tile to the dark surface, shift the name 6 px and replace the category with the correct “Used in” text; Tab order follows data order.
- [ ] Tile text never clips or leaves its tile, long names get wider tiles, and there is no horizontal page overflow at 1920/1440/1280/1024/768/390/~360 px.
- [ ] Narrow layout (≤800 px) keeps the category label and intentionally hides the reference text.
- [ ] After any change to `usedIn` text or to the stack data order, the longest “Used in” value fits its tile without touching the skill name at 1920, 1440, 1280, 1101, 1100, 1024 and 801 px, and no tile row is a single full-width tile.
- [ ] Changing the stack in `portfolio.json` (add, remove, reorder, recategorize, many skills) changes the wall with no component change.
- [ ] No unintended click action or modal has been added to the informational stack tiles.
- [ ] Tiles reveal once on entering the viewport and stay visible; reduced motion shows them immediately; an idle tile shows only its category (no "Used in" label over it), and hover/focus swaps category for reference instantly.
- [ ] Scrolling the section into view assembles each tile from a displaced, faded position to its exact final brick-wall position with no layout shift; scrolling back up reverses the assembly; stepped/alternating-direction scrolling never leaves a tile stuck mid-transition or snaps it instantly.
- [ ] The direction/magnitude each tile assembles from is consistent across reloads for the same data (deterministic, not random) and does not depend on technology name or category.
- [ ] Hovering or focusing a tile emphasizes it (existing inverted treatment), leaves same-category tiles at full strength, and visibly mutes every other category's tiles; moving focus/hover away clears all emphasis. Keyboard `Tab` focus produces the same three-tier effect as mouse hover.
- [ ] Reduced motion: tiles render directly at their resting position with no assembly animation, but hover/focus category emphasis (including the muted tier) still works exactly as under full motion.
- [ ] No tile ever scales or rotates during assembly or emphasis; travel stays small and opacity never drops low enough to read as the tile disappearing.

## About / Engineering (Decision Lens)

About (2026-10-02) is a directly-interactive principle selector, not static copy — see `ARCHITECTURE.md`'s "About:
Decision Lens principle selector" and `MOTION_SYSTEM.md`'s matching entry for the full mechanism.

- [ ] On entering the section, "Systems" is the active principle by default: its tab is visually larger/darker than
      the other three, and the right side shows its statement, explanation, and 4-item evidence row.
- [ ] Clicking each of the 4 tabs (Features, Systems, Trade-offs, Reliability) selects it: `aria-selected` moves to
      that tab, and the statement/explanation/evidence all update together — never a mismatch where the selector
      shows one principle while the content shows another.
- [ ] Scrolling through the section — slow, fast, in both directions, including repeatedly crossing the section's
      top/bottom boundary — never changes which principle is selected. This is the key distinction from Experience:
      About's interaction is direct selection only, with no scroll-driven advancement at all.
- [ ] Keyboard: `Tab` reaches only the currently-selected tab (roving tabindex — the other three are not in the tab
      order until reached via arrow keys); `ArrowUp`/`ArrowDown` move focus between tabs (wrapping at the ends)
      *without* changing the selection; `Enter`/`Space` commits the focused tab's selection. Hovering a tab must
      never, by itself, change `aria-selected`.
- [ ] A visible `:focus-visible` outline appears on the focused tab.
- [ ] The evidence row always shows exactly 4 items for the active principle, with vertical rules between them and
      no card/box styling around any item.
- [ ] Education still renders, as a quiet continuation below the evidence row (not the dominant content of the
      section) — confirm it was not accidentally removed.
- [ ] No horizontal overflow at any width; no overlap between the selector column and the content column.
- [ ] At ≤800 px: the selector becomes a horizontal, wrapping tap row above a full-width panel; the active
      principle remains visually obvious (not just by color).
- [ ] Reduced motion: tab/content transitions become instant, but selection, keyboard interaction, and the final
      correct layout all remain fully functional; content is never caught mid-transition at reduced opacity.

## Services

- [ ] All five capability rows render in their original order.
- [ ] Hover background sweep, padding, color state, and arrow feedback remain consistent with the baseline; use `MOTION_SYSTEM.md` for effective transition timing.
- [ ] Every row opens its selected detail using pointer/touch or keyboard activation.
- [ ] Each detail displays the correct title/description and working mailto action.
- [ ] When a capability supplies the optional `story.paragraphs`, they render as readable body text below a thin
      rule beneath the lede `description`, same treatment as the Experience detail; a capability without `story`
      renders identically to before.
- [ ] Close/Escape work and scrolling resumes after dismissal.
- [ ] Narrow-screen labels and arrows remain readable and reachable.
- [ ] After selecting each capability in turn and closing it, every row is still visible at `opacity: 1` (not just
      present in the DOM) — this is a regression check for a real bug (2026-10-02): selection used to change
      `service-row`'s `className` string, which let React's own diffing silently clobber the reveal system's
      imperatively-added `is-visible` class, leaving the clicked row permanently invisible but still clickable.
      Selection must stay on a separate `data-selected` attribute, never back on `className`, for any element that
      also carries the shared `.reveal` class.

## Contact / Footer

- [ ] When configured, booking and email occupy equal desktop columns and stack at ≤800 px; absent booking preserves a full-width email row.
- [ ] Booking displays its data-authored label and `15 MIN · CALENDLY`; email, social links and footer remain intact.
- [ ] Booking uses the configured public URL (currently `https://calendly.com/abinashanandab/15min`), `_blank`, and `noopener noreferrer`; keyboard activation opens a new tab without navigating the portfolio away.
- [ ] Booking focus is visible, its arrow is decorative, and accessible text identifies the meeting duration/new tab. Its scene transforms neutralize with reduced motion.
- [ ] With an injected/enabled analytics port, booking emits only `contact_click` / `kind: calendly`, never its URL or personal content; no embedded widget or runtime Calendly request occurs before activation.

- [ ] Dark contact/footer surfaces, availability/location labels, headline, and layered entrance remain intact.
- [ ] Email activates the existing `mailto:alex@example.com` destination, using an available mail handler or browser prompt; do not claim delivery was tested.
- [ ] Email hover inset and social-link underline feedback work; magnetic email tracking is not implemented.
- [ ] LinkedIn and GitHub links target their existing generic home-page URLs in the current browsing context; do not expect personal profiles or new tabs.
- [ ] Contact/social links and footer Back to top can be reached and activated with keyboard/touch.
- [ ] Contact sticky/reflow/reduced-motion fallbacks and footer layout remain consistent with the baseline.

## Modal

Run these checks for project, experience, and capability overlays, including repeated open/close cycles and opening while scroll layers are settling.

- [ ] Opens from the correct trigger with correct content; stale selections do not leak between details.
- [ ] Close button dismisses the active overlay.
- [ ] **Backdrop-close check recorded:** clicking outside detail content has been tested and its actual result recorded. The current full-screen overlay has no backdrop-close handler; record this as a known gap, not a passing “backdrop closes” feature. Test dismissal only if an authorized change adds it.
- [ ] Escape dismisses the active overlay without breaking subsequent reopening.
- [ ] Body scrolling is locked while open; native `.overlay-scroll` remains scrollable.
- [ ] Body scrolling unlocks on close and document position is preserved; no residual scroll trap remains.
- [ ] Entrance/exit container animation works with the existing ease and reduced-motion fallback.
- [ ] Immediate removal of selected content on close matches the documented baseline; do not assume exit content retention exists.
- [ ] Close-focus scheduling and previous-focus restoration are checked in the browser; record any failure rather than assuming success from code.
- [ ] Dialog label, Close accessible name, and visible keyboard focus remain intact.
- [ ] Record the known absence of a focus trap/background inert handling; do not claim accessible-dialog completeness.
- [ ] Close remains reachable and detail text/controls remain usable on every tested viewport.

## Cursor

On fine-pointer desktop above 800 px:

- [ ] Cursor follows pointer without visible lag introduced by the change.
- [ ] `data-cursor` targets display the appropriate contextual state/label; non-targets return to the normal state.
- [ ] Cursor never intercepts clicks or obscures essential interaction feedback.
- [ ] Magnetic Close response works under normal motion and does not fight modal/scroll transforms.
- [ ] Contact email retains its existing hover/scroll behavior; do not expect magnetic tracking, which is not implemented for that selector.

On touch/coarse-pointer devices and narrow layouts:

- [ ] Custom cursor is disabled/hidden and native pointer behavior is restored where applicable.
- [ ] Tapping projects, experience, capabilities, Contact/email, and Close requires no hover state.

## Scroll Motion

- [ ] Document progress tracks top/middle/bottom positions and updates after relevant layout changes.
- [ ] Reveals occur once and retain `.is-visible` after leaving/re-entering; content is not stranded by a reset reveal state. Preserve separate scene-driven opacity changes rather than expecting every layer to remain opaque throughout scroll.
- [ ] Hero grid/art, contact grid, and project backdrop retain their CSS-owned normal-motion opacity; do not expect all written scene-opacity keyframes to be visually applied.
- [ ] Structural content (hero title/summary/meta, section headers, project/service rows, about, contact) settles to full opacity as each section centers and recedes — never to invisible, never below a readable floor — as it scrolls past; this is restored depth, not a regression, and must compose with (not replace) the one-time enter reveal: a layer already revealed must never re-run its entrance transition or go fully transparent. Experience is intentionally excluded from this scroll-linked opacity system entirely — see its own section above.
- [ ] Hovering a project/service row while this scroll-linked opacity is mid-transition does not interfere with the existing hover/cursor feedback.
- [ ] Parallax remains perceptibly layered without jitter, oscillation, unintended snapping, or positional corrections.
- [ ] No visible feedback loop or hover/scroll transform overwrite occurs.
- [ ] No scroll trapping/hijacking occurs; intentional modal body lock always releases after close.
- [ ] Native scrollbar dragging and keyboard scrolling remain responsive.
- [ ] Section boundaries remain coherent during repeated forward/backward crossings, including Experience and transitions into dark overlays/contact.

Input stress matrix (record physical versus simulated testing):

- [ ] Trackpad: small slow gestures through the whole page.
- [ ] Trackpad: fast sustained gestures through major boundaries.
- [ ] Mouse wheel: one notch, pause, one notch.
- [ ] Mouse wheel: rapid repeated notches across sections.
- [ ] Rapid alternating scroll direction.
- [ ] Repeated upward/downward boundary crossings.
- [ ] Project hover/pointer movement while scrolling.
- [ ] Detail open/close while parallax is active, followed by nested detail scrolling.

## Responsive

Test these CSS viewport widths, recording height and zoom:

- [ ] 1920 px — results: __________
- [ ] 1440 px — results: __________
- [ ] 1280 px — results: __________
- [ ] 1024 px — results: __________
- [ ] 768 px — results: __________
- [ ] 390 px — results: __________

At every width, check:

- [ ] No unintended horizontal page/overlay overflow; intentional local scrolling such as the areas-of-interest strip remains usable.
- [ ] Typography is readable and headings, labels, metadata, and visuals are not unintentionally clipped.
- [ ] Columns/stacking, spacing, project structure, and dark contact/footer composition are correct.
- [ ] Interactive targets are usable without overlaps or pointer precision requirements.
- [ ] Modal opening, nested scrolling, Close, and keyboard dismissal work.
- [ ] Navigation matches the displayed desktop/narrow controls.
- [ ] Motion matches viewport strength and sticky/non-sticky rules without exposing incorrect spacing.
- [ ] Resizing/orientation changes refresh geometry without stale scene positions.

Also spot-check just above/below 800 px for layout, and 600/1100 px for motion strength. Do not expect the CSS layout and engine motion breakpoints to coincide.

## Reduced Motion

Enable `prefers-reduced-motion: reduce` before loading, then test switching it at runtime. Check both desktop and narrow/touch layouts.

- [ ] Complex scroll-linked transforms are disabled/minimized; parallax layers have neutral transforms/blur and readable opacity.
- [ ] Reveal content remains visible without waiting for entrances.
- [ ] Extended hero/contact sticky tracks, project sticking, and hero/project overlap are removed.
- [ ] Nonessential transition durations are minimized and native anchor navigation is no longer smooth-scrolled.
- [ ] **Cursor-disabled check recorded:** desktop cursor visibility/following/state has been tested. Current reduced motion does not disable that cursor; record this as a known gap, not a passed disabled-cursor requirement. Narrow/coarse-pointer cursor disabling still works.
- [ ] Engine pointer depth and magnetic contributions are disabled; no new complex cursor effects bypass the preference.
- [ ] Content and information hierarchy remain visible and readable.
- [ ] Navigation remains usable.
- [ ] Modal remains usable, including nested scroll, Close, Escape, lock release, and focus handling.
- [ ] Remaining immediate hover offsets/padding and the unchanged focus timer are recorded accurately; do not claim a completely motion-free baseline.

## Performance

- [ ] Normal and rapid scrolling remain smooth, responsive, and free of new obvious frame drops.
- [ ] No obvious jitter appears during scroll, pointer/hover composition, or overlay transitions.
- [ ] Browser console has no new errors or warnings attributable to the change.
- [ ] A browser performance recording shows no runaway motion loop while idle/settled; no competing loops accumulate after repeated overlay cycles or development remounts.
- [ ] Scroll hot paths do not introduce excessive layout recalculation, forced-layout spikes, or interleaved read/write thrashing; distinguish existing pointer-anchor measurements from new work.
- [ ] No listener/observer accumulation or unnecessary page-wide promotion appears after the change.
- [ ] `/favicon.ico` and the declared SVG icon return valid image assets without 404s; production output includes all Inter subsets, their license, and both icons with correct deployment-base URLs.
- [ ] Applicable `pnpm build` and `pnpm exec tsc --noEmit` results are recorded for code changes; these do not substitute for manual interaction tests.

Results / evidence / known gaps / unperformed checks: __________

## Final Regression Rule

**A feature is not complete until all relevant existing behavior still works.**

- [ ] Requested feature verified against the original request.
- [ ] Relevant existing interactions, motion, responsive behavior, accessibility, performance, and visual hierarchy verified.
- [ ] No unintentional behavior changes or introduced regressions remain.
- [ ] Approved differences, existing limitations, failures, and unavailable verification are documented honestly; baseline gaps are not falsely marked as supported features.
- [ ] `CHANGELOG.md` and relevant architecture/motion documents updated for meaningful authorized work according to `CHANGE_PROTOCOL.md`.

An unchanged known limitation is not a newly introduced regression. A new failure must not be relabeled a baseline limitation to pass review. Do not declare completion with unresolved unintended regressions or claim tests that were not performed.
