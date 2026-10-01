import { AISLE_LENGTH, CameraRig, damp, targetPose } from './camera-rig';

const centered = { x: 0, y: 0 };

describe('camera poses', () => {
  it('boot looks at the headset from a short distance', () => {
    const pose = targetPose('boot', 0, centered, 1.6);
    expect(pose.pz).toBeGreaterThan(0);
    expect([pose.tx, pose.ty, pose.tz]).toEqual([0, 0, 0]);
  });

  it('shifts the camera a little with the pointer, never a lot', () => {
    const left = targetPose('console', 0, { x: -1, y: 0 }, 1.6);
    const right = targetPose('console', 0, { x: 1, y: 0 }, 1.6);
    expect(right.px).toBeGreaterThan(left.px);
    expect(Math.abs(right.px - left.px)).toBeLessThan(1.5);
  });

  it('widens the field of view on portrait screens, up to a limit', () => {
    const landscape = targetPose('boot', 0, centered, 1.6).fov;
    const portrait = targetPose('boot', 0, centered, 0.5).fov;
    const extreme = targetPose('boot', 0, centered, 0.1).fov;
    expect(portrait).toBeGreaterThan(landscape);
    expect(extreme).toBeCloseTo(landscape * 1.6, 5);
  });

  it('widens the field of view as the packet accelerates, then holds', () => {
    const start = targetPose('journey', 0, centered, 1.6).fov;
    const end = targetPose('journey', 0.8, centered, 1.6).fov;
    const later = targetPose('journey', 5, centered, 1.6).fov;
    expect(end).toBeGreaterThan(start + 10);
    expect(later).toBeCloseTo(end, 5);
  });

  it('keeps the camera inside the server aisle however long the visitor stays', () => {
    for (let t = 0; t < 400; t += 0.5) {
      const pose = targetPose('room', t, centered, 1.6);
      expect(pose.pz).toBeLessThanOrEqual(-2 + 1e-9);
      expect(pose.pz).toBeGreaterThanOrEqual(-2 - AISLE_LENGTH - 1e-9);
      expect(pose.tz).toBeLessThan(pose.pz); // always looking down the aisle
    }
  });
});

describe('damp', () => {
  it('moves toward the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 200; i++) {
      value = damp(value, 10, 5, 1 / 60);
      expect(value).toBeLessThanOrEqual(10);
    }
    expect(value).toBeCloseTo(10, 1);
  });

  it('does nothing when no time passed', () => {
    expect(damp(3, 10, 5, 0)).toBe(3);
  });

  it('is frame-rate independent: two half steps equal one whole step', () => {
    const whole = damp(0, 10, 4, 0.1);
    const halves = damp(damp(0, 10, 4, 0.05), 10, 4, 0.05);
    expect(halves).toBeCloseTo(whole, 10);
  });
});

describe('CameraRig', () => {
  it('starts exactly on the first target, then eases toward later ones', () => {
    const rig = new CameraRig();
    const first = { ...rig.update(1 / 60, 'console', 0, centered, 1.6) };
    expect(first.pz).toBeCloseTo(targetPose('console', 0, centered, 1.6).pz, 10);

    const next = rig.update(1 / 60, 'room', 0, centered, 1.6);
    const target = targetPose('room', 0, centered, 1.6);
    expect(next.pz).not.toBeCloseTo(target.pz, 3); // has not teleported
    expect(Math.abs(next.pz - target.pz)).toBeLessThan(Math.abs(first.pz - target.pz));
  });
});
