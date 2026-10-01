import type { RenderTier } from '../scene-host';

/**
 * What each quality tier renders (DESIGN.md section 14). Starting values; Spike 0 calibrates them against
 * measured frame cost (see docs/SPIKE-0.md). Everything is allocated at the maximum once and trimmed with draw
 * ranges and instance counts, so changing tier never rebuilds geometry.
 */
export interface ThreeProfile {
  /** Upper bound for the device pixel ratio. */
  readonly maxDpr: number;
  /** Frame rate cap (frame pacing). */
  readonly maxFps: number;
  /** Visible tunnel points. */
  readonly tunnelPoints: number;
  /** Racks on each side of the server aisle. */
  readonly racksPerSide: number;
  /** Light rings in the tunnel. */
  readonly rings: number;
  /** MSAA. Fixed when the renderer is created, so only the high tier asks for it. */
  readonly antialias: boolean;
}

export const THREE_PROFILES: Readonly<Record<RenderTier, ThreeProfile>> = {
  high: {
    maxDpr: 2,
    maxFps: 60,
    tunnelPoints: 30_000,
    racksPerSide: 24,
    rings: 24,
    antialias: true,
  },
  medium: {
    maxDpr: 1.5,
    maxFps: 60,
    tunnelPoints: 16_000,
    racksPerSide: 16,
    rings: 16,
    antialias: false,
  },
  low: { maxDpr: 1, maxFps: 30, tunnelPoints: 6_000, racksPerSide: 8, rings: 8, antialias: false },
};

/** Allocation sizes (the high tier's counts). */
export const MAX_TUNNEL_POINTS = THREE_PROFILES.high.tunnelPoints;
export const MAX_RACKS_PER_SIDE = THREE_PROFILES.high.racksPerSide;
export const MAX_RINGS = THREE_PROFILES.high.rings;
