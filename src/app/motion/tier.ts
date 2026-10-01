import { TIER_IDS, type TierId } from '../core/experience';
import type { Capabilities } from './capabilities';

/**
 * Quality tiers (DESIGN.md section 14, ARCHITECTURE.md S9). `static` means no WebGL: the 2D resume.
 * Order matters: index 0 is the richest.
 */
export const TIERS = TIER_IDS;
export type Tier = TierId;

/** The user's choice in the HUD: let the app decide, or force a tier. */
export type TierChoice = 'auto' | Tier;

/**
 * First guess from device capabilities. Deliberately conservative; the adaptive governor corrects it at runtime,
 * and Spike 0 calibrates the thresholds on real hardware. Nothing here leaves the browser: only the resulting
 * coarse tier is ever recorded (no raw hardware details, they are fingerprinting vectors).
 */
export function detectTier(c: Capabilities): Tier {
  if (c.reducedMotion || !c.webgl2 || c.saveData) return 'static';

  const cores = c.hardwareConcurrency ?? 4;
  const memory = c.deviceMemoryGb; // null where the browser does not expose it (Firefox, Safari)

  if (c.coarsePointer) {
    // Phones and tablets: never `high`.
    return cores <= 4 || (memory !== null && memory <= 4) ? 'low' : 'medium';
  }
  if (cores <= 2 || (memory !== null && memory <= 2)) return 'low';
  if (cores >= 8 && (memory === null || memory >= 8)) return 'high';
  return 'medium';
}

export function degrade(tier: Tier): Tier {
  return TIERS[Math.min(TIERS.indexOf(tier) + 1, TIERS.length - 1)] ?? 'static';
}

export function upgrade(tier: Tier): Tier {
  return TIERS[Math.max(TIERS.indexOf(tier) - 1, 0)] ?? 'high';
}

/** True when `a` is as rich as, or richer than, `b`. */
export function atLeast(a: Tier, b: Tier): boolean {
  return TIERS.indexOf(a) <= TIERS.indexOf(b);
}

/** Per-tier rendering parameters for the scene (starting values, calibrated in Spike 0). */
export interface TierProfile {
  /** Upper bound for the device pixel ratio. */
  readonly maxDpr: number;
  /** Frame rate cap (frame pacing, S10). */
  readonly maxFps: number;
  /** Particle / node budget for the placeholder scene and later the tunnel. */
  readonly particles: number;
  /** Draw connecting lines between nodes. */
  readonly links: boolean;
}

export const TIER_PROFILES: Readonly<Record<Exclude<Tier, 'static'>, TierProfile>> = {
  high: { maxDpr: 2, maxFps: 60, particles: 140, links: true },
  medium: { maxDpr: 1.5, maxFps: 60, particles: 80, links: true },
  low: { maxDpr: 1, maxFps: 30, particles: 36, links: false },
};
