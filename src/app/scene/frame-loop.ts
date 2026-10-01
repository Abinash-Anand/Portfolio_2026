/**
 * The single render loop (ARCHITECTURE.md S2). Pure TypeScript with an injectable scheduler, so it can be
 * driven deterministically in tests.
 *
 * Frame pacing (S10): the loop renders on every Nth display refresh, where N is the whole number that gets
 * closest to `maxFps`. On a 144 Hz display with a 60 fps cap that means every 2nd refresh (72 fps, perfectly
 * even), instead of an uneven mix of 13.9 ms and 20.8 ms frames, which looks like jitter.
 */

export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export const BROWSER_SCHEDULER: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface FrameInfo {
  /** Milliseconds since the previous rendered frame. */
  readonly deltaMs: number;
  /** Milliseconds a frame is expected to take at the current pacing. */
  readonly expectedMs: number;
  readonly now: number;
}

/** Number of refreshes sampled to estimate the display's refresh period. */
const SAMPLE_FRAMES = 20;

export class FrameLoop {
  private requestId: number | null = null;
  private lastRefresh = 0;
  private lastRendered = 0;
  private refreshesSeen = 0;
  private period = 1000 / 60;
  private skip = 1;
  private cap: number;

  constructor(
    private readonly tick: (frame: FrameInfo) => void,
    maxFps = 60,
    private readonly scheduler: FrameScheduler = BROWSER_SCHEDULER,
  ) {
    this.cap = maxFps;
  }

  get running(): boolean {
    return this.requestId !== null;
  }

  /** Changes the cap; takes effect from the next frame. */
  setMaxFps(maxFps: number): void {
    this.cap = maxFps;
    this.skip = this.skipFor(this.period);
  }

  start(): void {
    if (this.running) return;
    this.lastRefresh = 0;
    this.lastRendered = 0;
    this.refreshesSeen = 0;
    this.requestId = this.scheduler.request(this.onRefresh);
  }

  stop(): void {
    if (this.requestId !== null) this.scheduler.cancel(this.requestId);
    this.requestId = null;
  }

  private skipFor(period: number): number {
    return Math.max(1, Math.round(1000 / this.cap / period));
  }

  private readonly onRefresh = (now: number): void => {
    this.requestId = this.scheduler.request(this.onRefresh);

    if (this.lastRefresh !== 0) {
      const delta = now - this.lastRefresh;
      // Learn the refresh period from the first frames (ignore stalls such as a hidden tab).
      if (this.refreshesSeen < SAMPLE_FRAMES && delta > 1 && delta < 40) {
        this.period = this.refreshesSeen === 0 ? delta : Math.min(this.period, delta);
        this.refreshesSeen++;
        this.skip = this.skipFor(this.period);
      }
    }
    this.lastRefresh = now;

    if (this.lastRendered === 0) {
      this.lastRendered = now;
      this.render(now, this.period * this.skip);
      return;
    }
    // Render when at least (skip - 0.5) refresh periods have passed: tolerant of timer noise, still even.
    const delta = now - this.lastRendered;
    if (delta >= this.period * (this.skip - 0.5)) {
      this.lastRendered = now;
      this.render(now, delta);
    }
  };

  private render(now: number, deltaMs: number): void {
    this.tick({ deltaMs, expectedMs: this.period * this.skip, now });
  }
}
