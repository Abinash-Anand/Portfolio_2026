import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../../src/app/core/design/tokens';

/**
 * The CSS (`@theme static` in src/styles.css) is the source of truth for design tokens; tokens.ts mirrors
 * it for code that cannot read CSS (the 3D scene). This test keeps the two from drifting apart.
 */
describe('design tokens: CSS and TypeScript agree', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');
  const theme = css.slice(css.indexOf('@theme static'), css.indexOf('/* Durations'));
  const fromCss = Object.fromEntries(
    [...theme.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [
      m[1],
      m[2]?.toLowerCase(),
    ]),
  );

  it.each(Object.entries(COLORS))('--color-%s is %s in CSS', (name, hex) => {
    expect(fromCss[name]).toBe(hex);
  });

  it('has no hex color in CSS that is missing from tokens.ts', () => {
    expect(Object.keys(fromCss).sort()).toEqual(Object.keys(COLORS).sort());
  });
});
