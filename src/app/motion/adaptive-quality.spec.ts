import {
  AdaptiveQuality,
  DEFAULT_QUALITY_CONFIG,
  type AdaptiveQualityConfig,
} from './adaptive-quality';
import type { Tier } from './tier';

const config: AdaptiveQualityConfig = {
  ...DEFAULT_QUALITY_CONFIG,
  windowFrames: 10,
  cooldownWindows: 1,
};

/** Feeds `windows` full windows of identical frames; returns every tier change in order. */
function run(quality: AdaptiveQuality, frameMs: number, windows: number): Tier[] {
  const changes: Tier[] = [];
  for (let i = 0; i < windows * config.windowFrames; i++) {
    const change = quality.push(frameMs);
    if (change) changes.push(change);
  }
  return changes;
}

describe('AdaptiveQuality', () => {
  it('stays put while frames are healthy', () => {
    const q = new AdaptiveQuality('high', config);
    expect(run(q, 12, 20)).toEqual([]);
    expect(q.tier).toBe('high');
  });

  it('degrades after consecutive bad windows, one step at a time, waiting between steps', () => {
    const q = new AdaptiveQuality('high', config);
    expect(run(q, 40, 1)).toEqual([]); // one bad window is not enough
    expect(run(q, 40, 1)).toEqual(['medium']);
    // cooldown window, then two more bad windows are needed
    expect(run(q, 40, 3)).toEqual(['low']);
  });

  it('does not degrade past static', () => {
    const q = new AdaptiveQuality('low', config);
    run(q, 40, 20);
    expect(q.tier).toBe('static');
    expect(run(q, 40, 10)).toEqual([]);
  });

  it('upgrades slowly (hysteresis) and never above its ceiling', () => {
    const q = new AdaptiveQuality('high', config);
    run(q, 40, 2);
    expect(q.tier).toBe('medium');
    // 1 cooldown window + 6 good windows are needed to climb back
    expect(run(q, 10, 6)).toEqual([]);
    expect(run(q, 10, 1)).toEqual(['high']);
    expect(run(q, 10, 20)).toEqual([]);
    expect(q.tier).toBe('high');
  });

  it('is not fooled by a single huge hitch (for example a tab switch)', () => {
    const q = new AdaptiveQuality('high', config);
    for (let w = 0; w < 10; w++) {
      for (let i = 0; i < config.windowFrames; i++) q.push(i === 0 ? 5000 : 12);
    }
    expect(q.tier).toBe('high');
  });

  it('does not flicker on borderline performance', () => {
    const q = new AdaptiveQuality('high', config);
    // 15% bad frames: neither clearly bad (>=25%) nor clearly good (<=2%).
    for (let w = 0; w < 30; w++) {
      for (let i = 0; i < config.windowFrames; i++) q.push(i % 7 === 0 ? 30 : 12);
    }
    expect(q.tier).toBe('high');
  });
});
