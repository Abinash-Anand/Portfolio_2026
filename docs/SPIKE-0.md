# Spike 0: a real Three.js scene, measured

Status: **built and measured on the baseline laptop; phone and live-frame checks are still open.** Verdict: **conditional GO**
(section 9). Written 2026-10-01. Criteria come from ARCHITECTURE.md section 9.7; the roadmap row is Phase 2.5.

Evidence tags used below: **[measured]** = a number from a run described here; **[extrapolated]** = arithmetic on measured
numbers, not yet confirmed on the target device; **[open]** = not measured.

## 1. What was built

| Piece | Where | Notes |
|---|---|---|
| Three.js host behind the `SceneHost` contract | `src/app/scene/three/three-scene.host.ts` | No Angular imports. One canvas, one frame loop, unlit emissive materials, fog, additive glow. No lights, shadows or post-processing. |
| Boot scene | `world/headset.ts` | Procedural headset (extruded visor, edges, circuit traces, glow). Hover glow driven by the DOM "Initialize" button. |
| Act I console | `world/console-room.ts` | Floor grid, chamber edges, curved console, five instanced keycaps. The pressed key follows the chosen endpoint. |
| Tunnel | `world/tunnel.ts` | 30 000 GPU points drawn from a code-generated 0/1 glyph atlas, plus instanced light rings. All motion is in the vertex shader. Cyan on the way out, gold on the response. |
| Server vault + database vault | `world/vault.ts` | Instanced racks and LED strips, three laser gates, glass core, ten database drums, yellow query beam. Recoloured per endpoint. |
| Camera rig, profiles, disposal, GPU timer | `camera-rig.ts`, `profiles.ts`, `dispose.ts`, `gpu-timer.ts` | Camera maths is pure (unit-tested, worker-ready). |
| Benchmark | `src/app/scene/bench/` | `/journey?bench&debug` panel plus `window.__spike`. Separate lazy chunk: visitors never download it. |
| Wiring | `app.config.ts` | Lazy `import()` of the host. `?engine=2d` selects the old placeholder as a baseline. |
| Failure handling | `scene-canvas.component.ts`, `motion.service.ts` | Factory or mount failure, or a lost WebGL context, falls back to the static (2D) tier instead of a blank screen. |

Everything is code-generated: **zero asset bytes**. Tests: 275 (was 191). Lint, format, typecheck and build are green.

## 2. How it was measured (and what to distrust)

Machine: Windows 11 laptop, AMD Radeon integrated graphics (ANGLE/D3D11), 12 logical cores, 16 GB, 1536x864 screen at DPR 1.25,
Chromium 152 inside the Claude desktop app. Timer queries (`EXT_disjoint_timer_query_webgl2`) were available.

- **Cost benchmark** (`__spike.cost`): renders frames back to back at a fixed reference size (1920x1080, DPR 1) so numbers are
  comparable between devices, and is independent of display refresh and tab throttling. Per frame it records JavaScript time
  (update plus draw submission), GPU time from timer queries, and wall time with a one-pixel `readPixels` readback.
- **Why `readPixels` and not `gl.finish()`:** the first version used `gl.finish()` and produced nonsense (0 ms for a 30 000-point
  frame; lower tiers appearing slower). Browsers treat `finish()` as a flush. A readback cannot return until the GPU has
  drawn, so it is a real sync point. This is worth remembering for any future measurement.
- **Wall time** includes the readback round trip (about 3 ms floor), so **GPU time is the better signal**; wall time is shown
  only to confirm nothing hides outside the GPU timer.
- **Live runs** (`__spike.live`, `__spike.governor`) need a visible tab on a real display. The embedded browser pane throttles
  `requestAnimationFrame` unpredictably (0 to 120 per second), so only one short live run was usable. **Real FPS, stutter and
  governor behaviour are [open]** and are the main thing to collect on your devices (section 10).
- Single machine, dev build and production build measured (cost numbers matched), no phone, no Safari or Firefox.

## 3. Cost per frame **[measured]**

1920x1080, DPR 1, ms per frame. GPU is p50 (p95). JS is p50. Draw calls and triangles from `renderer.info`.

| Tier / phase | GPU | JS | Draw calls | Triangles | Points |
|---|---|---|---|---|---|
| high / boot | 0.45 (0.85) | 0.2 | 5 | 1 582 | 0 |
| high / console | 0.46 (1.09) | 0.2 | 6 | 166 | 0 |
| high / journey | 1.24 (1.57) | 0.2 | 2 | 13 824 | 30 000 |
| **high / room** | **1.71 (2.05)** | **0.4** | **21** | **18 916** | 30 000 |
| medium / journey | 0.63 (0.96) | 0.1 | 2 | 9 216 | 16 000 |
| medium / room | 1.32 (1.78) | 0.4 | 21 | 13 924 | 16 000 |
| low / journey | 0.23 (0.65) | 0.1 | 2 | 4 608 | 6 000 |
| low / room | 1.03 (1.46) | 0.3 | 21 | 8 932 | 6 000 |

The production build gave the same numbers (high/room GPU 1.67, JS 0.6; high/journey GPU 1.36).

**Reading it:** the worst phase is about 1.7 ms of GPU and 0.4 ms of JavaScript, against a 16.7 ms frame and a 10 ms GPU
budget. The scene uses roughly 17% of the GPU budget and 3% of the main thread on an integrated GPU.

### Resolution scaling (high tier)

| Canvas | Pixels | journey GPU | room GPU |
|---|---|---|---|
| 640x360 | 0.23 M | 0.52 | 0.51 |
| 1280x720 | 0.92 M | 0.92 | 1.04 |
| 1920x1080 | 2.07 M | 1.35 | 1.62 |
| 3840x2160 | 8.29 M | 2.42 | 4.36 |

Cost is a fixed part (about 0.4 ms for the points, instances and state changes) plus about 0.45 ms per megapixel for the room.
The scene is **not fill-bound** at normal sizes, which is why tiers that mostly remove geometry change little here.

### Stress curve (room, high, 1080p; extra full-screen additive layers)

| Layers | 0 | 4 | 8 | 16 | 32 |
|---|---|---|---|---|---|
| GPU p50 (ms) | 0.85 | 1.83 | 2.39 | 3.65 | 5.96 |

Linear in overdraw, about 0.16 ms per layer on average. This confirms the earlier theory test (ARCHITECTURE.md 9.2): when a
scene is GPU-bound, only a smaller workload helps. It also gives a cost model for Phase 3: **a full-screen effect costs
roughly 0.2 ms per layer at 1080p on this GPU**, so one bloom-style pass chain is affordable but must be measured.

## 4. Lifecycle and memory **[measured]**

Mount, draw every phase, dispose, repeat (about 40 cycles across runs):

- Alive resources were constant every cycle: **24 geometries, 2 textures**.
- Resources alive right after `dispose()`: **0 geometries, 0 textures** every time.
- The browser reported the WebGL context as **released** after every dispose (`forceContextLoss()`), so 40 cycles never hit the
  16-context limit.
- JS heap ratio last/first over a run: 0.55 to 1.09 (noise, no trend).
- Disposal is covered by unit tests too (shared resources counted once, shader-uniform textures, instanced meshes).

[open]: GPU memory is not observable from the web platform. By construction the largest allocation is the point buffer
(30 000 x 4 floats, about 0.5 MB); the textures are 128 and 16 KB.

## 5. First-frame hitches: compile-ahead and draw-ahead warm-up **[measured]**

The first time a phase draws, the GPU does one-off work. Measured on a fresh context, ms for the first frame of each phase
(console / journey / room):

| Variant | console | journey | room |
|---|---|---|---|
| Nothing (first version) | 31.9 | 13.6 | 12.7 |
| `compileAsync` at mount | 7 to 11 | 5 to 10 | 4.5 to 6 |
| `compileAsync` + draw-ahead warm-up | **0.9 to 1.4** | **1.1 to 1.4** | **1.3 to 1.7** |

The warm-up draws each hidden part once, scissored to a single pixel, one part per frame during the boot screen. It costs 4 to
8 ms per part in this state, paid while nobody is interacting.

One more observation: in the same session, on the same code, the machine drifted into a state where those first frames cost
**110 / 41 / 55 ms** and the mount blocked for 140 to 180 ms (all cold numbers were identical to within 1 ms across more than ten
fresh contexts, so it is a per-context cost, not noise). I could not identify the cause (driver or GPU-process state; the pane
was not simply hidden). That is exactly the case the warm-up exists for: it moves a potential 200 ms of hitching from the moment
the visitor presses a key to the boot screen. **[open]**: re-measure the warm-up in that slow state, and on a phone.

Mount itself blocks the main thread for **23 to 34 ms** in the fast state (renderer, geometry, 30 000 random points). Under the
50 ms long-task line, but with little margin; see section 8.

## 6. Bundle and first load **[measured]**

| Item | Phase 2 | Spike 0 | Budget |
|---|---|---|---|
| Initial JS (gzip estimate) | 89.8 kB | **93.0 kB** | <= about 100 kB |
| Three.js host chunk (brotli estimate / gzip) | n/a | **127 kB / 153 kB** | <= about 200 kB gz |
| Benchmark panel chunk | n/a | 3.7 kB | dev only |
| Asset bytes for the first scene | n/a | **0** | <= 1.5 MB |

The Three.js chunk is referenced only by the dynamic `import()` in `app.config.ts`. It is not in `index.html`, not a
`modulepreload`, and not pulled in by route preloading, so **pages other than `/journey` do not download it** and their LCP is
unaffected by construction. A Lighthouse run in Phase 4 will confirm it. The +3.2 kB initial growth is the factory and error
handling in the app shell.

## 7. Decisions

### Worker tier: **do not build it in v1**

- ARCHITECTURE.md 9.2 showed a render worker only removes main-thread contention, and does nothing for a GPU-bound scene.
- This scene's main-thread cost is 0.1 to 0.6 ms per frame (about 3%), and the live run recorded **zero long tasks** in 8 seconds.
  There is almost nothing for a worker to take off the main thread.
- A worker costs real complexity: message-driven camera and input, no `OrbitControls`, `OffscreenCanvas` differences on Safari,
  a second code path to test.
- Criterion 2 of 9.7 ("worker tier shows no regression, fallback works") therefore does not apply: there is one path, the main
  thread, and it falls back to 2D.
- The option stays open at no cost: the host has no Angular imports, camera maths is pure, and everything crosses the
  `SceneHost` interface as coarse state. **Revisit only if the phone run shows host JS above about 4 ms per frame or long tasks
  caused by the scene.** S4 in ARCHITECTURE.md is updated accordingly.

### Starting budgets (9.5): keep, with these calibrations

| Budget | Result |
|---|---|
| GPU per frame about 10 ms | Used about 1.7 ms at 1080p on the baseline laptop **[measured]**. A phone is the real test: assuming a GPU 4 to 8 times slower and about 1.3 MP (DPR capped at 2), the estimate is **5 to 10 ms [extrapolated]**, i.e. at the edge, which is what the medium and low tiers are for. |
| Draw calls <= about 100 | 21 at most. Headroom for roughly four more rooms of this complexity. |
| Triangles <= about 150 k (high) | 19 k. Not the constraint. |
| Lazy 3D chunk <= about 200 kB gz | 153 kB gz. About 45 kB left for later rooms. Prefer instancing and shared geometry over new library features. |
| First-scene assets <= about 1.5 MB | 0. Keep generating in code. |
| Tier profiles (`profiles.ts`) | **Unchanged.** On this GPU they are cheap enough that the ladder is narrow (room: 1.71, 1.32, 1.03 ms). They are deliberately not raised until the phone numbers exist. |

## 8. Findings that change the plan

1. **Measure with a readback, not `gl.finish()`** (section 2). Already encoded in the benchmark.
2. **Warm up by drawing, not only compiling** (section 5). Implemented, unit-tested, and retained.
3. **Mount should be spread out in Phase 3.** At 23 to 34 ms (140 to 180 ms in the slow state) it is a long task waiting to
   happen. Generate tunnel points in a few chunks across idle frames, or from a seeded fixed array, and measure.
4. **The governor reads throttled `requestAnimationFrame` as slowness.** In the embedded pane it stepped down to `low` because
   frames arrived at 3 to 20 per second. Real browsers pause hidden tabs (the host already pauses on `visibilitychange`). A
   phone in low-power mode caps animation to 30 fps, but the frame loop learns the display's refresh period from its first
   frames (any period under 40 ms) and normalises frame time by it, so a steady 30 fps display is not mistaken for slowness;
   only a display slower than 25 Hz would be. **Still to confirm on a phone** (section 10).
5. **`PreloadAllModules` prefetches the `/journey` chunk (23 kB) on every page.** Harmless for a preview route; decide in Phase 3
   whether the experience entry deserves it.
6. **Context loss, WebGL failure and a missing implementation all end in the 2D page**, tested with a fake renderer.

## 9. Success criteria (ARCHITECTURE.md 9.7) and go/no-go

| Criterion | Status |
|---|---|
| Holds the target frame time while idle and scrolling on the baseline device | **Met by cost [measured]:** about 2 ms of a 16.7 ms frame. The live frame cadence and scrolling are **[open]** (one throttled-pane run held its cadence: p50 20.8 ms, p95 20.9 ms, JS 0.6 ms, zero long tasks). The experience itself has no page scroll; the DOM panel scrolls. |
| Worker tier shows no regression, or the fallback works | **Not applicable by decision** (section 7). |
| First content (LCP) not delayed | **Met by construction [measured bundle]**; confirm with Lighthouse in Phase 4. |
| Tier ladder degrades smoothly when pushed over budget | **Cost ladder is monotonic [measured];** the governor's live behaviour under stress is **[open]**. Its logic is unit-tested. |
| Memory within budget across route changes | **Met [measured]:** no leaks, constant resource counts, contexts released. |

**Verdict: GO, conditional.** The technique, the architecture and the budgets are sound with a large margin on an integrated
GPU. The criteria say the spike must also run on a mid-range phone, so before scope for Phase 3 is locked, **the phone run in
section 10 must not show a cost above about 8 ms of GPU** (or a governor fault as in finding 4). If it does, the reduction path
is already built into the tiers: lower point counts, DPR cap 1.25 on medium, 30 fps on low, and fewer racks. No scene
redesign is needed to get there.

## 10. How to collect the open measurements (about 5 minutes per device)

Serve the production build on your network and open the benchmark page with the tab visible and the screen on:

```bash
npm run build
node <path to scratchpad>/serve-dist.mjs dist/Portfolio_2026/browser 4300
```

(or `npm start -- --host 0.0.0.0` for a dev build). Then open `http://<laptop-ip>:4300/journey?bench&debug` on the device.

1. Tap **Run all**. It runs: cost, stress curve, live 10 s, live 10 s with a 40 ms main-thread stall every 250 ms, the
   governor under overload, and the lifecycle test.
2. Tap **Copy JSON**. Plain HTTP on a LAN blocks the clipboard, so select the text under the buttons instead.
3. Paste the JSON back. Do this on the phone and on the laptop in a normal, visible Chrome or Edge window.

Numbers to look at first: `cost.rows` where `phase` is `room` (GPU p50 and p95), `live.fps` and `live.stutterRatio`,
`governor.tierSteps` (it should step down under load and not on its own), `liveContended.stutterRatio` (the upper bound on
what a worker could ever give back), and `lifecycle.leaked` (must be `false`).

## 11. Visual notes (for the Phase 3 art pass)

All four phases render and read as intended at the "middle-ground" level: boot (headset), console (grid and keys), tunnel
(streaming digits), vault (racks, LED strips, laser gates, core).

- The headset reads mostly as an outline; the visor face is almost the background colour. Add a lighter surface or a
  fresnel-style rim.
- The keycaps are large relative to the console arc.
- On a 4:3 window the boot text overlaps the headset; the layout of text versus object needs a decision.
- The camera glide originally ended one unit from the server core and would have passed through it; it now ends 7 units
  short (`AISLE_LENGTH` 24) with the core framed and the drums glimpsed behind it. The database vault still needs its own
  beat (a second camera move) in Phase 3.

## 12. Phase 3 follow-up: the five rooms (same laptop, same method)

Measured with `__spike.cost` at 1920x1080, DPR 1, after each room was built and warmed (dev build). GPU is p50/p95 in ms,
JS is p50 in ms.

| Case | high | medium | low | Draw calls | Triangles (high) |
|---|---|---|---|---|---|
| boot | 0.53 / 0.76, 0.3 | 0.51 / 0.77, 0.3 | 0.53 / 0.81, 0.2 | 6 | 1 584 |
| console | 0.38 / 1.47, 0.3 | 0.44 / 1.39, 0.3 | 0.38 / 1.45, 0.3 | 6 | 166 |
| tunnel (journey) | 1.46 / 1.82, 0.3 | 0.84 / 1.24, 0.2 | 0.34 / 0.73, 0.2 | 2 | 13 824 |
| room: about | 2.05 / 2.83, 1.0 | 1.78 / 2.32, 0.9 | 1.01 / 1.30, 0.8 | 24 | 19 064 |
| room: education | 0.46 / 1.40, 0.5 | 0.51 / 1.05, 0.5 | 0.50 / 0.78, 0.5 | 8 | 752 |
| room: skills | 1.06 / 1.51, 0.6 | 1.07 / 1.56, 0.5 | 1.13 / 1.55, 0.6 | 11 | 1 250 |
| room: projects (3 pods) | 0.94 / 1.30, 0.6 | 1.00 / 1.36, 0.5 | 1.06 / 1.27, 0.5 | 11 | 12 392 |
| room: experience | 0.31 / 0.47, 0.5 | 0.33 / 0.51, 0.5 | 0.32 / 0.48, 0.4 | 11 | 3 436 |

- **Every room is cheap:** the worst is About at about 2 ms of GPU (it includes the tail of the tunnel stream while the response
  flight settles) and about 1 ms of JavaScript. At most 24 draw calls, against a budget of about 100.
- **Only About has a tier ladder** (the rack count and the tunnel). The other rooms cost the same at every tier because they are
  already tiny; the lower tiers still save by capping pixel ratio and frame rate, which this fixed-size test does not show.
  This is deliberate, not an oversight: do not invent detail to trim until the phone run shows a need.
- **Building a room** takes 0.4 to 25 ms in one scheduled step (About is the slowest because it draws the most text and
  geometry, and the first build runs cold). In the lifecycle test the second and later builds took 0.4 to 11 ms. Rooms are
  ready 110 to 290 ms after being asked for, including loading their chunk, the label font, building, compiling and warm-up.
  **Follow-up if the phone shows a visible hitch:** split the About build into two scheduler steps (the scheduler already
  supports it).
- **First frame in each room after preparation:** 3 to 15 ms in the readback-synced benchmark (which adds a round trip),
  so entering a room does not hitch.
- **Lifecycle across all five rooms** (six full cycles of mount, visit every room, dispose): alive resources constant
  (21 geometries), nothing alive after dispose, all contexts released, heap ratio 0.74 (no growth). At most two rooms alive.
- **Code size** (brotli): Three.js core 121 kB (unchanged), host 8.3 kB, each room 1.4 to 2.6 kB, shared helpers about
  8 kB. A visitor who opens one room downloads the core, the host and that room (plus the next one, if they hover a key).
  Initial JS is 94.1 kB gzip (budget about 100 kB; +1.1 kB for the route matcher, content mapper and URL sync).
