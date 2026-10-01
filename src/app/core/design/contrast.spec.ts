import { AA_GRAPHICS, AA_TEXT, contrastRatio, relativeLuminance } from './contrast';
import { COLORS, GRAPHICS_ONLY, TEXT_SAFE } from './tokens';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('rejects anything that is not #rrggbb', () => {
    expect(() => relativeLuminance('red')).toThrow();
    expect(() => relativeLuminance('#fff')).toThrow();
  });
});

describe('design tokens', () => {
  it.each(TEXT_SAFE)('text token "%s" meets AA as text on void and on surface', (token) => {
    expect(contrastRatio(COLORS[token], COLORS.void)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(COLORS[token], COLORS.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(GRAPHICS_ONLY.filter((t) => t !== 'faint'))(
    'graphics token "%s" meets 3:1 on void',
    (token) => {
      expect(contrastRatio(COLORS[token], COLORS.void)).toBeGreaterThanOrEqual(AA_GRAPHICS);
    },
  );

  it('keeps the owner-specified colors', () => {
    expect(COLORS.void).toBe('#0a0d12');
    expect(COLORS.blue).toBe('#3b82f6');
  });

  it('classifies every token exactly once as text-safe, graphics-only or a surface', () => {
    const surfaces = ['void', 'surface', 'raised'];
    const classified = [...TEXT_SAFE, ...GRAPHICS_ONLY, ...surfaces].sort();
    expect(classified).toEqual(Object.keys(COLORS).sort());
  });
});
