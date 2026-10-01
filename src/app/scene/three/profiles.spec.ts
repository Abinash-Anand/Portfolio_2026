import { MAX_RACKS_PER_SIDE, MAX_RINGS, MAX_TUNNEL_POINTS, THREE_PROFILES } from './profiles';

describe('three.js quality profiles', () => {
  const { high, medium, low } = THREE_PROFILES;

  it('every setting steps down monotonically from high to low', () => {
    for (const key of ['maxDpr', 'maxFps', 'tunnelPoints', 'racksPerSide', 'rings'] as const) {
      expect(high[key]).toBeGreaterThanOrEqual(medium[key]);
      expect(medium[key]).toBeGreaterThanOrEqual(low[key]);
    }
  });

  it('low is strictly cheaper than high in the things that cost GPU time', () => {
    expect(low.tunnelPoints).toBeLessThan(high.tunnelPoints);
    expect(low.maxDpr).toBeLessThan(high.maxDpr);
    expect(low.maxFps).toBeLessThan(high.maxFps);
  });

  it('allocates once at the high tier and trims by count, so a tier change never rebuilds geometry', () => {
    expect(MAX_TUNNEL_POINTS).toBe(high.tunnelPoints);
    expect(MAX_RACKS_PER_SIDE).toBe(high.racksPerSide);
    expect(MAX_RINGS).toBe(high.rings);
  });

  it('only the high tier pays for multisampling, which cannot change after the context exists', () => {
    expect(high.antialias).toBe(true);
    expect(medium.antialias).toBe(false);
    expect(low.antialias).toBe(false);
  });
});
