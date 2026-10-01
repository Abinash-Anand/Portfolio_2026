# Portfolio — Agent Instructions

This is the primary instruction file for AI coding agents working in this repository. The restored website is a protected, stable working baseline, not an invitation to redesign or replace its implementation. Preserve existing working behavior unless the user explicitly requests a change to that behavior.

## Non-Negotiable Rule

Do not break working behavior in order to implement a new feature. Extend the system instead.

## Required Reading

Before making **ANY code change**, including changes to styles, configuration, dependencies, or motion, the agent MUST read:

- `STABLE_BASELINE.md`
- `STABILITY_CONTRACT.md`
- `CHANGE_PROTOCOL.md`
- `ARCHITECTURE.md`
- `MOTION_SYSTEM.md`
- `REGRESSION_CHECKLIST.md`

Read these alongside this file and any applicable nested agent instructions. If a required document is missing or unreadable, stop before changing code, report the missing prerequisite, and obtain user direction. Do not silently skip it or invent its contents. Documentation-only work does not authorize website changes.

The six documents above are mandatory pre-change reading. `FEATURE_REQUEST_TEMPLATE.md` is the reusable request/specification aid, not a record of implemented features. Consult `CHANGELOG.md` for prior changes and verification context before implementation, and append required records afterward. Neither supporting document replaces the mandatory reading or the source inspection.

## Current Project Map

The inspected implementation uses React 19, TypeScript, Vite 8, and Tailwind CSS v4.

- `src/main.tsx`: imports global CSS and mounts the app under React StrictMode.
- `src/App.tsx`: portfolio data, page sections, technical visuals, navigation, interactions, and reusable portal-based detail overlays.
- `src/useParallaxEngine.ts`: shared `useScrollSceneEngine`, compatibility export, scene/layer configuration, geometry caching, reveals, and pointer motion.
- `src/index.css`: Tailwind import, fonts, visual language, responsive layouts, motion-variable composition, and reduced-motion rules.
- `index.html`: application shell and root mount.
- `vite.config.ts`: React/Tailwind plugins, alias, and Figma Make preview integration.
- `package.json` and `.mise.toml`: scripts, dependencies, and toolchain versions.

Inspect task-relevant files and follow their imports before proposing changes. Use the existing running Vite preview and hot reload; do not start a competing server. Keep font wiring and global styling in the existing CSS entrypoint. Do not introduce an alternate application or styling scaffold.

## Protected Systems And Change Boundaries

Protect the existing content/data structure, information hierarchy, typography, spacing, light/dark sections, navigation, responsive layouts, project visuals, hover/pointer interactions, motion engine, and detail-overlay lifecycle and scrolling.

New features must be additive whenever reasonably possible. Inspect existing ownership before creating a system; prefer extending existing utilities, data structures, event handling, motion infrastructure, and rendering patterns over parallel implementations.

A new feature must not:

- Remove or weaken an existing interaction or functionality because different code seems “cleaner.”
- Replace a stable animation system or working implementation without justification and explicit authorization for the behavior being replaced.
- Introduce scroll hijacking or competing animation loops.
- Break responsive layouts, native input behavior, accessibility, or reduced-motion behavior.
- Change the visual language without explicit approval.
- Silently rewrite architecture, rename systems, or perform unrelated cleanup or refactoring.

If a feature conflicts with a stable system, preserve that system and implement around or extend it. If the user explicitly requests replacement, first identify the affected systems and explain regression risks; permission to replace one system is not permission to redesign unrelated systems.

## Before Modifying A Protected System

Explicitly state, before editing:

1. Which system is affected.
2. Why the change is necessary.
3. Which existing behaviors could regress.
4. How the change and those existing behaviors will be tested.

Plan the smallest justified change. Do not proceed with an unrequested replacement merely because it is easier to implement.

## Motion And Interaction Safeguards

- Preserve native browser scrolling, keyboard/touch input, scrollbar behavior, and nested detail-overlay scrolling.
- Extend the existing central scene engine; do not introduce a competing scroll, pointer, or animation scheduler.
- Calculate scene progress from native scroll state and cached, transform-independent layout geometry. Never use a layer's previously rendered transform or transformed bounding rectangle as input to its next scroll transform.
- Preserve the read → calculate → write separation and geometry invalidation strategy. Do not add per-wheel layout measurement or interleaved layout reads/style writes.
- Compose scroll, pointer, hover, and reveal responsibilities through the existing CSS variables and patterns; do not let independent systems overwrite the same transform.
- Keep coordinate-reference containers stable and animate internal visual layers rather than destabilizing section layout.
- Preserve reduced-motion and pointer-capability handling. Clean up listeners, observers, and animation frames, including StrictMode remounts and overlay open/close cycles.

## Visual Direction

Preserve a premium editorial, minimal, monochromatic, sophisticated, spacious, and technical presentation. Motion must be intentional. Maintain recruiter-first information hierarchy with engineer-deep exploration.

Avoid excessive cards, logo walls, unnecessary gradients, excessive glassmorphism, decorative animation without purpose, bounce/elastic animation, random transforms, scroll-jacking, and gratuitous parallax. New content and interactions must fit the existing visual language, not turn the portfolio into a generic template or motion demo.

## Required Workflow

Read instructions
→ inspect existing implementation
→ identify affected systems
→ plan additive change
→ implement
→ run regression checklist
→ verify existing interactions
→ update changelog

## Verification And Completion

Every meaningful change must be checked against `REGRESSION_CHECKLIST.md` before completion. Verify existing behavior as well as the new feature.

For code changes, run applicable checks, including `pnpm build`, `pnpm test`, and TypeScript checking with `pnpm exec tsc --noEmit`. The offline content-architecture tests cover contracts, synthetic synchronization and generic static rendering; they do not replace browser interaction/motion verification. Do not claim automated interaction coverage that does not exist. Avoid repository-wide formatting for a focused change.

For affected UI/motion systems, use the running browser preview: slow/fast scrolling, stepped wheel input, alternating directions, repeated section-boundary crossings, project hover while scrolling, and detail-overlay open/close. Check relevant viewport sizes, keyboard/touch behavior, and reduced motion. A successful build or screenshots alone do not verify scrolling. Distinguish simulated input from physical trackpad/mouse testing and disclose any unavailable validation.

Do not declare a task complete if an existing interaction has disappeared or materially changed unintentionally. Restore the behavior and recheck it; if blocked, report the regression or verification gap rather than asserting success.

Update `CHANGELOG.md` after meaningful feature work with the change, affected systems, and verification results. If it is missing, follow `CHANGE_PROTOCOL.md` and obtain direction when needed; do not silently omit the record. Keep documentation-only tasks documentation-only, and report the actual scope of files changed.
