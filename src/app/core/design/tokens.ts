/**
 * Design tokens as code, for consumers that cannot read CSS (the 3D scene, canvas drawing, the styleguide).
 * The CSS in src/styles.css (`@theme static`) is the source of truth; scripts/lib/tokens.spec.ts fails
 * if the two ever drift apart. Rules and rationale: docs/DESIGN.md.
 */

export const COLORS = {
  void: '#0a0d12',
  surface: '#0f141b',
  raised: '#161d27',
  text: '#e6edf3',
  muted: '#9aa4b2',
  faint: '#6b7686',
  blue: '#3b82f6',
  'blue-soft': '#60a5fa',
  emerald: '#34d399',
  'emerald-deep': '#10b981',
  cyan: '#22d3ee',
  gold: '#f2c14e',
  yellow: '#facc15',
  violet: '#a78bfa',
  'violet-deep': '#8b5cf6',
  indigo: '#818cf8',
  'indigo-deep': '#6366f1',
  danger: '#f87171',
} as const;

export type ColorToken = keyof typeof COLORS;

/** Tokens that may be used for TEXT (they meet WCAG AA on `void` and `surface`). */
export const TEXT_SAFE: readonly ColorToken[] = [
  'text',
  'muted',
  'blue',
  'blue-soft',
  'emerald',
  'cyan',
  'gold',
  'yellow',
  'violet',
  'indigo',
  'danger',
];

/** Tokens for graphics, glows and decoration only. */
export const GRAPHICS_ONLY: readonly ColorToken[] = [
  'faint',
  'emerald-deep',
  'violet-deep',
  'indigo-deep',
];

/** What each hue means (DESIGN.md section 3.2). */
export const SEMANTICS: Readonly<Record<string, readonly ColorToken[]>> = {
  'Client, structure, interaction': ['blue'],
  'Request packet': ['cyan'],
  'Response payload': ['gold'],
  'Backend vault': ['indigo', 'violet'],
  'Status, terminal, success': ['emerald'],
  'Database query': ['yellow'],
  Error: ['danger'],
};

/** Motion tokens (DESIGN.md section 6.1). Durations in milliseconds. */
export const MOTION = {
  durations: { instant: 80, fast: 150, base: 250, slow: 500 },
  /** Journey length caps: first visit, repeat visit, reduced motion (no journey). */
  journeyMs: { first: 4000, repeat: 2000, reduced: 0 },
  easings: {
    glide: 'cubic-bezier(0.16, 1, 0.3, 1)',
    standard: 'cubic-bezier(0.65, 0, 0.35, 1)',
    snap: 'cubic-bezier(0.2, 0.9, 0.1, 1)',
  },
} as const;
