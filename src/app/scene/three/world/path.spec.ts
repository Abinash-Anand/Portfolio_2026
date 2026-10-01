import { blendPose, catmullRom, pathPose, pingPong, type Waypoint } from './path';

const waypoints: Waypoint[] = [
  { p: [0, 1, 0], look: [0, 1, -5], fov: 50 },
  { p: [2, 2, -10], look: [0, 1, -15] },
  { p: [0, 3, -20], look: [0, 1, -25], fov: 70 },
  { p: [-2, 2, -30], look: [0, 1, -35] },
];

describe('pingPong', () => {
  it('runs 0 to 1 and back, easing to a stop at both ends', () => {
    expect(pingPong(0, 20)).toBeCloseTo(0, 10);
    expect(pingPong(10, 20)).toBeCloseTo(1, 10);
    expect(pingPong(20, 20)).toBeCloseTo(0, 10);
    // Slow at the ends: the first half second covers far less than the middle half second.
    const start = pingPong(0.5, 20) - pingPong(0, 20);
    const middle = pingPong(10.25, 20) - pingPong(9.75, 20);
    expect(Math.abs(start)).toBeGreaterThan(Math.abs(middle));
  });

  it('never leaves the 0 to 1 range, however long the visitor stays', () => {
    for (let t = 0; t < 500; t += 0.7) {
      const u = pingPong(t, 37);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
    }
  });
});

describe('catmullRom', () => {
  it('passes through its two middle control points', () => {
    expect(catmullRom(0, 1, 5, 9, 0)).toBeCloseTo(1, 10);
    expect(catmullRom(0, 1, 5, 9, 1)).toBeCloseTo(5, 10);
  });

  it('is a straight line for evenly spaced points', () => {
    expect(catmullRom(0, 1, 2, 3, 0.5)).toBeCloseTo(1.5, 10);
  });
});

describe('pathPose', () => {
  it('starts exactly at the first waypoint and ends exactly at the last', () => {
    const start = pathPose(waypoints, 0);
    expect([start.px, start.py, start.pz]).toEqual([0, 1, 0]);
    expect(start.fov).toBe(50);

    const end = pathPose(waypoints, 1);
    expect(end.px).toBeCloseTo(-2, 10);
    expect(end.pz).toBeCloseTo(-30, 10);
    expect(end.tz).toBeCloseTo(-35, 10);
  });

  it('passes through every waypoint, at evenly spaced parameters', () => {
    waypoints.forEach((waypoint, i) => {
      const pose = pathPose(waypoints, i / (waypoints.length - 1));
      expect(pose.px).toBeCloseTo(waypoint.p[0], 8);
      expect(pose.py).toBeCloseTo(waypoint.p[1], 8);
      expect(pose.pz).toBeCloseTo(waypoint.p[2], 8);
    });
  });

  it('moves smoothly: no jump between neighbouring parameters', () => {
    let previous = pathPose(waypoints, 0);
    let px = previous.px;
    let pz = previous.pz;
    for (let u = 0.001; u <= 1; u += 0.001) {
      const pose = pathPose(waypoints, u);
      expect(Math.abs(pose.px - px)).toBeLessThan(0.1);
      expect(Math.abs(pose.pz - pz)).toBeLessThan(0.1);
      px = pose.px;
      pz = pose.pz;
      previous = pose;
    }
    expect(previous).toBeDefined();
  });

  it('keeps the field of view of the previous waypoint when one is omitted, and eases between values', () => {
    expect(pathPose(waypoints, 1 / 3).fov).toBeCloseTo(50, 8); // waypoint 1 has none: inherits 50
    expect(pathPose(waypoints, 2 / 3).fov).toBeCloseTo(70, 8);
    const between = pathPose(waypoints, 0.5).fov;
    expect(between).toBeGreaterThan(50);
    expect(between).toBeLessThan(70);
  });

  it('clamps parameters outside 0 to 1 and handles tiny paths', () => {
    expect(pathPose(waypoints, -3).pz).toBe(0);
    expect(pathPose(waypoints, 9).pz).toBeCloseTo(-30, 8);
    expect(pathPose([], 0.5).fov).toBe(60);
    const single = pathPose([{ p: [1, 2, 3], look: [0, 0, 0], fov: 33 }], 0.7);
    expect([single.px, single.py, single.pz, single.fov]).toEqual([1, 2, 3, 33]);
  });

  it('fills the pose it is given, so the per-frame call allocates nothing', () => {
    const out = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 0 };
    expect(pathPose(waypoints, 0.4, out)).toBe(out);
    expect(out.pz).not.toBe(0);
  });
});

describe('blendPose', () => {
  it('moves one pose toward another by a weight, clamped to 0 to 1', () => {
    const a = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 40 };
    const b = { px: 10, py: 20, pz: 30, tx: 1, ty: 2, tz: 3, fov: 80 };
    expect(blendPose({ ...a }, b, 0)).toEqual(a);
    expect(blendPose({ ...a }, b, 1)).toEqual(b);
    expect(blendPose({ ...a }, b, 0.5).px).toBe(5);
    expect(blendPose({ ...a }, b, 7).fov).toBe(80);
    expect(blendPose({ ...a }, b, -1).fov).toBe(40);
  });
});
