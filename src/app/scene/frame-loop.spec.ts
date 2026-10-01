import { FrameLoop, type FrameInfo } from './frame-loop';
import { FakeScheduler } from './testing';

function setup(maxFps: number) {
  const scheduler = new FakeScheduler();
  const frames: FrameInfo[] = [];
  const loop = new FrameLoop((frame) => frames.push(frame), maxFps, scheduler);
  return { scheduler, frames, loop };
}

const deltas = (frames: FrameInfo[]): number[] => frames.slice(2).map((f) => f.deltaMs);

describe('FrameLoop', () => {
  it('renders every refresh on a 60 Hz display with a 60 fps cap', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    scheduler.run(60, 1000 / 60);
    expect(frames.length).toBe(60);
  });

  it('renders every 2nd refresh, evenly, on a 144 Hz display (the pacing fix)', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    scheduler.run(144, 1000 / 144);
    // 72 fps in whole refreshes, instead of an uneven 13.9 / 20.8 ms mix.
    expect(frames.length).toBeGreaterThanOrEqual(70);
    expect(frames.length).toBeLessThanOrEqual(74);
    for (const delta of deltas(frames)) expect(delta).toBeCloseTo((2 * 1000) / 144, 0);
  });

  it('renders every 2nd refresh on a 120 Hz display with a 60 fps cap', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    scheduler.run(120, 1000 / 120);
    expect(frames.length).toBeGreaterThanOrEqual(58);
    expect(frames.length).toBeLessThanOrEqual(62);
  });

  it('halves the rate at a 30 fps cap on a 60 Hz display', () => {
    const { scheduler, frames, loop } = setup(30);
    loop.start();
    scheduler.run(60, 1000 / 60);
    expect(frames.length).toBeGreaterThanOrEqual(29);
    expect(frames.length).toBeLessThanOrEqual(31);
    for (const delta of deltas(frames)) expect(delta).toBeCloseTo(1000 / 30, 0);
  });

  it('reports the expected frame time alongside the actual one', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    scheduler.run(40, 1000 / 144);
    const last = frames[frames.length - 1] as FrameInfo;
    expect(last.expectedMs).toBeCloseTo((2 * 1000) / 144, 1);
  });

  it('applies a new cap from the next frames', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    const now = scheduler.run(30, 1000 / 60);
    const before = frames.length;
    loop.setMaxFps(30);
    scheduler.run(60, 1000 / 60, now);
    expect(frames.length - before).toBeGreaterThanOrEqual(29);
    expect(frames.length - before).toBeLessThanOrEqual(32);
  });

  it('is not thrown off by a stall such as a hidden tab', () => {
    const { scheduler, frames, loop } = setup(60);
    loop.start();
    let now = scheduler.run(10, 1000 / 60);
    scheduler.step(now + 5000); // tab hidden for 5 s
    now += 5000 + 1000 / 60;
    const before = frames.length;
    scheduler.run(60, 1000 / 60, now);
    expect(frames.length - before).toBeGreaterThanOrEqual(58);
  });

  it('starts and stops cleanly, and stop() cancels the pending frame', () => {
    const { scheduler, loop } = setup(60);
    expect(loop.running).toBe(false);
    loop.start();
    expect(loop.running).toBe(true);
    expect(scheduler.pending).toBe(true);
    loop.start(); // idempotent
    loop.stop();
    expect(loop.running).toBe(false);
    expect(scheduler.pending).toBe(false);
  });
});
