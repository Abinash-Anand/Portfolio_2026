import type { Pose } from '../camera-rig';

/**
 * Camera paths for the rooms: a handful of waypoints the camera glides through, smoothly (Catmull-Rom), with a
 * ping-pong clock so a room that is read for minutes keeps moving without ever jumping. Pure maths, no Three.js.
 */

type Vec3 = readonly [number, number, number];

export interface Waypoint {
  /** Camera position. */
  readonly p: Vec3;
  /** What the camera looks at. */
  readonly look: Vec3;
  /** Vertical field of view in degrees; the previous waypoint's value carries on when omitted. */
  readonly fov?: number;
}

/** 0 to 1 and back again, easing to a stop at both ends: one full cycle every `period` seconds. */
export function pingPong(t: number, period: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);
}

/** Catmull-Rom interpolation of one coordinate between p1 and p2 (p0 and p3 shape the tangents). */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * The pose `u` of the way (0 to 1) along the waypoints. Passes exactly through every waypoint; u = 0 is the first
 * and u = 1 the last. Fills `out` when given, so the per-frame call allocates nothing.
 */
export function pathPose(
  points: readonly Waypoint[],
  u: number,
  out: Pose = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 60 },
): Pose {
  const count = points.length;
  if (count === 0) return out;
  if (count === 1) return writePose(out, points[0]!);

  const clamped = Math.min(1, Math.max(0, u));
  const scaled = clamped * (count - 1);
  const i = Math.min(count - 2, Math.floor(scaled));
  const f = scaled - i;

  const a = points[Math.max(0, i - 1)]!;
  const b = points[i]!;
  const c = points[i + 1]!;
  const d = points[Math.min(count - 1, i + 2)]!;

  out.px = catmullRom(a.p[0], b.p[0], c.p[0], d.p[0], f);
  out.py = catmullRom(a.p[1], b.p[1], c.p[1], d.p[1], f);
  out.pz = catmullRom(a.p[2], b.p[2], c.p[2], d.p[2], f);
  out.tx = catmullRom(a.look[0], b.look[0], c.look[0], d.look[0], f);
  out.ty = catmullRom(a.look[1], b.look[1], c.look[1], d.look[1], f);
  out.tz = catmullRom(a.look[2], b.look[2], c.look[2], d.look[2], f);
  const fovB = fovAt(points, i);
  const fovC = fovAt(points, i + 1);
  out.fov = fovB + (fovC - fovB) * (f * f * (3 - 2 * f));
  return out;
}

/** The field of view in force at waypoint `index`: its own, else the nearest earlier one, else 60. */
function fovAt(points: readonly Waypoint[], index: number): number {
  for (let i = index; i >= 0; i--) {
    const fov = points[i]!.fov;
    if (fov !== undefined) return fov;
  }
  return 60;
}

function writePose(out: Pose, at: Waypoint): Pose {
  out.px = at.p[0];
  out.py = at.p[1];
  out.pz = at.p[2];
  out.tx = at.look[0];
  out.ty = at.look[1];
  out.tz = at.look[2];
  out.fov = at.fov ?? 60;
  return out;
}

/** Blends pose `b` into `a` by `weight` (0 = a, 1 = b), in place on `a`. */
export function blendPose(a: Pose, b: Pose, weight: number): Pose {
  const w = Math.min(1, Math.max(0, weight));
  a.px += (b.px - a.px) * w;
  a.py += (b.py - a.py) * w;
  a.pz += (b.pz - a.pz) * w;
  a.tx += (b.tx - a.tx) * w;
  a.ty += (b.ty - a.ty) * w;
  a.tz += (b.tz - a.tz) * w;
  a.fov += (b.fov - a.fov) * w;
  return a;
}
