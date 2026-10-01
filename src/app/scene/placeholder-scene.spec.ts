import { TIER_PROFILES } from '../motion/tier';
import { PlaceholderSceneHost } from './placeholder-scene';
import { FakeScheduler } from './testing';

function fakeCanvas() {
  const ops = { fillRect: 0, stroke: 0, clears: 0 };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: () => ops.fillRect++,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    stroke: () => ops.stroke++,
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ops };
}

function setup() {
  const scheduler = new FakeScheduler();
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const host = new PlaceholderSceneHost({ scheduler, random });
  const { canvas, ops } = fakeCanvas();
  return { host, scheduler, canvas, ops };
}

describe('PlaceholderSceneHost', () => {
  it('creates a node budget per tier and changes it when the tier changes', () => {
    const { host, canvas } = setup();
    host.setTier('high');
    host.mount(canvas);
    expect(host.nodeCount).toBe(TIER_PROFILES.high.particles);
    host.setTier('low');
    expect(host.nodeCount).toBe(TIER_PROFILES.low.particles);
    host.setTier('medium');
    expect(host.nodeCount).toBe(TIER_PROFILES.medium.particles);
  });

  it('caps the canvas resolution by tier (device pixel ratio)', () => {
    const { host, canvas } = setup();
    host.setTier('high');
    host.mount(canvas);
    host.resize(1000, 500, 3);
    expect(canvas.width).toBe(1000 * TIER_PROFILES.high.maxDpr);
    host.setTier('low');
    expect(canvas.width).toBe(1000 * TIER_PROFILES.low.maxDpr);
  });

  it('draws every frame and reports draw calls, fps and the engine name', () => {
    const { host, scheduler, canvas, ops } = setup();
    host.setTier('medium');
    host.mount(canvas);
    host.resize(800, 600, 1);
    scheduler.run(60, 1000 / 60);
    expect(ops.fillRect).toBeGreaterThan(60);
    const stats = host.stats();
    expect(stats.drawCalls).toBeGreaterThan(0);
    expect(stats.fps).toBeGreaterThan(50);
    expect(stats.frameMs).toBeGreaterThan(10);
    expect(stats.engine).toContain('PLACEHOLDER');
    expect(stats.triangles).toBe(0);
  });

  it('feeds the governor a 60 fps-normalised frame time', () => {
    const { host, scheduler, canvas } = setup();
    host.setTier('high');
    host.mount(canvas);
    const times: number[] = [];
    host.onFrameTime = (ms) => times.push(ms);
    scheduler.run(60, 1000 / 144); // 144 Hz, paced to every 2nd refresh
    const steady = times.slice(5);
    expect(steady.length).toBeGreaterThan(10);
    for (const ms of steady) expect(ms).toBeCloseTo(1000 / 60, 0); // exactly on target
  });

  it('eases toward streaks while travelling and back to dots afterwards', () => {
    const { host, scheduler, canvas } = setup();
    host.setTier('medium');
    host.mount(canvas);
    host.resize(800, 600, 1);
    host.setSnapshot({ phase: 'journey', endpoint: 'about' });
    const now = scheduler.run(120, 1000 / 60);
    expect(host.visual.streak).toBeGreaterThan(0.9);
    expect(host.visual.speed).toBeGreaterThan(0.8);

    host.setSnapshot({ phase: 'room', endpoint: 'about' });
    scheduler.run(240, 1000 / 60, now);
    expect(host.visual.streak).toBeLessThan(0.1);
  });

  it('pauses without drawing and resumes, and dispose is final and safe to repeat', () => {
    const { host, scheduler, canvas, ops } = setup();
    host.mount(canvas);
    scheduler.run(5, 16);
    host.pause();
    expect(scheduler.pending).toBe(false);
    const drawn = ops.fillRect;
    scheduler.run(5, 16); // nothing scheduled, nothing drawn
    expect(ops.fillRect).toBe(drawn);

    host.resume();
    expect(scheduler.pending).toBe(true);
    host.dispose();
    expect(scheduler.pending).toBe(false);
    host.resume(); // must not restart after dispose
    expect(scheduler.pending).toBe(false);
    expect(() => host.dispose()).not.toThrow();
    expect(host.nodeCount).toBe(0);
  });

  it('does not count time spent paused as frame time (stats stay sane after a hidden tab)', () => {
    const { host, scheduler, canvas } = setup();
    host.setTier('medium');
    host.mount(canvas);
    host.resize(800, 600, 1);
    let now = scheduler.run(60, 1000 / 60);
    host.pause();
    now += 48_000; // the tab was hidden for 48 s
    host.resume();
    scheduler.run(90, 1000 / 60, now);
    const stats = host.stats();
    expect(stats.fps).toBeGreaterThan(50);
    expect(stats.frameMs).toBeLessThan(25);
  });

  it('does not throw when a 2D context is unavailable', () => {
    const { host, scheduler } = setup();
    host.mount({ width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement);
    expect(() => scheduler.run(10, 16)).not.toThrow();
  });
});
