import type { ScenePhase } from '../scene-host';

/**
 * The camera for each phase of the experience. Pure math (no Three.js), so it is unit-testable and the same
 * rig can drive a worker-hosted scene later. The state machine decides the phase; this decides where to look.
 */
export interface Pose {
  px: number;
  py: number;
  pz: number;
  /** Look-at target. */
  tx: number;
  ty: number;
  tz: number;
  /** Vertical field of view, in degrees. */
  fov: number;
}

export interface Pointer {
  /** -1 to 1, left to right. */
  x: number;
  /** -1 to 1, bottom to top. */
  y: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Length of the server aisle the camera glides along in the room, in world units. It ends well short of the
 * server core (at z = -33), so the camera never passes through it.
 */
export const AISLE_LENGTH = 24;

/** Where the camera wants to be, `phaseTime` seconds into `phase`. */
export function targetPose(
  phase: ScenePhase,
  phaseTime: number,
  pointer: Pointer,
  aspect: number,
): Pose {
  // Portrait screens need a wider vertical field to keep the same horizontal view.
  const portrait = aspect < 1 ? clamp(1 / Math.sqrt(aspect), 1, 1.6) : 1;

  switch (phase) {
    case 'boot':
      return {
        px: pointer.x * 0.25,
        py: 0.1 + pointer.y * 0.15,
        pz: 4.4,
        tx: 0,
        ty: 0,
        tz: 0,
        fov: 45 * portrait,
      };
    case 'console':
      return {
        px: pointer.x * 0.5,
        py: 1.5 + pointer.y * 0.2,
        pz: 6.2,
        tx: 0,
        ty: 0.2,
        tz: -1.5,
        fov: 55 * portrait,
      };
    case 'journey':
      // The camera stays put; the tunnel streams past. The field of view widens for a sense of speed.
      return {
        px: 0,
        py: 0,
        pz: 0.5,
        tx: 0,
        ty: 0,
        tz: -20,
        fov: (62 + 18 * smoothstep(0, 0.8, phaseTime)) * portrait,
      };
    case 'room': {
      // A slow back-and-forth glide down the aisle.
      const u = 0.5 - 0.5 * Math.cos(phaseTime * 0.1);
      const z = -2 - AISLE_LENGTH * u;
      return {
        px: pointer.x * 0.4,
        py: 1.8 + pointer.y * 0.2,
        pz: z,
        tx: 0,
        ty: 1.2,
        tz: z - 10,
        fov: 62 * portrait,
      };
    }
  }
}

/** Frame-rate independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

const KEYS: readonly (keyof Pose)[] = ['px', 'py', 'pz', 'tx', 'ty', 'tz', 'fov'];

/** Holds the current pose and eases it toward the target of the current phase. */
export class CameraRig {
  readonly pose: Pose = { px: 0, py: 0, pz: 4.4, tx: 0, ty: 0, tz: 0, fov: 45 };
  private initialised = false;

  update(dt: number, phase: ScenePhase, phaseTime: number, pointer: Pointer, aspect: number): Pose {
    const target = targetPose(phase, phaseTime, pointer, aspect);
    if (!this.initialised) {
      Object.assign(this.pose, target);
      this.initialised = true;
      return this.pose;
    }
    for (const key of KEYS)
      this.pose[key] = damp(this.pose[key], target[key], key === 'fov' ? 4 : 3, dt);
    return this.pose;
  }
}
