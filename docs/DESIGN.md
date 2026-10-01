# Portfolio v2 - Design specification

Status: **draft for review** · Branch: `redesign/v2`
Related: [CONCEPT.md](CONCEPT.md) (the experience and story) · [ARCHITECTURE.md](ARCHITECTURE.md) (how it is built) · [PRODUCT.md](PRODUCT.md) (what ships)

## How this document is used

- It is the visual and interaction rulebook. **Before building or changing any UI, HUD element, 3D scene or sound, read the relevant section and the review checklist (section 16).**
- **The source of truth for values is `src/styles.css` (`@theme`).** This document explains them. Components must use tokens, never raw hex values or magic numbers.
- Values are tagged **(owner)** when they come from the owner's concept and **(proposed)** when I chose them. Proposed values need owner confirmation (section 17).
- Numbers for performance-sensitive design (particle counts, draw calls) are **starting values** to be calibrated in Spike 0, see ARCHITECTURE.md section 9.

## 1. Design principles

1. **Void first.** The world is dark; the only light is emissive: traces, HUD, particles, beams. No daylight, no shadows.
2. **Precision.** High-precision architectural minimalism: hairline 1px lines, small radii, a strict grid, monospace for data. Nothing decorative that is not information.
3. **Color is meaning.** Each hue marks a layer of the stack (section 3.2). Color is never the only signal.
4. **Motion has a purpose.** Motion shows a state change (request sent, response received). It is not ambient decoration, and it never blocks content.
5. **Recruiters first.** Clarity beats spectacle. Everything shown in 3D must also exist as plain, accessible content, and the 2D resume is one click away from the first frame.
6. **Design inside the budget.** Every visual feature has a cost in milliseconds (ARCHITECTURE.md section 9). Prefer cheap techniques: emissive materials, instancing, additive glow sprites, baked detail.

## 2. Mode

Dark only (`color-scheme: dark`). There is no light theme. The 2D resume has a **print stylesheet** (white background, black text) so the PDF/printed version is legible.

## 3. Color

### 3.1 Tokens

Contrast is WCAG 2.x relative luminance, computed against the base colors on 2026-10-01.

| Token | Hex | Origin | Role | On `void` | On `surface` |
|---|---|---|---|---|---|
| `void` | `#0A0D12` | owner | Page and canvas base | n/a | n/a |
| `surface` | `#0F141B` | proposed | Panels, glass base | n/a | n/a |
| `raised` | `#161D27` | proposed | Raised/hover surfaces | n/a | n/a |
| `line` | `rgb(255 255 255 / 0.08)` | proposed | Hairline borders | n/a | n/a |
| `text` | `#E6EDF3` | proposed | Primary text | 16.5 | 15.6 |
| `muted` | `#9AA4B2` | proposed | Secondary text | 7.7 | 7.3 |
| `faint` | `#6B7686` | proposed | **Decorative or disabled only** (fails AA as text) | 4.2 | 4.0 |
| `blue` | `#3B82F6` | owner | Structure, client layer, circuit traces, HUD gridlines, hands, primary interactive | 5.3 | 5.0 |
| `blue-soft` | `#60A5FA` | proposed | Hover/active blue text | 7.7 | 7.3 |
| `emerald` | `#34D399` | hue owner, hex proposed | Terminal text, status, success (`STATUS: AUTHORIZED`) | 10.1 | 9.6 |
| `emerald-deep` | `#10B981` | proposed | Emerald glows and graphics | 7.7 | 7.3 |
| `cyan` | `#22D3EE` | hue owner, hex proposed | Request packet particles, data in transit | 10.8 | 10.2 |
| `gold` | `#F2C14E` | hue owner, hex proposed | Response payload, `RESPONSE_BODY`, key results | 11.6 | 11.0 |
| `yellow` | `#FACC15` | hue owner, hex proposed | Database query beam | 12.7 | 12.1 |
| `violet` | `#A78BFA` | hue owner, hex proposed | Backend vault, text-safe | 7.2 | 6.8 |
| `violet-deep` | `#8B5CF6` | proposed | Violet glows and graphics only | 4.6 | 4.4 |
| `indigo` | `#818CF8` | hue owner, hex proposed | Backend vault, text-safe | 6.5 | 6.2 |
| `indigo-deep` | `#6366F1` | proposed | Indigo glows and graphics only | 4.4 | 4.1 |
| `danger` | `#F87171` | proposed | Errors | 7.0 | 6.7 |

The HFT Stuttgart "official blue" for the education room is **TBD**: use `blue` until the owner supplies the exact brand value. Do not invent it.

### 3.2 Semantic map (A7 in CONCEPT.md, proposed)

| Meaning | Colors |
|---|---|
| Client, structure, interaction | `blue` |
| Request packet | `cyan` |
| Response payload | `gold` |
| Backend (NestJS vault) | `indigo` and `violet` |
| Status, terminal, success | `emerald` |
| Database query | `yellow` |
| Error | `danger` |

### 3.3 Rules
- Use at most **two accent hues per view**, except the tunnel and the vaults, which are allowed their layer colors.
- **Text** must use text-safe tokens (`text`, `muted`, `blue`, `blue-soft`, `emerald`, `cyan`, `gold`, `yellow`, `violet`, `indigo`, `danger`). The `-deep` variants and `faint` are for graphics, glows and decoration.
- Glow = the same hue at low alpha, never a different color.
- No gradients except glows, vignettes and thin line fades.
- Never rely on color alone: a status color always has a text label (`STATUS: AUTHORIZED`, not just green).

## 4. Typography

| Role | Family | Notes |
|---|---|---|
| Display and headings | Space Grotesk Variable (placeholder, keep unless the owner objects) | Geometric, technical |
| Body and UI | Inter Variable | |
| HUD, terminal, telemetry | **JetBrains Mono Variable (proposed; not installed yet)** until then the system mono stack (`ui-monospace, Cascadia Code, Consolas`) | Self-hosted via Fontsource when added |

| Style | Size | Weight / spacing |
|---|---|---|
| Display | `clamp(3rem, 8vw, 7rem)` | 700, tracking `-0.03em`, line-height `0.95` |
| H1 | `clamp(2.25rem, 5vw, 4.5rem)` | 700, tracking `-0.02em` |
| H2 | `clamp(1.5rem, 3vw, 2.5rem)` | 600 |
| H3 | `1.25rem` | 600 |
| Body | `1rem` (16px), line-height `1.6` | 400; prose max width 65 to 75 characters |
| Small | `0.875rem` | |
| HUD label | `0.75rem` (12px) minimum, mono | UPPERCASE, tracking `0.08em` |
| Terminal text | `0.875rem` to `1rem`, mono | line-height `1.5` |

- Telemetry counters use `font-variant-numeric: tabular-nums` so numbers do not jitter.
- HUD labels are theatrical `UPPER_SNAKE_CASE`; all human-readable copy is sentence case.
- Readable body text is **never rendered inside WebGL**; it is DOM text (section 9.2).

## 5. Space, shape and surfaces

- **Spacing:** 4px base grid; scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- **Radii:** HUD hardware 2px; controls 6px; glass panels 12px; chips and pills full.
- **Borders:** 1px `line` hairlines; accent borders use the semantic hue at about 35% alpha. HUD frames use corner brackets (short ticks), not full boxes.
- **Elevation is glow, not shadow.** Glow is `0 0 24px` of the hue at 25 to 35% alpha. Glow costs repaint: apply it to the hovered or active element only, never to long lists.
- **Glass panel (the holographic dashboard and panels):** `surface` at about 60% alpha, `backdrop-filter: blur(12px)`, 1px `line`. **At most two backdrop-filter elements visible at once** and none on `low` and `static` tiers (it is GPU-expensive over a live canvas, reasoned).

## 6. Motion

### 6.1 Tokens
| Token | Value | Use |
|---|---|---|
| `dur-instant` | 80ms | Press feedback |
| `dur-fast` | 150ms | Hover, glow |
| `dur-base` | 250ms | Panels, fades |
| `dur-slow` | 450 to 600ms | Room enter, dolly |
| Journey cap | 3 to 4 s first time, 2 s on repeat | See CONCEPT.md A2; always skippable |
| `ease-glide` | `cubic-bezier(0.16, 1, 0.3, 1)` | Smooth deceleration (camera, panels) |
| `ease-standard` | `cubic-bezier(0.65, 0, 0.35, 1)` | General |
| `ease-snap` | `cubic-bezier(0.2, 0.9, 0.1, 1)` | Mechanical: fast in, hard stop (lens lock, keycaps) |

No overshoot or bounce: the aesthetic is machined, not playful.

### 6.2 Patterns
| Moment | Behaviour |
|---|---|
| Headset hover | Traces glow up over `dur-fast`; subtle mechanical click |
| Headset click | Fly-forward about 900ms ease-in, then lens lock with `ease-snap` (about 180ms) and a lens sound |
| Keycap hover/press | Glow up (`dur-fast`); press travels down about 2px in `dur-instant` with the pneumatic click |
| Journey | Particle deconstruct, tunnel, arrival; telemetry text types in; total within the cap |
| Room enter | Fade plus slow dolly over `dur-slow` |
| Terminal text | Typewriter at 30 to 40ms per character, skippable with a click or key |
| Counters (RTT, FPS) | Update at most every 100 to 250ms, tabular numbers |

### 6.3 Reduced motion (`prefers-reduced-motion`)
- Journeys are skipped: cross-fade to the destination in at most 200ms.
- No particles, no camera moves, no typewriter (text appears at once), no tilt or parallax.
- The default view becomes the 2D resume (CONCEPT.md A1); the 3D can still be entered deliberately.

### 6.4 Photosensitivity
Nothing flashes more than 3 times per second (WCAG 2.3.1). The lens "snap" is a single brief darkening, not a bright flash. Particle bursts are dimmed or removed under reduced motion.

## 7. Layout and responsive behaviour

- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536).
- **HUD layout (desktop):** top left identity line, top right engine/FPS line, top center telemetry (journeys only), bottom right controls (`MUTE AUDIO`, `GRAPHICS`), the 2D toggle pinned in a corner at all times. Respect `env(safe-area-inset-*)`.
- **Mobile:** the HUD collapses to essentials (2D toggle, mute, graphics); decorative readouts are hidden. The default view on phones is probably 2D (open decision, section 17).
- **Touch targets:** at least 44x44px for primary controls (WCAG 2.2 minimum is 24px; 44px is the working standard).
- **Z-index scale:** canvas 0, scene overlay 10, HUD 20, panels 30, header 40, modal 50, skip link 60.
- The WebGL canvas fills the viewport behind the DOM; the DOM carries all readable content.

## 8. Component inventory

| Component | Purpose | States and notes |
|---|---|---|
| HUD corner readout | Identity, engine/FPS, status lines | Mono, 12px minimum, `muted`; the FPS value is the real measured value |
| Telemetry monitor | The `>>> OUTBOUND REQUEST...` block during journeys | Typewriter, `emerald`; labelled as simulated (CONCEPT.md A3) |
| Terminal block | Boot prompt and system messages | Mono, `emerald`, blinking caret (static under reduced motion) |
| Keycap (3D) plus DOM mirror | The five endpoints | Hover glow, press, focus ring; each has a visually hidden real `<button>` for keyboard and screen readers |
| Action button ("physical") | `RE-RUN`, `ROUTE TO NEXT`, `ENTER` | Default / hover glow / pressed / focus-visible / disabled; border `blue`, label `text` |
| Glass panel / dashboard | The 200 OK dashboard, room info | Section 5 glass spec; DOM text, never WebGL text |
| Chip / tag | Stack items, tech labels | Pill, `line` border, `muted` text; accent hue only when meaningful |
| Control toggles | `MUTE AUDIO`, `GRAPHICS` tier | Real `<button>` with `aria-pressed`; current value visible as text |
| 2D resume toggle | Always-visible override | Icon plus text label (no emoji; section 12) |
| Skip link | Accessibility | Already in the shell; visible on focus |
| Focus ring | Keyboard focus | 2px `emerald`, 3px offset (token `emerald`, contrast 10:1) |

## 9. 3D art direction

### 9.1 Language
- Dark void base, **emissive** materials, additive glow sprites for halos, matcap or env-mapped metal for gloss. **No real-time shadows, no glass transmission, no heavy bloom** (fake glow with sprites).
- Detail comes from lines, grids, instanced repetition and baked ambient occlusion, not from polygon count.
- Camera: field of view about 55 to 65 degrees; movement is slow dolly and glide (`ease-glide`), no handheld shake.

### 9.2 Text in 3D
Readable text (the dashboard, panels, terminal windows, records) is **DOM overlay anchored to projected 3D positions**: crisp, selectable, translatable, accessible. WebGL text (SDF) is only for short labels such as `AuthGuard`, `STUTTGART_NODE_01`.

### 9.3 Scenes
| Scene | Palette | Motifs | Notes |
|---|---|---|---|
| Boot | void, `blue` traces, `emerald` terminal | Floating matte-black headset, slow drift | Procedural headset (A8); hum |
| Console (Act I) | `blue` gridlines, `text` | Polished glass chamber (fake reflection), five emissive keycaps, reticle or outline hands | Keycaps instanced |
| Tunnel | `cyan` out, `gold` back, `blue` lines | Streaming digits and packet headers, light streaks | Points with a glyph atlas; **about 30k points max (high), fewer on lower tiers**; no real motion blur |
| Server vault (Act III) | `indigo`, `violet`, `emerald` gates | Cathedral hall of racks, laser gates `AuthGuard` and `ValidationPipe`, spinning core in a glass cylinder | Racks as `InstancedMesh`; LEDs via instanced emissive attribute; baked AO |
| Database vault (Act IV) | `yellow` beam, metal drums | Circular drum array, laser arm, holographic records | Drums matcap; records as DOM |
| Return and dashboard (Act V) | `gold` container | Container floats up and opens | Dashboard is a DOM glass panel |
| Education | `blue` (HFT) | Server tower, blade `M.SC_SOFTWARE_TECHNOLOGY`, terminal windows | Windows as DOM |
| Skills (PCB) | `blue`, `emerald` traces | Chips as instanced boxes with emissive labels, data streams along traces | Cheapest room |
| Projects (pods) | per-project accent from the project's primary language | Pods generated from GitHub data | Data-driven, no per-project code |
| Experience (git graph) | `blue` main line, branch hues by type | `git log --graph` corridor, commit nodes expand into metrics | Nodes instanced |

### 9.4 Budgets (starting values)
Per room on the high tier: about 100 draw calls, about 150k triangles; low tier about 50k triangles. Textures 1K to 2K KTX2. Only one room (plus the tunnel) in memory. See ARCHITECTURE.md 7.2 and 9.5.

## 10. Audio

All sounds are **synthesised with Web Audio** (about zero download). No autoplay: audio starts only after the first user gesture (the headset click) and is **muted by default**; the mute state is kept in memory only, with no storage.

| Sound | Character |
|---|---|
| Ambient hum | Low-frequency, quiet, loops; ducks under effects |
| Hover/mechanical click | Short, dry |
| Lens lock | Crisp optical snap |
| Pneumatic click | Heavy, short |
| WHOOSH | Filtered noise sweep on the return journey |

Rules: consistent loudness, master gain defaults to a moderate level, repeated sounds are shorter, a clear mute control is always visible.

## 11. 2D resume view

- A real route (for example `/resume`), prerendered and indexable; semantic HTML (`main`, `section`, headings, lists).
- High contrast on `void`; single column up to `lg`, two columns (sidebar for skills and languages) from `lg`.
- Order: summary, skills, experience, projects, education, languages. Content comes from the typed content files (CONCEPT.md Appendix A).
- Download PDF with one click; **print stylesheet** with white background and black text.
- Contact: email, LinkedIn, GitHub. **Phone number: pending owner decision** (PRODUCT.md question 5).
- Visual style matches the HUD language (mono labels, hairlines) but is plain and readable.

## 12. Content and voice

- Theatrical HUD copy is English, `UPPER_SNAKE_CASE`, terse, machine-like. Human copy is plain, confident sentence case.
- **No emoji in the UI.** The concept's `📄` becomes an SVG icon plus the text label.
- Simulated telemetry is labelled "SIMULATED"; the HUD location line is fixed theatre and never uses the visitor's real IP or location.
- All facts (metrics, dates, roles) come from the CV; do not strengthen a claim beyond the CV wording.
- Terminal text stays English in the German build (open decision, section 17).

## 13. Accessibility rules in design

- **Contrast:** text at least 4.5:1 (3:1 for large text and UI graphics) on its actual background, including glass panels (use the `surface` column in section 3.1).
- **Focus:** always visible, 2px `emerald` ring.
- **Keyboard parity:** every action reachable without a pointer (tab order over DOM mirrors of the 3D controls).
- **Not color alone:** status always has text.
- **Motion:** section 6.3 and 6.4.
- **Canvas:** `aria-hidden`; all meaning duplicated in DOM text.
- **Targets:** section 7.

## 14. Tiers and visual degradation

| Tier | What the visitor gets |
|---|---|
| `high` | Full scenes, tiny env map, one light post effect, glass panels with blur |
| `medium` | Baked-only look, no post effect, blur reduced |
| `low` | Reduced particle counts and instancing, no blur, simplified rooms |
| `static` | No WebGL: the 2D resume with the same palette (also the default for reduced motion, weak devices, probably phones) |

The tier is shown in the HUD as `GRAPHICS` and is user-selectable.

## 15. Implementation map

- **Tokens:** CSS custom properties in `src/styles.css` `@theme` (Tailwind v4). Components use utility classes mapped to tokens.
- **Three.js colors:** read from a single shared `design/tokens.ts` constants file (proposed); a unit test asserts it equals the CSS values so the two never drift.
- **No raw hex values or magic numbers in components.** New values become tokens first.
- **Fonts:** self-hosted via Fontsource; the HUD mono font is added when the owner confirms the choice.
- **Motion tokens:** CSS variables for durations and easings, mirrored in the motion service for GSAP.

## 16. Review checklist (per screen or scene)

- [ ] Uses tokens only; no raw hex or magic numbers.
- [ ] Color follows the semantic map; at most two accent hues (outside the tunnel and vaults).
- [ ] Text contrast verified on its real background (including glass panels).
- [ ] Readable text is DOM, not WebGL.
- [ ] Hover, active, focus-visible and disabled states exist.
- [ ] Reduced-motion behaviour defined and checked; nothing flashes more than 3 times per second.
- [ ] Keyboard path and screen-reader labels work; 44px touch targets on mobile.
- [ ] Within the room's draw-call, triangle and memory budget; tiers degrade as in section 14.
- [ ] Copy follows the voice rules and the CV (no stronger claims); telemetry labelled simulated.
- [ ] Looks right in the 2D resume equivalent (parity).

## 17. Open design decisions

1. Confirm or change the proposed hex values (section 3.1), especially `emerald`, `cyan`, `gold`, `yellow`, `violet`, `indigo`, and `surface`/`raised`.
2. HFT Stuttgart brand blue (exact value).
3. HUD/terminal mono font: JetBrains Mono (proposed) or another; keep Space Grotesk and Inter?
4. Default view on phones: 2D (recommended) or a reduced 3D?
5. Terminal text in the German build: stays English?
6. Keycap and headset form language (procedural, matte, bevelled): approve at the Phase 2 mock.
7. Phone number in the 2D resume (PRODUCT.md question 5).

## 18. Change log

| Date | Change |
|---|---|
| 2026-10-01 | Initial design specification from the owner's concept; palette contrast computed; tokens migrated in `src/styles.css`. |
