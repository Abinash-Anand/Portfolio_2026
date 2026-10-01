import type { FrameScheduler } from './frame-loop';

/** Test double for requestAnimationFrame: you decide when each display refresh happens. */
export class FakeScheduler implements FrameScheduler {
  private callback: ((now: number) => void) | null = null;
  private nextId = 1;

  request(callback: (now: number) => void): number {
    this.callback = callback;
    return this.nextId++;
  }

  cancel(): void {
    this.callback = null;
  }

  get pending(): boolean {
    return this.callback !== null;
  }

  /** Delivers one display refresh at time `now` (ms). */
  step(now: number): void {
    const callback = this.callback;
    this.callback = null;
    callback?.(now);
  }

  /** Runs `count` refreshes of `periodMs` starting at `start`; returns the time after the last one. */
  run(count: number, periodMs: number, start = 1000): number {
    let now = start;
    for (let i = 0; i < count; i++) {
      this.step(now);
      now += periodMs;
    }
    return now;
  }
}
