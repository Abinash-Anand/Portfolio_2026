import {
  AdditiveBlending,
  BufferGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shape,
  TorusGeometry,
} from 'three';
import { damp } from '../camera-rig';
import { disposeObject } from '../dispose';
import { tokenColor } from '../palette';
import { createRadialGlow } from '../textures';
import type { WorldPart } from './part';

const WIDTH = 2.4;
const HEIGHT = 1.05;
const DEPTH = 0.9;

function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** Right-angle "circuit traces" across the visor face, as line-segment pairs (x, y). */
const TRACES: readonly (readonly [number, number])[][] = [
  [
    [-1.0, 0.25],
    [-0.55, 0.25],
    [-0.4, 0.1],
    [0.2, 0.1],
  ],
  [
    [1.0, -0.2],
    [0.6, -0.2],
    [0.45, -0.05],
    [-0.1, -0.05],
  ],
  [
    [-0.9, -0.3],
    [-0.5, -0.3],
    [-0.35, -0.15],
  ],
  [
    [0.9, 0.3],
    [0.5, 0.3],
    [0.35, 0.15],
    [0.0, 0.15],
  ],
  [
    [-0.2, 0.38],
    [0.3, 0.38],
  ],
  [
    [-0.3, -0.4],
    [0.35, -0.4],
  ],
];

function traceGeometry(): BufferGeometry {
  const points: number[] = [];
  for (const path of TRACES) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i]!;
      const [bx, by] = path[i + 1]!;
      points.push(ax, ay, bx, by);
    }
  }
  // Each segment pair above is (ax, ay, bx, by); expand to 3D, sitting just in front of the visor face.
  const z = DEPTH / 2 + 0.075;
  const positions: number[] = [];
  for (let i = 0; i < points.length; i += 4) {
    positions.push(points[i]!, points[i + 1]!, z, points[i + 2]!, points[i + 3]!, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * The matte-black cybernetic headset of the boot scene, built procedurally: an extruded rounded visor, a strap,
 * blue circuit traces and an additive glow that intensifies on hover. About ten draw calls, no assets.
 */
export class Headset implements WorldPart {
  readonly object = new Group();

  private readonly edgeMaterial: LineBasicMaterial;
  private readonly traceMaterial: LineBasicMaterial;
  private readonly glowMaterial: MeshBasicMaterial;
  private glow = 0.25;
  private targetGlow = 0.25;
  private flyProgress = 0;
  private flying = false;

  constructor() {
    const surface = tokenColor('surface');

    const visorGeometry = new ExtrudeGeometry(roundedRect(WIDTH, HEIGHT, 0.3), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 2,
      curveSegments: 10,
    });
    visorGeometry.translate(0, 0, -DEPTH / 2);
    this.object.add(new Mesh(visorGeometry, new MeshBasicMaterial({ color: surface })));

    this.edgeMaterial = new LineBasicMaterial({
      color: tokenColor('blue'),
      transparent: true,
      opacity: 0.6,
    });
    this.object.add(new LineSegments(new EdgesGeometry(visorGeometry, 35), this.edgeMaterial));

    this.traceMaterial = new LineBasicMaterial({
      color: tokenColor('blue-soft'),
      transparent: true,
      opacity: 0.85,
    });
    this.object.add(new LineSegments(traceGeometry(), this.traceMaterial));

    const strap = new Mesh(
      new TorusGeometry(1.2, 0.06, 6, 48),
      new MeshBasicMaterial({ color: surface }),
    );
    strap.position.z = -DEPTH / 2 - 0.1;
    strap.scale.set(1, 0.55, 0.6);
    this.object.add(strap);

    this.glowMaterial = new MeshBasicMaterial({
      map: createRadialGlow(),
      color: tokenColor('blue'),
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const glow = new Mesh(new PlaneGeometry(6, 3.6), this.glowMaterial);
    glow.position.z = -DEPTH / 2 - 0.4;
    this.object.add(glow);
  }

  /** Hover glow (the circuit traces light up, DESIGN.md section 6.2). */
  setHover(hovered: boolean): void {
    this.targetGlow = hovered ? 1 : 0.25;
  }

  /** The headset flies at the camera and fills the view when the visitor enters. */
  fly(): void {
    this.flying = true;
  }

  /** Back to the resting state (when the boot screen is shown again). */
  reset(): void {
    this.flying = false;
    this.flyProgress = 0;
    this.object.visible = true;
    this.object.position.set(0, 0, 0);
    this.object.scale.setScalar(1);
  }

  /** Already gone, with no flight (for a scene that starts after the boot screen). */
  dismiss(): void {
    this.flying = true;
    this.flyProgress = 1;
    this.object.visible = false;
  }

  get gone(): boolean {
    return !this.object.visible;
  }

  update(dt: number, now: number): void {
    if (!this.object.visible) return;

    if (this.flying) {
      this.flyProgress = Math.min(1, this.flyProgress + dt / 0.9);
      const e = this.flyProgress * this.flyProgress; // accelerates toward the viewer
      this.object.position.z = e * 3.4;
      this.object.scale.setScalar(1 + e * 3);
      if (this.flyProgress >= 1) this.object.visible = false;
    } else {
      this.object.rotation.y = Math.sin(now * 0.4) * 0.28;
      this.object.rotation.x = Math.sin(now * 0.3) * 0.06;
      this.object.position.y = Math.sin(now * 0.8) * 0.06;
    }

    this.glow = damp(this.glow, this.targetGlow, 8, dt);
    this.edgeMaterial.opacity = 0.55 + 0.45 * this.glow;
    this.traceMaterial.opacity = 0.6 + 0.4 * this.glow;
    this.glowMaterial.opacity = 0.1 + 0.5 * this.glow;
  }

  dispose() {
    return disposeObject(this.object);
  }
}
