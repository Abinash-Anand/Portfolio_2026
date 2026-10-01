import type { BenchApi, RenderInfo, SceneHost, SceneStats } from '../scene-host';
import { runCost, runLifecycle, runLive, runStressCurve } from './runner';

const emptyInfo: RenderInfo = {
  calls: 4,
  triangles: 100,
  points: 50,
  lines: 0,
  geometries: 24,
  textures: 2,
  programs: 3,
};

/** A host whose benchmark hooks return fixed numbers, so the runner's bookkeeping can be checked exactly. */
function fakeHost(overrides: Partial<BenchApi> = {}) {
  const log: string[] = [];
  const bench: BenchApi = {
    renderCost: vi.fn(async (frames: number) => ({
      cpuMs: Array.from({ length: frames }, () => 1),
      wallMs: Array.from({ length: frames }, () => 4),
      gpuMs: Array.from({ length: frames }, () => 2),
    })),
    info: () => emptyInfo,
    startRecording: vi.fn(),
    stopRecording: vi.fn(() => ({
      deltaMs: [16.7, 16.7, 16.7, 50],
      cpuMs: [1, 1, 1, 1],
      gpuMs: [],
    })),
    setStress: vi.fn(),
    enableGpuTiming: vi.fn(() => true),
    residual: () => ({ ...emptyInfo, geometries: 0, textures: 0 }),
    whenCompiled: () => Promise.resolve(),
    warmUp: async () => [30, 20, 10],
    ...overrides,
  };
  const host = {
    engine: 'FAKE',
    onFrameTime: null,
    bench,
    mount: vi.fn(),
    setSnapshot: vi.fn((s: { phase: string }) => log.push(`phase:${s.phase}`)),
    setTier: vi.fn((t: string) => log.push(`tier:${t}`)),
    resize: vi.fn((w: number, h: number, d: number) => log.push(`size:${w}x${h}@${d}`)),
    pause: vi.fn(() => log.push('pause')),
    resume: vi.fn(() => log.push('resume')),
    dispose: vi.fn(),
    stats: (): SceneStats => ({ engine: 'FAKE', fps: 0, frameMs: 0, drawCalls: 0, triangles: 0 }),
  };
  return { host: host as unknown as SceneHost, bench, log };
}

describe('benchmark runner', () => {
  it('refuses to run against a scene without benchmark hooks', async () => {
    const { host } = fakeHost();
    (host as { bench?: unknown }).bench = undefined;
    await expect(runCost(host)).rejects.toThrow('no benchmark hooks');
  });

  describe('cost', () => {
    it('measures every tier and phase at a fixed reference size, then puts the real size back', async () => {
      const { host, log } = fakeHost();
      const rows = await runCost(host, {
        frames: 10,
        restore: { width: 800, height: 600, dpr: 2 },
      });

      expect(rows).toHaveLength(3 * 4);
      expect(rows[0]).toMatchObject({ tier: 'high', phase: 'boot' });
      expect(rows[11]).toMatchObject({ tier: 'low', phase: 'room' });
      expect(rows[0]!.cpu.p50).toBe(1);
      expect(rows[0]!.wall.p50).toBe(4);
      expect(rows[0]!.gpu?.p50).toBe(2);
      expect(rows[0]).toMatchObject({ calls: 4, triangles: 100, points: 50, geometries: 24 });

      // The loop is paused while the benchmark drives frames, and everything is restored afterwards.
      expect(log[0]).toBe('pause');
      expect(log).toContain('size:1920x1080@1');
      expect(log.slice(-2)).toEqual(['size:800x600@2', 'resume']);
    });

    it('warms up before measuring and reports no GPU summary when timer queries are unavailable', async () => {
      const { host, bench } = fakeHost({
        renderCost: vi.fn(async (frames: number) => ({
          cpuMs: Array.from({ length: frames }, () => 1),
          wallMs: Array.from({ length: frames }, () => 4),
          gpuMs: [],
        })),
      });
      const rows = await runCost(host, { frames: 5, tiers: ['low'], phases: ['room'] });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.gpu).toBeNull();
      const frameCounts = (bench.renderCost as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => c[0],
      );
      expect(frameCounts).toEqual([20, 5]); // warm-up first, then the measured frames
    });
  });

  describe('stress curve', () => {
    it('measures each overdraw level and always removes the stress afterwards', async () => {
      const { host, bench, log } = fakeHost();
      const rows = await runStressCurve(host, [0, 8, 16], 5);
      expect(rows.map((r) => r.layers)).toEqual([0, 8, 16]);
      const setStress = bench.setStress as ReturnType<typeof vi.fn>;
      expect(setStress.mock.calls.map((c) => c[0])).toEqual([0, 8, 16, 0]);
      expect(log).toEqual(['pause', 'resume']);
    });
  });

  describe('live', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('records for the requested time and summarises what a visitor would have seen', async () => {
      const { host, bench } = fakeHost();
      const pending = runLive(host, { seconds: 10, readTier: () => 'medium' });
      await vi.advanceTimersByTimeAsync(10_000);
      const result = await pending;

      expect(bench.startRecording).toHaveBeenCalledTimes(1);
      expect(result.seconds).toBe(10);
      expect(result.refreshHz).toBe(60);
      expect(result.frameMs.max).toBe(50);
      expect(result.stutterRatio).toBe(0.25); // one of four frames took three refreshes
      expect(result.gpuMs.n).toBe(0);
      expect(result.tierAtEnd).toBe('medium');
    });

    it('can hold the main thread on purpose, to see what stalls cost', async () => {
      const { host } = fakeHost();
      const busy = vi.spyOn(performance, 'now');
      let clock = 0;
      busy.mockImplementation(() => (clock += 20)); // every read advances time, so the busy loop ends
      const pending = runLive(host, { seconds: 1, contention: { busyMs: 40, everyMs: 250 } });
      await vi.advanceTimersByTimeAsync(1000);
      await pending;
      expect(busy.mock.calls.length).toBeGreaterThan(4); // the stalls ran
      busy.mockRestore();
    });
  });

  describe('lifecycle', () => {
    const fresh = () => {
      const { host } = fakeHost();
      return host;
    };

    it('creates, uses and disposes the scene the requested number of times', async () => {
      const create = vi.fn(async () => fresh());
      const canvasGl = {
        isContextLost: () => true,
      };
      const getContext = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(canvasGl as never);

      const result = await runLifecycle(create, 3);

      expect(create).toHaveBeenCalledTimes(3);
      expect(result.cycles).toBe(3);
      expect(result.alive).toHaveLength(3);
      expect(result.contextsReleased).toBe(true);
      expect(result.leaked).toBe(false);
      expect(Object.keys(result.coldFrameMs)).toEqual(
        expect.arrayContaining(['mount (blocking)', 'console', 'journey', 'room']),
      );
      getContext.mockRestore();
    });

    it('flags a leak when resources survive disposal or a context is not released', async () => {
      const leaky = fakeHost({
        residual: () => ({ ...emptyInfo, geometries: 3, textures: 0 }),
      }).host;
      const getContext = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue({ isContextLost: () => false } as never);

      const result = await runLifecycle(async () => leaky, 2);

      expect(result.leaked).toBe(true);
      expect(result.contextsReleased).toBe(false);
      getContext.mockRestore();
    });
  });
});
