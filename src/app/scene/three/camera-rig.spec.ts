import { CameraRig, damp, portraitFactor, targetPose } from './camera-rig';

const centered = { x: 0, y: 0 };

describe('camera poses', () => {
  it('boot looks at the headset from a short distance', () => {
    const pose = targetPose('boot', 0, centered, 1.6);
    expect(pose.pz).toBeGreaterThan(0);
    expect([pose.tx, pose.tz]).toEqual([0, 0]);
    expect(pose.ty).toBeGreaterThan(0); // looks a little above the headset, which leaves room for the prompt
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

  it('stays in the tunnel, at full warp, while a room is not ready yet', () => {
    const room = targetPose('room', 0, centered, 1.6);
    const tunnel = targetPose('journey', 5, centered, 1.6);
    expect(room).toEqual(tunnel);
  });

  it('measures how much wider a portrait screen needs the field of view', () => {
    expect(portraitFactor(2)).toBe(1);
    expect(portraitFactor(1)).toBe(1);
    expect(portraitFactor(0.5)).toBeCloseTo(Math.SQRT2, 10);
    expect(portraitFactor(0.01)).toBe(1.6);
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
  const at = (pz: number, fov = 60) => ({ px: 0, py: 0, pz, tx: 0, ty: 0, tz: -1, fov });

  it('starts exactly on the first target, then eases toward later ones', () => {
    const rig = new CameraRig();
    const first = { ...rig.update(1 / 60, at(5)) };
    expect(first.pz).toBe(5);

    const next = rig.update(1 / 60, at(-20));
    expect(next.pz).toBeLessThan(5);
    expect(next.pz).toBeGreaterThan(-20); // has not teleported
  });

  it('arrives at a steady target and stays there', () => {
    const rig = new CameraRig();
    rig.update(1 / 60, at(0));
    for (let i = 0; i < 600; i++) rig.update(1 / 60, at(-10, 80));
    expect(rig.pose.pz).toBeCloseTo(-10, 3);
    expect(rig.pose.fov).toBeCloseTo(80, 3);
  });
});
