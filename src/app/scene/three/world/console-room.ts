import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { damp } from '../camera-rig';
import { disposeObject } from '../dispose';
import { tokenColor } from '../palette';
import type { WorldPart } from './part';

const KEY_COUNT = 5;
const KEY_RADIUS = 4.4;
const FLOOR_Y = -1.2;

/** A grid of lines on a plane, as line-segment pairs. */
function gridGeometry(
  halfWidth: number,
  near: number,
  far: number,
  step: number,
  y: number,
): BufferGeometry {
  const positions: number[] = [];
  for (let x = -halfWidth; x <= halfWidth; x += step) positions.push(x, y, near, x, y, far);
  for (let z = far; z <= near; z += step) positions.push(-halfWidth, y, z, halfWidth, y, z);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Where key `index` sits on the console arc (x, z), left to right. */
export function keyPosition(index: number): { x: number; z: number; angle: number } {
  const spread = 0.62; // radians either side of center
  const t = index / (KEY_COUNT - 1) - 0.5;
  const angle = t * 2 * spread;
  return { x: Math.sin(angle) * KEY_RADIUS, z: 6.2 - Math.cos(angle) * KEY_RADIUS - 2.2, angle };
}

/**
 * Act I: the polished glass chamber and its curved control console with five physical keycaps. The keys are
 * the 3D twins of the DOM buttons (which remain the accessible way to operate them).
 */
export class ConsoleRoom implements WorldPart {
  readonly object = new Group();

  private readonly caps: InstancedMesh;
  private readonly tops: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly pressDepth = new Array<number>(KEY_COUNT).fill(0);
  private pressed = -1;

  constructor() {
    const blue = tokenColor('blue');

    // The floor grid.
    this.object.add(
      new LineSegments(
        gridGeometry(14, 4, -14, 1, FLOOR_Y),
        new LineBasicMaterial({ color: blue, transparent: true, opacity: 0.2, depthWrite: false }),
      ),
    );

    // The glass chamber: just its edges.
    const chamber = new BoxGeometry(14, 6.4, 14);
    const frame = new LineSegments(
      new EdgesGeometry(chamber),
      new LineBasicMaterial({ color: blue, transparent: true, opacity: 0.22 }),
    );
    frame.position.set(0, FLOOR_Y + 3.2, -3);
    this.object.add(frame);
    chamber.dispose();

    // The curved console base and its glowing top edge.
    const arcStart = Math.PI * 1.18;
    const arcLength = Math.PI * 0.64;
    const base = new Mesh(
      new CylinderGeometry(5, 5, 0.5, 48, 1, true, arcStart, arcLength),
      new MeshBasicMaterial({ color: tokenColor('surface'), side: DoubleSide }),
    );
    base.position.set(0, FLOOR_Y + 0.55, 3.3);
    base.rotation.y = Math.PI;
    this.object.add(base);

    const edge: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = arcStart + (arcLength * i) / 40;
      edge.push(Math.sin(a) * 5, 0, Math.cos(a) * 5);
    }
    const edgeGeometry = new BufferGeometry();
    edgeGeometry.setAttribute('position', new Float32BufferAttribute(edge, 3));
    const edgeLine = new Line(
      edgeGeometry,
      new LineBasicMaterial({ color: tokenColor('blue-soft'), transparent: true, opacity: 0.8 }),
    );
    edgeLine.position.set(0, FLOOR_Y + 0.8, 3.3);
    edgeLine.rotation.y = Math.PI;
    this.object.add(edgeLine);

    // Five keycaps: a dark body and a glowing top each.
    this.caps = new InstancedMesh(
      new BoxGeometry(0.7, 0.26, 0.7),
      new MeshBasicMaterial({ color: tokenColor('raised') }),
      KEY_COUNT,
    );
    const topGeometry = new PlaneGeometry(0.5, 0.5);
    topGeometry.rotateX(-Math.PI / 2);
    this.tops = new InstancedMesh(
      topGeometry,
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      KEY_COUNT,
    );
    for (let i = 0; i < KEY_COUNT; i++) this.tops.setColorAt(i, tokenColor('blue'));
    this.writeKeys();
    this.object.add(this.caps, this.tops);

    this.object.visible = false;
  }

  /** Presses key `index` (and releases the others). -1 releases all. */
  press(index: number): void {
    this.pressed = index;
    for (let i = 0; i < KEY_COUNT; i++) {
      this.tops.setColorAt(i, tokenColor(i === index ? 'emerald' : 'blue'));
    }
    if (this.tops.instanceColor) this.tops.instanceColor.needsUpdate = true;
  }

  private writeKeys(): void {
    for (let i = 0; i < KEY_COUNT; i++) {
      const { x, z } = keyPosition(i);
      const y = FLOOR_Y + 1.05 - this.pressDepth[i]!;
      this.matrix.makeTranslation(x, y, z);
      this.caps.setMatrixAt(i, this.matrix);
      this.matrix.makeTranslation(x, y + 0.16, z);
      this.tops.setMatrixAt(i, this.matrix);
    }
    this.caps.instanceMatrix.needsUpdate = true;
    this.tops.instanceMatrix.needsUpdate = true;
  }

  update(dt: number): void {
    if (!this.object.visible) return;
    let moving = false;
    for (let i = 0; i < KEY_COUNT; i++) {
      const target = i === this.pressed ? 0.12 : 0;
      const next = damp(this.pressDepth[i]!, target, 18, dt);
      if (Math.abs(next - this.pressDepth[i]!) > 0.0005) moving = true;
      this.pressDepth[i] = next;
    }
    if (moving) this.writeKeys();
  }

  dispose() {
    return disposeObject(this.object);
  }
}
