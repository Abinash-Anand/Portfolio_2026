# Change Protocol

This protocol is mandatory for future implementation work on the portfolio. The restored implementation is a protected baseline. Preserve working behavior, follow `AGENTS.md` and `STABILITY_CONTRACT.md`, and extend existing systems instead of replacing them for convenience. Documentation-only requests authorize documentation changes only.

## Step 1 — Read

Before coding, read:

- `AGENTS.md`
- `STABLE_BASELINE.md`
- `STABILITY_CONTRACT.md`
- `ARCHITECTURE.md`
- `MOTION_SYSTEM.md`
- `REGRESSION_CHECKLIST.md`

Also read this protocol and applicable nested agent instructions. These requirements apply to styles, configuration, dependencies, and motion as well as component code. If a required document is missing or unreadable, stop before code changes, report the prerequisite, and obtain user direction. Do not invent its contents or silently skip it.

## Step 2 — Inspect

Inspect the existing implementation relevant to the requested feature and follow its imports and consumers. Identify:

- Existing components and sections.
- Existing event handlers, delegation, subscriptions, and cleanup.
- Existing data structures and their rendering/selection paths.
- Existing CSS systems, tokens, selectors, and property ownership.
- Existing animation systems, schedulers, observers, and transform composition.
- Existing utilities and compatibility exports.
- Existing responsive rules and motion/input capability checks.

Use the actual source as implementation evidence; do not infer features from names or prior proposals. Check repository status and preserve unrelated user changes. Inspect existing ownership before creating another system.

## Step 3 — Impact Analysis

Before coding, explicitly identify:

- Systems affected and the files that own them.
- Systems that must remain untouched.
- Dependencies, shared consumers, and lifecycle implications.
- Possible regressions in behavior, layout, motion, accessibility, and performance.
- Whether the change is additive or modifies existing behavior.

For protected systems, state why modification is necessary, what existing behavior could regress, and how it will be tested. Identify any required user approval before proceeding. An additive label does not excuse side effects on existing systems.

## Step 4 — Implementation Strategy

Prefer:

- Extending existing systems.
- Reusing existing data and rendering patterns.
- Reusing existing event delegation and handlers where appropriate.
- Reusing existing animation infrastructure and CSS-variable composition.
- Adding isolated functionality with clear ownership and cleanup.

Avoid rewriting stable systems, duplicating infrastructure, and unnecessarily replacing working code. Isolation means limiting side effects, not installing a second modal, cursor, scroll, or motion engine.

Choose the smallest coherent implementation and map it to the regression checks identified in Step 3. Preserve native scrolling, cached transform-independent scene geometry, central scheduling, responsive behavior, and reduced-motion handling. If the strategy conflicts with a protected system, apply the Protected Change Rule before editing.

## Step 5 — Implement

Make the smallest coherent change necessary for the request. Do not perform unrelated cleanup, renaming, formatting sweeps, dependency changes, or visual redesign.

Do not combine feature work with refactoring unless explicitly requested. Keep event/property ownership clear and clean up listeners, observers, and scheduled work, including StrictMode remounts and repeated overlay opening/closing.

If implementation reveals a new conflict or materially expands the scope, pause and revisit the impact analysis and strategy. Do not silently escalate a local addition into an architectural rewrite.

## Step 6 — Regression Test

Run `REGRESSION_CHECKLIST.md` and record results. Verify:

- Existing interactions: navigation, projects, architecture controls, experience, services, stack disclosures, contact, cursor, and progress indicators.
- Existing motion: scroll layers, hover composition, reveals, transitions, and modal behavior.
- Responsive behavior: desktop/tablet/mobile, breakpoint changes, orientation changes, and touch input.
- Accessibility: keyboard activation, visible focus, Close/Escape, existing focus handling, readable content, and reduced-motion preferences.
- Performance: responsive native scrolling, scheduler/listener cleanup, and no new layout thrashing or unnecessary continuous work.
- Visual hierarchy: typography, spacing, project structure, section contrast, and editorial composition.

For code changes, run applicable checks, including `pnpm build` and `pnpm exec tsc --noEmit`. The current package has no automated test script; do not claim nonexistent coverage.

For affected UI/motion, test in the existing browser preview. Include slow/fast scrolling, stepped/rapid wheel input, direction reversals, repeated boundary crossings, hover while scrolling, and detail open/close. Test reduced motion before load and at runtime. Distinguish simulated events from physical trackpad/mouse tests. Builds and screenshots alone do not establish scrolling correctness.

Mark checks as passed, failed, not applicable with a reason, or not performed with a reason. If required validation is unavailable, report the gap and seek direction rather than silently marking it passed. Do not treat documented baseline accessibility limitations as already solved.

## Step 7 — Review

Compare the implementation and final diff against the original request. Confirm that:

- The requested feature works.
- Existing functionality still works.
- No unrelated behavior changed.

Check the affected-system list against actual changes. Explain any authorized behavior differences; remove unrelated edits introduced by this work without disturbing user changes. If an interaction disappears, becomes unreliable, or changes unintentionally, restore it and rerun relevant checks. Do not declare completion while an unintended regression remains or required verification is represented inaccurately.

## Step 8 — Document

Update `CHANGELOG.md` after meaningful feature work with:

- What changed and why.
- Affected systems and intentional behavior differences.
- Verification performed and results.
- Outstanding limitations, validation gaps, and any approved protected-system override.

If the changelog does not exist, create it as part of authorized meaningful feature work; if the task scope prohibits that addition, obtain direction rather than omitting the requirement silently. A documentation-only request to create one file does not authorize additional files.

For significant architectural changes, also update the relevant architecture or motion documentation to describe the actual resulting implementation. Preserve the historical baseline record; do not rewrite it to conceal differences or regressions. Documentation updates do not substitute for testing.

## Protected Change Rule

If implementation becomes difficult because of an existing stable system, do not automatically remove or replace that system.

Instead:

1. Understand why it exists and which behaviors depend on it.
2. Identify the specific conflict and regression risks.
3. Isolate the new feature so it does not disturb existing ownership.
4. Extend the existing architecture where possible.

Difficulty, stylistic preference, or a cleaner-looking alternative is not proof that replacement is necessary. Preserve the stable system while evaluating options.

## Explicit Override

Only modify a protected system when the user explicitly requests it or when the feature genuinely cannot be implemented otherwise. For the latter, first document the alternatives considered and why extending or working around the system cannot satisfy the request.

Necessity is grounds to propose an override, not permission to silently replace stable behavior. Obtain explicit authorization before an unrequested replacement or material behavior change, consistent with `AGENTS.md` and `STABILITY_CONTRACT.md`. Limit the override to the specific affected system; unrelated protections remain in force.

In either case, document:

- Why the protected system must change.
- What behavior changes and what remains preserved.
- What regression risks exist.
- What verification was performed and its results.

State the affected systems, justification, risks, and verification plan before editing; record actual verification afterward. An override does not excuse accidental regressions or unsupported completion claims.
