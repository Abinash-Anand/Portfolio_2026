import { degrade, upgrade, type Tier } from './tier';

export interface AdaptiveQualityConfig {
  /** A frame slower than this counts as "bad" (about 1.25x the 60 fps budget). */
  readonly badFrameMs: number;
  /** Frames per evaluation window. */
  readonly windowFrames: number;
  /** A window is bad when at least this share of its frames is bad. */
  readonly badShare: number;
  /** A window is good when at most this share is bad. */
  readonly goodShare: number;
  /** Consecutive bad windows before degrading. */
  readonly degradeAfter: number;
  /** Consecutive good windows before upgrading (larger than degradeAfter: hysteresis). */
  readonly upgradeAfter: number;
  /** Windows ignored after any tier change, so the new tier can settle. */
  readonly cooldownWindows: number;
  /** Single frames longer than this (tab switch, GC hitch) are clamped so they cannot dominate. */
  readonly clampMs: number;
}

export const DEFAULT_QUALITY_CONFIG: AdaptiveQualityConfig = {
  badFrameMs: 21,
  windowFrames: 90,
  badShare: 0.25,
  goodShare: 0.02,
  degradeAfter: 2,
  upgradeAfter: 6,
  cooldownWindows: 2,
  clampMs: 100,
};

/**
 * Adaptive quality governor (ARCHITECTURE.md S9). Feed it frame times; it steps the tier down when frames slip
 * and back up (never above `ceiling`) when there is sustained headroom. Hysteresis: it degrades faster than it
 * upgrades, and waits after every change, so quality never flickers.
 */
export class AdaptiveQuality {
  private current: Tier;
  private frames = 0;
  private badFrames = 0;
  private badStreak = 0;
  private goodStreak = 0;
  private cooldown = 0;

  constructor(
    private readonly ceiling: Tier,
    private readonly config: AdaptiveQualityConfig = DEFAULT_QUALITY_CONFIG,
  ) {
    this.current = ceiling;
  }

  get tier(): Tier {
    return this.current;
  }

  /** Records a frame time. Returns the new tier when the governor changed it, otherwise null. */
  push(frameMs: number): Tier | null {
    this.frames++;
    if (Math.min(frameMs, this.config.clampMs) > this.config.badFrameMs) this.badFrames++;
    if (this.frames < this.config.windowFrames) return null;

    const share = this.badFrames / this.frames;
    this.frames = 0;
    this.badFrames = 0;

    if (this.cooldown > 0) {
      this.cooldown--;
      return null;
    }
    if (share >= this.config.badShare) {
      this.badStreak++;
      this.goodStreak = 0;
    } else if (share <= this.config.goodShare) {
      this.goodStreak++;
      this.badStreak = 0;
    } else {
      this.badStreak = 0;
      this.goodStreak = 0;
    }

    if (this.badStreak >= this.config.degradeAfter && this.current !== 'static') {
      return this.change(degrade(this.current));
    }
    if (this.goodStreak >= this.config.upgradeAfter && this.current !== this.ceiling) {
      return this.change(upgrade(this.current));
    }
    return null;
  }

  private change(next: Tier): Tier {
    this.current = next;
    this.badStreak = 0;
    this.goodStreak = 0;
    this.cooldown = this.config.cooldownWindows;
    return next;
  }
}
