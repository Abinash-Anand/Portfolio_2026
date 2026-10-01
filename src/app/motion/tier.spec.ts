import type { Capabilities } from './capabilities';
import { atLeast, degrade, detectTier, TIER_PROFILES, TIERS, upgrade } from './tier';

const caps = (overrides: Partial<Capabilities> = {}): Capabilities => ({
  reducedMotion: false,
  webgl2: true,
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
  coarsePointer: false,
  saveData: false,
  ...overrides,
});

describe('detectTier', () => {
  it.each([
    ['a strong desktop', caps(), 'high'],
    ['a desktop that does not expose memory', caps({ deviceMemoryGb: null }), 'high'],
    ['a mid-range desktop', caps({ hardwareConcurrency: 6, deviceMemoryGb: 8 }), 'medium'],
    ['a desktop with little memory', caps({ deviceMemoryGb: 4 }), 'medium'],
    ['a 2-core desktop', caps({ hardwareConcurrency: 2 }), 'low'],
    ['a 2 GB desktop', caps({ deviceMemoryGb: 2 }), 'low'],
    [
      'a modern phone',
      caps({ coarsePointer: true, hardwareConcurrency: 8, deviceMemoryGb: 8 }),
      'medium',
    ],
    ['a modest phone', caps({ coarsePointer: true, hardwareConcurrency: 4 }), 'low'],
    ['a 4 GB phone', caps({ coarsePointer: true, deviceMemoryGb: 4 }), 'low'],
    ['reduced motion', caps({ reducedMotion: true }), 'static'],
    ['no WebGL2', caps({ webgl2: false }), 'static'],
    ['Save-Data', caps({ saveData: true }), 'static'],
  ] as const)('%s -> %s', (_name, capabilities, expected) => {
    expect(detectTier(capabilities)).toBe(expected);
  });

  it('never gives phones the high tier', () => {
    expect(
      detectTier(caps({ coarsePointer: true, hardwareConcurrency: 16, deviceMemoryGb: 16 })),
    ).not.toBe('high');
  });

  it('treats unknown core counts as a mid-range device', () => {
    expect(detectTier(caps({ hardwareConcurrency: null, deviceMemoryGb: null }))).toBe('medium');
  });
});

describe('tier ladder', () => {
  it('degrades and upgrades one step and stops at the ends', () => {
    expect(degrade('high')).toBe('medium');
    expect(degrade('low')).toBe('static');
    expect(degrade('static')).toBe('static');
    expect(upgrade('static')).toBe('low');
    expect(upgrade('high')).toBe('high');
  });

  it('orders tiers from richest to poorest', () => {
    expect(atLeast('high', 'low')).toBe(true);
    expect(atLeast('low', 'high')).toBe(false);
    expect(atLeast('medium', 'medium')).toBe(true);
    expect(TIERS[0]).toBe('high');
  });

  it('has a profile for every rendering tier, getting cheaper down the ladder', () => {
    expect(TIER_PROFILES.high.particles).toBeGreaterThan(TIER_PROFILES.medium.particles);
    expect(TIER_PROFILES.medium.particles).toBeGreaterThan(TIER_PROFILES.low.particles);
    expect(TIER_PROFILES.low.maxFps).toBeLessThan(TIER_PROFILES.high.maxFps);
    expect(TIER_PROFILES.low.maxDpr).toBeLessThanOrEqual(TIER_PROFILES.medium.maxDpr);
  });
});
