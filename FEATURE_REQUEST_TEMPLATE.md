# Feature Request

## Feature

[Name]

## Goal

[What the feature should accomplish. State the outcome, not just a preferred implementation.]

## User Experience

[What the visitor should see and experience, where the feature appears, and how it fits recruiter-first scanning and deeper technical exploration.]

## Why

[Why this feature is useful and which visitor need it addresses.]

## Scope

### Must Change

- [Required change or addition]
- [Specific component, content, or behavior to update]

### Must Not Change

- [Existing behavior, content, layout, or file that must remain unchanged]
- [Explicit exclusions, such as unrelated refactoring or visual redesign]

## Existing Systems Affected

- [Known system and its owning component/file, if known]
- [Shared consumers, dependencies, event handling, or lifecycle affected]
- [Additive extension or intentional modification; use “Unknown—inspect first” where necessary]

## Protected Systems

- [Systems that must remain untouched]
- [Behaviors that must be preserved even if their owner needs a scoped extension]

[Default: preserve all working behavior outside the explicit scope. Any replacement or material behavior change needs explicit approval after affected systems and regression risks are explained.]

## Interaction

[Describe the trigger, visible feedback, action/result, dismissal or reset, and repeated-use behavior. Cover pointer, keyboard, and touch where relevant. Distinguish new behavior from behavior already implemented.]

## Motion

[Describe desired motion, if any, and what it communicates. Specify trigger, affected layers, and how it composes with existing scroll/hover/reveal motion. State “No new motion” if none is needed.]

[Identify transform ownership and reduced-motion fallback. Reuse the current engine and easing language; do not introduce competing loops or scroll hijacking.]

## Responsive Behavior

- Desktop: [Layout, interaction, and motion expectations]
- Tablet: [Reflow and input expectations]
- Mobile: [Stacking, visible information, touch behavior, and disabled desktop-only effects]
- Resize/orientation: [Expected adaptation, or “Existing behavior unchanged”]

[Identify relevant existing breakpoints rather than assuming separate device-specific implementations are needed.]

## Accessibility

- Keyboard: [Activation, focus visibility/order, dismissal/Escape, and focus restoration where relevant]
- Reduced motion: [Equivalent usable state with unnecessary motion disabled/minimized]
- Touch: [Usable targets and essential actions that do not require hover]
- Semantics/contrast: [Labels, appropriate interactive elements, and readable information]

[Do not assume undocumented accessibility features exist. Keep known baseline limitations separate from improvements requested here.]

## Data

[New or changed data model, fields, sources, and rendering consumers. State “No data changes” if applicable.]

[Supply real content or mark missing information explicitly. Prefer extending existing portfolio records over duplicate datasets or repeated hardcoded content.]

## Technical Constraints

- [Allowed files/systems and prohibited changes]
- [Dependency/configuration constraints]
- [Performance and lifecycle constraints]
- [Native scrolling, existing preview/build integration, or other required compatibility]
- [Any additional project-specific constraints]

## Implementation Rules

- Read `AGENTS.md` first.
- Read all required architecture/stability documents: `STABLE_BASELINE.md`, `STABILITY_CONTRACT.md`, `CHANGE_PROTOCOL.md`, `ARCHITECTURE.md`, `MOTION_SYSTEM.md`, and `REGRESSION_CHECKLIST.md`.
- If a required document is missing or unreadable, stop before coding and obtain direction rather than silently skipping it.
- Inspect existing implementation before coding.
- Identify affected/protected systems, reasons for modification, regression risks, and the verification plan before editing.
- Prefer additive changes.
- Do not perform unrelated refactoring.
- Do not replace stable systems without explicit approval.
- Reuse existing architecture where possible, including data, rendering, utilities, event handling, and motion infrastructure.
- If a stable system conflicts with the feature, investigate and extend/work around it rather than removing it for convenience.
- Follow `CHANGE_PROTOCOL.md`; this request does not authorize changes outside its stated scope.

## Regression Requirements

[List existing behavior that must be verified using `REGRESSION_CHECKLIST.md`. Include shared consumers, not only the new feature.]

- [Navigation and relevant existing interactions]
- [Project/experience/service details, Close/Escape, nested scrolling, and body lock release if affected]
- [Hover, reveal, parallax, cursor, and progress composition if affected]
- [Relevant viewport widths, touch/keyboard behavior, and reduced-motion preferences]
- [Typography, spacing, visual hierarchy, and performance]

[For motion changes, include slow/fast scrolling, stepped/rapid wheel input, direction reversals, repeated boundaries, hover while scrolling, and detail open/close. Record physical hardware tests separately from simulated input.]

[Record actual results, known baseline gaps, failures, justified not-applicable checks, and unavailable verification. Do not claim browser interaction stability from builds or screenshots alone.]

## Completion Criteria

Replace these placeholders with specific, measurable conditions:

- [ ] [Given a defined initial state/input, the requested result occurs]
- [ ] [Repeated activation/reset/dismissal produces the expected result without leaks or stale state]
- [ ] [Specified viewport, keyboard/touch, and reduced-motion conditions work]
- [ ] [Named existing behaviors remain unchanged and pass relevant regression checks]
- [ ] [Applicable build/type checks and browser verification are performed and recorded]
- [ ] No unintended loss of existing interactions, motion, responsive behavior, or visual hierarchy remains.
- [ ] Documentation is updated and any remaining verification gaps are disclosed without claiming unperformed tests passed.

## Documentation

Update `CHANGELOG.md` and relevant technical documentation after meaningful authorized feature work, following `CHANGE_PROTOCOL.md`. Include what changed, affected systems, approved behavior differences, verification results, and outstanding limitations.

Update `ARCHITECTURE.md` and/or `MOTION_SYSTEM.md` when the resulting architecture or motion behavior changes significantly. Preserve the historical baseline rather than rewriting it to hide regressions.

## How To Use This Template

Copy this template into a feature request, replace bracketed fields, and remove explanatory placeholders that are no longer needed. Be specific about desired outcomes, what must not change, and observable completion criteria. Use “None,” “Unchanged,” or “Unknown—inspect first” instead of leaving ambiguous blanks.

Provide the completed request to the AI coding agent with instructions to follow the repository documents. The agent must inspect and report impact before coding; unknowns are not permission to invent requirements or redesign protected systems. If a replacement is required, approve that specific change only after its risks and verification plan are clear.
