import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import type { ColorToken } from '../../../core/design/tokens';
import { disposeObject } from '../dispose';
import { tokenColor } from '../palette';
import { MAX_RACKS_PER_SIDE } from '../profiles';
import type { WorldPart } from './part';

const RACK_SPACING = 1.9;
const AISLE_HALF_WIDTH = 3.4;
const FLOOR_Y = -1.2;
const FIRST_RACK_Z = -3;
const CORE_Z = -33;
const DRUM_Z = -42;
const DRUM_COUNT = 10;

/** Deterministic pseudo-random in [0, 1) from an integer, so the vault looks the same every time. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const LED_VERTEX = /* glsl */ `
  varying float vHash;
  varying float vY;
  varying float vDepth;
  void main() {
    vHash = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
    vY = position.y;
    #ifdef USE_INSTANCING
      mat4 m = instanceMatrix;
    #else
      mat4 m = mat4(1.0);
    #endif
    vec4 mv = modelViewMatrix * m * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const LED_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vHash;
  varying float vY;
  varying float vDepth;
  void main() {
    float pulse = 0.5 + 0.5 * sin(uTime * (1.0 + 2.0 * vHash) + vHash * 40.0 + vY * 1.6);
    vec3 color = mix(uColorA, uColorB, step(0.5, fract(vHash * 3.7)));
    float fade = smoothstep(64.0, 8.0, vDepth);
    gl_FragColor = vec4(color, (0.25 + 0.75 * pulse) * fade);
    #include <colorspace_fragment>
  }
`;

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

/**
 * Acts III and IV: the NestJS server vault (a cathedral aisle of racks with pulsing LEDs, laser gates, a
 * glass-cased core) and the database vault (a ring of drums fed by a yellow query beam). Racks, LEDs and drums are
 * instanced, so the whole room is about fifteen draw calls whatever the rack count.
 */
export class Vault implements WorldPart {
  readonly object = new Group();

  private readonly racks: InstancedMesh;
  private readonly leds: InstancedMesh;
  private readonly ledMaterial: ShaderMaterial;
  private readonly gates: { frame: LineLoop; scan: Mesh }[] = [];
  private readonly coreGlass: Mesh;
  private readonly coreGlassMaterial: MeshBasicMaterial;
  private readonly coreWire: Mesh;
  private readonly coreWireMaterial: MeshBasicMaterial;

  constructor() {
    const matrix = new Matrix4();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();

    // Racks and LED strips, interleaved left/right so trimming the count trims both sides evenly.
    const rackCount = MAX_RACKS_PER_SIDE * 2;
    this.racks = new InstancedMesh(
      new BoxGeometry(1.1, 6, 1.1),
      new MeshBasicMaterial({ color: tokenColor('surface') }),
      rackCount,
    );
    this.ledMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: tokenColor('indigo').clone() },
        uColorB: { value: tokenColor('violet').clone() },
      },
      vertexShader: LED_VERTEX,
      fragmentShader: LED_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.leds = new InstancedMesh(new BoxGeometry(0.05, 5, 0.04), this.ledMaterial, rackCount);
    for (let i = 0; i < MAX_RACKS_PER_SIDE; i++) {
      const z = FIRST_RACK_Z - i * RACK_SPACING;
      for (const side of [-1, 1]) {
        const index = i * 2 + (side === -1 ? 0 : 1);
        const height = 5 + hash(index) * 2; // slightly uneven rack tops
        position.set(side * AISLE_HALF_WIDTH, FLOOR_Y + height / 2, z);
        scale.set(1, height / 6, 1);
        this.racks.setMatrixAt(index, matrix.compose(position, rotation, scale));
        position.set(side * (AISLE_HALF_WIDTH - 0.57), FLOOR_Y + 3.1, z);
        scale.set(1, 1, 1);
        this.leds.setMatrixAt(index, matrix.compose(position, rotation, scale));
      }
    }
    this.object.add(this.racks, this.leds);

    // The floor.
    this.object.add(
      new LineSegments(
        gridGeometry(14, 2, -50, 2, FLOOR_Y),
        new LineBasicMaterial({
          color: tokenColor('indigo-deep'),
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      ),
    );

    // Laser gates (AuthGuard, ValidationPipe, ...): an emerald frame and a scanning beam each.
    const frameGeometry = new BufferGeometry();
    frameGeometry.setAttribute(
      'position',
      new Float32BufferAttribute([-3.6, FLOOR_Y, 0, 3.6, FLOOR_Y, 0, 3.6, 5.6, 0, -3.6, 5.6, 0], 3),
    );
    const frameMaterial = new LineBasicMaterial({
      color: tokenColor('emerald'),
      transparent: true,
      opacity: 0.75,
    });
    const scanMaterial = new MeshBasicMaterial({
      color: tokenColor('emerald'),
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const scanGeometry = new PlaneGeometry(7.2, 0.05);
    for (const z of [-9, -17, -25]) {
      const frame = new LineLoop(frameGeometry, frameMaterial);
      frame.position.z = z;
      const scan = new Mesh(scanGeometry, scanMaterial);
      scan.position.z = z;
      this.object.add(frame, scan);
      this.gates.push({ frame, scan });
    }

    // The server core: a glass cylinder around a turning wireframe.
    this.coreGlassMaterial = new MeshBasicMaterial({
      color: tokenColor('indigo'),
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    this.coreGlass = new Mesh(
      new CylinderGeometry(1.4, 1.4, 5, 32, 1, true),
      this.coreGlassMaterial,
    );
    this.coreGlass.position.set(0, FLOOR_Y + 2.5, CORE_Z);
    this.coreWireMaterial = new MeshBasicMaterial({ color: tokenColor('violet'), wireframe: true });
    this.coreWire = new Mesh(new IcosahedronGeometry(0.75, 1), this.coreWireMaterial);
    this.coreWire.position.set(0, FLOOR_Y + 2.5, CORE_Z);
    const coreRing = new Mesh(
      new TorusGeometry(1.5, 0.03, 6, 48),
      new MeshBasicMaterial({ color: tokenColor('indigo'), transparent: true, opacity: 0.8 }),
    );
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, FLOOR_Y + 0.1, CORE_Z);
    this.object.add(this.coreGlass, this.coreWire, coreRing);

    // The database vault: a ring of drums with glowing tops, and the yellow query beam that feeds it.
    const drums = new InstancedMesh(
      new CylinderGeometry(0.75, 0.75, 1.8, 24),
      new MeshBasicMaterial({ color: tokenColor('raised') }),
      DRUM_COUNT,
    );
    const rims = new InstancedMesh(
      new TorusGeometry(0.75, 0.025, 4, 28),
      new MeshBasicMaterial({ color: tokenColor('yellow') }),
      DRUM_COUNT,
    );
    const lay = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    for (let i = 0; i < DRUM_COUNT; i++) {
      const a = (i / DRUM_COUNT) * Math.PI * 2;
      position.set(Math.cos(a) * 3.6, FLOOR_Y + 0.9, DRUM_Z + Math.sin(a) * 3.6);
      drums.setMatrixAt(i, matrix.compose(position, rotation.identity(), scale.set(1, 1, 1)));
      position.y += 0.92;
      rims.setMatrixAt(i, matrix.compose(position, lay, scale));
    }
    this.object.add(drums, rims);

    const beam = new Mesh(
      new CylinderGeometry(0.03, 0.03, Math.abs(DRUM_Z - CORE_Z) - 3, 6),
      new MeshBasicMaterial({
        color: tokenColor('yellow'),
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    beam.rotation.x = Math.PI / 2;
    beam.position.set(0, FLOOR_Y + 2.5, (CORE_Z + DRUM_Z) / 2);
    this.object.add(beam);

    this.setRackCount(MAX_RACKS_PER_SIDE);
    this.object.visible = false;
  }

  /** Racks per side (the rest stay allocated). */
  setRackCount(perSide: number): void {
    const count = Math.min(perSide, MAX_RACKS_PER_SIDE) * 2;
    this.racks.count = count;
    this.leds.count = count;
  }

  /** Recolors the vault for an endpoint (the about room is indigo and violet). */
  setTint(a: ColorToken, b: ColorToken): void {
    this.ledMaterial.uniforms['uColorA']!.value.copy(tokenColor(a));
    this.ledMaterial.uniforms['uColorB']!.value.copy(tokenColor(b));
    this.coreGlassMaterial.color.copy(tokenColor(a));
    this.coreWireMaterial.color.copy(tokenColor(b));
  }

  update(dt: number, now: number): void {
    if (!this.object.visible) return;
    this.ledMaterial.uniforms['uTime']!.value = now;
    this.gates.forEach((gate, i) => {
      gate.scan.position.y = FLOOR_Y + 2.4 + Math.sin(now * 1.6 + i * 1.7) * 2.6;
    });
    this.coreWire.rotation.y += dt * 0.9;
    this.coreWire.rotation.x += dt * 0.35;
  }

  dispose() {
    return disposeObject(this.object);
  }
}
