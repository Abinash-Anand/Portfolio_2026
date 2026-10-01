import { probeCapabilities, type ProbeEnvironment } from './capabilities';

const env = (overrides: Partial<ProbeEnvironment> = {}): ProbeEnvironment => ({
  matchMedia: () => ({ matches: false }),
  navigator: { hardwareConcurrency: 12, deviceMemory: 8 },
  createCanvas: () => ({
    getContext: () => ({ getExtension: () => ({ loseContext: () => undefined }) }),
  }),
  ...overrides,
});

describe('probeCapabilities', () => {
  it('reads media queries, hardware hints and WebGL2 support', () => {
    const result = probeCapabilities(
      env({ matchMedia: (q) => ({ matches: q.includes('pointer: coarse') }) }),
    );
    expect(result).toEqual({
      reducedMotion: false,
      webgl2: true,
      hardwareConcurrency: 12,
      deviceMemoryGb: 8,
      coarsePointer: true,
      saveData: false,
    });
  });

  it('detects reduced motion and Save-Data', () => {
    const result = probeCapabilities(
      env({
        matchMedia: (q) => ({ matches: q.includes('reduced-motion') }),
        navigator: { connection: { saveData: true } },
      }),
    );
    expect(result.reducedMotion).toBe(true);
    expect(result.saveData).toBe(true);
    expect(result.hardwareConcurrency).toBeNull();
    expect(result.deviceMemoryGb).toBeNull();
  });

  it('releases the probe WebGL context so it does not count against the browser limit', () => {
    const loseContext = vi.fn();
    probeCapabilities(
      env({
        createCanvas: () => ({ getContext: () => ({ getExtension: () => ({ loseContext }) }) }),
      }),
    );
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it.each([
    ['getContext returns null', () => ({ getContext: () => null })],
    [
      'getContext throws',
      () => ({
        getContext: () => {
          throw new Error('blocked');
        },
      }),
    ],
  ])('reports no WebGL2 when %s', (_name, createCanvas) => {
    expect(probeCapabilities(env({ createCanvas })).webgl2).toBe(false);
  });

  it('falls back to the safe static profile outside a browser', () => {
    const result = probeCapabilities(null);
    expect(result.reducedMotion).toBe(true);
    expect(result.webgl2).toBe(false);
  });
});
