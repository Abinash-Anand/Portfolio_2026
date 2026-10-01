import { InstancedMesh, Matrix4, Points, ShaderMaterial } from 'three';
import { MAX_RACKS_PER_SIDE, MAX_RINGS, MAX_TUNNEL_POINTS } from '../profiles';
import { ConsoleRoom, keyPosition } from './console-room';
import { Headset } from './headset';
import { Tunnel } from './tunnel';
import { hash, Vault } from './vault';

let seed = 11;
const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

const instanced = (root: { children: unknown[] }): InstancedMesh[] =>
  root.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);

/** Advances a part by `seconds` of 60 fps frames. */
function run(part: { update(dt: number, now: number): void }, seconds: number, from = 0): number {
  let now = from;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    now += 1 / 60;
    part.update(1 / 60, now);
  }
  return now;
}

describe('Tunnel', () => {
  const uniforms = (tunnel: Tunnel) =>
    (tunnel.object.children.find((c) => c instanceof Points) as Points<never, ShaderMaterial>)
      .material.uniforms;

  it('is hidden until a packet flies, and hides again once it has come to rest', () => {
    const tunnel = new Tunnel(random);
    expect(tunnel.object.visible).toBe(false);

    tunnel.setFlying(true);
    expect(tunnel.object.visible).toBe(true);
    run(tunnel, 1);
    expect(uniforms(tunnel)['uOffset']!.value).toBeGreaterThan(10); // it streamed

    tunnel.setFlying(false);
    run(tunnel, 4);
    expect(tunnel.object.visible).toBe(false);
    tunnel.dispose();
  });

  it('trims points and rings by count without rebuilding, and never beyond what was allocated', () => {
    const tunnel = new Tunnel(random);
    const points = tunnel.object.children.find((c) => c instanceof Points) as Points;

    tunnel.setPointCount(6000);
    expect(points.geometry.drawRange.count).toBe(6000);
    tunnel.setPointCount(10_000_000);
    expect(points.geometry.drawRange.count).toBe(MAX_TUNNEL_POINTS);

    const rings = instanced(tunnel.object)[0]!;
    tunnel.setRingCount(8);
    expect(rings.count).toBe(8);
    tunnel.setRingCount(999);
    expect(rings.count).toBe(MAX_RINGS);
    tunnel.dispose();
  });

  it('turns from request-cyan to response-gold when returning', () => {
    const tunnel = new Tunnel(random);
    tunnel.setFlying(true);
    run(tunnel, 0.1);
    expect(uniforms(tunnel)['uMix']!.value).toBeLessThan(0.1);
    tunnel.setReturning(true);
    run(tunnel, 2);
    expect(uniforms(tunnel)['uMix']!.value).toBeGreaterThan(0.95);
    tunnel.dispose();
  });

  it('releases the glyph atlas with everything else', () => {
    const tunnel = new Tunnel(random);
    const released = tunnel.dispose();
    expect(released.textures).toBe(1);
    expect(released.geometries).toBeGreaterThanOrEqual(2);
  });
});

describe('Vault', () => {
  it('is hidden until the visitor is in a room, and trims racks per side', () => {
    const vault = new Vault();
    expect(vault.object.visible).toBe(false);

    const [racks, leds] = instanced(vault.object);
    vault.setRackCount(8);
    expect(racks!.count).toBe(16);
    expect(leds!.count).toBe(16);
    vault.setRackCount(500);
    expect(racks!.count).toBe(MAX_RACKS_PER_SIDE * 2);
    vault.dispose();
  });

  it('retints the LEDs and the core per endpoint', () => {
    const vault = new Vault();
    const leds = instanced(vault.object)[1]!.material as ShaderMaterial;
    const before = leds.uniforms['uColorA']!.value.getHex();
    vault.setTint('gold', 'yellow');
    expect(leds.uniforms['uColorA']!.value.getHex()).not.toBe(before);
    vault.dispose();
  });

  it('animates only while it is visible', () => {
    const vault = new Vault();
    const leds = instanced(vault.object)[1]!.material as ShaderMaterial;
    vault.update(1, 5);
    expect(leds.uniforms['uTime']!.value).toBe(0); // hidden: no work

    vault.object.visible = true;
    vault.update(1, 5);
    expect(leds.uniforms['uTime']!.value).toBe(5);
    vault.dispose();
  });

  it('instances its racks, so the room stays a few dozen draw calls at most', () => {
    const vault = new Vault();
    const meshes: unknown[] = [];
    vault.object.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh || (o as { isLine?: boolean }).isLine) meshes.push(o);
    });
    expect(meshes.length).toBeLessThan(30);
    vault.dispose();
  });

  it('lays itself out the same way every time (deterministic hash in [0, 1))', () => {
    for (let i = 0; i < 200; i++) {
      const value = hash(i);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(hash(i)).toBe(value);
    }
    expect(hash(1)).not.toBe(hash(2));
  });
});

describe('Headset', () => {
  it('flies at the camera and then disappears', () => {
    const headset = new Headset();
    expect(headset.object.visible).toBe(true);
    headset.fly();
    run(headset, 0.5);
    expect(headset.object.visible).toBe(true);
    expect(headset.object.scale.x).toBeGreaterThan(1);
    run(headset, 1);
    expect(headset.gone).toBe(true);
    headset.dispose();
  });

  it('comes back to rest on reset, and can be dismissed without a flight', () => {
    const headset = new Headset();
    headset.fly();
    run(headset, 2);
    headset.reset();
    expect(headset.object.visible).toBe(true);
    expect(headset.object.scale.x).toBe(1);

    headset.dismiss();
    expect(headset.gone).toBe(true);
    headset.dispose();
  });

  it('glows brighter while its DOM twin is hovered, and relaxes afterwards', () => {
    const headset = new Headset();
    const material = (headset.object.children[1] as unknown as { material: { opacity: number } })
      .material;
    const now = run(headset, 1);
    const resting = material.opacity;
    headset.setHover(true);
    const later = run(headset, 1, now);
    expect(material.opacity).toBeGreaterThan(resting);
    headset.setHover(false);
    run(headset, 2, later);
    expect(material.opacity).toBeCloseTo(resting, 1);
    headset.dispose();
  });
});

describe('ConsoleRoom', () => {
  it('lays the five keys out left to right, symmetrical about the middle', () => {
    const xs = [0, 1, 2, 3, 4].map((i) => keyPosition(i).x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(xs[2]).toBeCloseTo(0, 10);
    expect(xs[0]).toBeCloseTo(-xs[4]!, 10);
  });

  it('presses only the chosen key down, and releases it again', () => {
    const room = new ConsoleRoom();
    room.object.visible = true;
    const caps = instanced(room.object)[0]!;
    const height = (i: number): number => {
      const matrix = new Matrix4();
      caps.getMatrixAt(i, matrix);
      return matrix.elements[13]!;
    };

    room.press(2);
    run(room, 1);
    expect(height(2)).toBeLessThan(height(0) - 0.05);
    expect(height(0)).toBeCloseTo(height(4), 5);

    room.press(-1);
    run(room, 1);
    expect(height(2)).toBeCloseTo(height(0), 2);
    room.dispose();
  });

  it('does no work while hidden', () => {
    const room = new ConsoleRoom();
    const caps = instanced(room.object)[0]!;
    room.press(1);
    const version = caps.instanceMatrix.version;
    run(room, 0.5);
    expect(caps.instanceMatrix.version).toBe(version);
    room.dispose();
  });
});
