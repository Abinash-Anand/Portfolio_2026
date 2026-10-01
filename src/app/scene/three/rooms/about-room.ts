import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type ShaderMaterial,
} from 'three';
import type { EndpointId } from '../../../core/experience';
import { LabelAtlas, wrapText, type LabelSpec } from '../labels';
import { tokenColor } from '../palette';
import type { ThreeProfile } from '../profiles';
import { MAX_RACKS_PER_SIDE } from '../profiles';
import type { Room, RoomContext } from '../room';
import { BaseRoom } from './base-room';
import { createLedMaterial, FLOOR_Y, gridGeometry, hash, segmentsGeometry } from '../world/kit';
import { pathPose, pingPong, type Waypoint } from '../world/path';
import type { Pose } from '../camera-rig';

/**
 * About: the NestJS server vault (a cathedral aisle of racks with pulsing LEDs, laser gates, a glass-cased core)
 * and, beneath it, the database vault (a ring of drums, a laser arm, the records and the golden response
 * container). CONCEPT.md acts III to V. The camera glides down the aisle, over the core and into the pit, and
 * back, forever; every repeated shape is instanced, so the room is about twenty draw calls whatever the tier.
 */

const AISLE_HALF_WIDTH = 3.4;
const RACK_START_Z = -3;
const RACK_SPAN = 35;
const CORE_Z = -33;
const PIT_Z = -46;
const PIT_RADIUS = 5.6;
const PIT_BOTTOM = -12.5;
const DRUM_COUNT = 10;
const DRUM_RING_RADIUS = 3.1;
/** Seconds for one full trip down and back. */
const PERIOD = 90;

const GATES = [
  { z: -9, id: 'auth', name: 'AuthGuard' },
  { z: -17, id: 'val', name: 'ValidationPipe' },
] as const;

const WAYPOINTS: readonly Waypoint[] = [
  { p: [0, 1.8, -2], look: [0, 1.5, -14], fov: 62 },
  { p: [0, 1.8, -12], look: [0, 1.6, -22] },
  { p: [0, 1.8, -22], look: [0, 1.4, -33] },
  { p: [0, 3.8, -27], look: [0, 0.5, -37] },
  { p: [0, 7, -36.5], look: [0, 0, -46] },
  { p: [0, 5, -43], look: [0, -8, -46] },
  { p: [0, -3, -42.6], look: [0, -8.6, -46] },
  { p: [1.2, -5.8, -42.4], look: [0, -8.2, -46], fov: 58 },
];

/** `KEY: value`, wrapped so a long value continues indented under the key. */
function recordLines(records: readonly { key: string; value: string }[]): string[] {
  const lines: string[] = [];
  for (const { key, value } of records) {
    const wrapped = wrapText(`${key}: ${value}`, 36);
    wrapped.forEach((line, i) => lines.push(i === 0 ? line : `  ${line}`));
  }
  return lines;
}

function circleSegments(radius: number, y: number, z: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const b = ((i + 1) / count) * Math.PI * 2;
    out.push(
      Math.cos(a) * radius,
      y,
      z + Math.sin(a) * radius,
      Math.cos(b) * radius,
      y,
      z + Math.sin(b) * radius,
    );
  }
  return out;
}

class AboutRoom extends BaseRoom {
  readonly id: EndpointId = 'about';

  private readonly racks: InstancedMesh;
  private readonly leds: InstancedMesh;
  private readonly ledMaterial: ShaderMaterial;
  private readonly scans: InstancedMesh;
  private readonly coreWire: Mesh;
  private readonly laser = new Group();
  private readonly container = new Group();
  private readonly authorized: Mesh[] = [];
  private readonly matrix = new Matrix4();
  private readonly cam: Pose = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 60 };

  constructor(context: RoomContext) {
    super();
    this.waypoints = WAYPOINTS;
    this.period = PERIOD;
    const matrix = this.matrix;

    // Racks and their LED strips: interleaved left/right, laid out by `layoutRacks`.
    this.racks = new InstancedMesh(
      new BoxGeometry(1.1, 6, 1.1),
      new MeshBasicMaterial({ color: tokenColor('surface') }),
      MAX_RACKS_PER_SIDE * 2,
    );
    this.ledMaterial = createLedMaterial('indigo', 'violet', [90, 10]);
    this.leds = new InstancedMesh(
      new BoxGeometry(0.05, 5, 0.04),
      this.ledMaterial,
      MAX_RACKS_PER_SIDE * 2,
    );
    this.object.add(this.racks, this.leds);
    this.layoutRacks(context.profile.racksPerSide);

    // The glass floor.
    this.object.add(
      new LineSegments(
        gridGeometry(14, 2, -54, 2, FLOOR_Y),
        new LineBasicMaterial({
          color: tokenColor('indigo-deep'),
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      ),
    );

    // Laser gates (AuthGuard, ValidationPipe): one emerald frame each, and a scanning beam.
    const frame: number[] = [];
    for (const gate of GATES) {
      const corners: [number, number][] = [
        [-3.6, FLOOR_Y],
        [3.6, FLOOR_Y],
        [3.6, 5.6],
        [-3.6, 5.6],
      ];
      corners.forEach(([x, y], i) => {
        const [nx, ny] = corners[(i + 1) % 4]!;
        frame.push(x, y, gate.z, nx, ny, gate.z);
      });
    }
    this.object.add(
      new LineSegments(
        segmentsGeometry(frame),
        new LineBasicMaterial({ color: tokenColor('emerald'), transparent: true, opacity: 0.75 }),
      ),
    );
    this.scans = new InstancedMesh(
      new PlaneGeometry(7.2, 0.05),
      new MeshBasicMaterial({
        color: tokenColor('emerald'),
        transparent: true,
        opacity: 0.7,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
      GATES.length,
    );
    this.scans.frustumCulled = false;
    this.object.add(this.scans);

    // The controller core: a turning wireframe inside a glass cylinder.
    const coreY = FLOOR_Y + 2.5;
    const glass = new Mesh(
      new CylinderGeometry(1.4, 1.4, 5, 32, 1, true),
      new MeshBasicMaterial({
        color: tokenColor('indigo'),
        transparent: true,
        opacity: 0.12,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    glass.position.set(0, coreY, CORE_Z);
    this.coreWire = new Mesh(
      new IcosahedronGeometry(0.75, 1),
      new MeshBasicMaterial({ color: tokenColor('violet'), wireframe: true }),
    );
    this.coreWire.position.set(0, coreY, CORE_Z);
    const coreRing = new Mesh(
      new TorusGeometry(1.5, 0.03, 6, 48),
      new MeshBasicMaterial({ color: tokenColor('indigo'), transparent: true, opacity: 0.8 }),
    );
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, FLOOR_Y + 0.1, CORE_Z);
    this.object.add(glass, this.coreWire, coreRing);

    // The pit: an opening in the glass floor, a shaft of wireframe, and the database vault at the bottom.
    const rim = new LineSegments(
      segmentsGeometry(circleSegments(PIT_RADIUS, FLOOR_Y, PIT_Z, 48)),
      new LineBasicMaterial({ color: tokenColor('yellow'), transparent: true, opacity: 0.8 }),
    );
    const shaftHeight = FLOOR_Y - PIT_BOTTOM;
    const shaft = new Mesh(
      new CylinderGeometry(PIT_RADIUS, PIT_RADIUS, shaftHeight, 28, 1, true),
      new MeshBasicMaterial({
        color: tokenColor('indigo-deep'),
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      }),
    );
    shaft.position.set(0, FLOOR_Y - shaftHeight / 2, PIT_Z);
    const pitFloor = new LineSegments(
      gridGeometry(PIT_RADIUS, PIT_Z + PIT_RADIUS, PIT_Z - PIT_RADIUS, 1.1, PIT_BOTTOM),
      new LineBasicMaterial({
        color: tokenColor('yellow'),
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    this.object.add(rim, shaft, pitFloor);

    // Database drums in a ring, with glowing rims.
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
    const identity = new Quaternion();
    const position = new Vector3();
    const one = new Vector3(1, 1, 1);
    for (let i = 0; i < DRUM_COUNT; i++) {
      const a = (i / DRUM_COUNT) * Math.PI * 2;
      position.set(
        Math.cos(a) * DRUM_RING_RADIUS,
        PIT_BOTTOM + 0.9,
        PIT_Z + Math.sin(a) * DRUM_RING_RADIUS,
      );
      drums.setMatrixAt(i, matrix.compose(position, identity, one));
      position.y += 0.92;
      rims.setMatrixAt(i, matrix.compose(position, lay, one));
    }
    this.object.add(drums, rims);

    // The yellow query beam: from the core, along the ceiling, then down the shaft.
    const beamHorizontal = Math.abs(PIT_Z - CORE_Z);
    const beamVertical = 1.3 - (PIT_BOTTOM + 1.8);
    const beams = new InstancedMesh(
      new CylinderGeometry(0.03, 0.03, 1, 6),
      new MeshBasicMaterial({
        color: tokenColor('yellow'),
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      2,
    );
    beams.setMatrixAt(
      0,
      matrix.compose(
        position.set(0, 1.3, (CORE_Z + PIT_Z) / 2),
        lay,
        new Vector3(1, beamHorizontal, 1),
      ),
    );
    beams.setMatrixAt(
      1,
      matrix.compose(
        position.set(0, 1.3 - beamVertical / 2, PIT_Z),
        identity,
        new Vector3(1, beamVertical, 1),
      ),
    );
    this.object.add(beams);

    // The laser arm that scans the drums: a line and a bright tip, turning about the middle of the ring.
    const arm = new LineSegments(
      segmentsGeometry([0, -4, 0, DRUM_RING_RADIUS, PIT_BOTTOM + 1.9, 0]),
      new LineBasicMaterial({ color: tokenColor('yellow'), transparent: true, opacity: 0.9 }),
    );
    const tip = new Mesh(
      new SphereGeometry(0.12, 8, 6),
      new MeshBasicMaterial({
        color: tokenColor('yellow'),
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    tip.position.set(DRUM_RING_RADIUS, PIT_BOTTOM + 1.9, 0);
    this.laser.add(arm, tip);
    this.laser.position.set(0, 0, PIT_Z);
    this.object.add(this.laser);

    // The golden response container.
    const box = new BoxGeometry(1.1, 0.7, 0.8);
    this.container.add(
      new Mesh(
        box,
        new MeshBasicMaterial({
          color: tokenColor('gold'),
          transparent: true,
          opacity: 0.28,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
      new LineSegments(
        new EdgesGeometry(box),
        new LineBasicMaterial({ color: tokenColor('gold') }),
      ),
    );
    this.container.position.set(3.2, -9.4, PIT_Z);
    this.object.add(this.container);

    this.addLabels(context);
    this.object.visible = false;
  }

  private addLabels(context: RoomContext): void {
    const records = recordLines(context.content.records);
    const specs: LabelSpec[] = [
      { id: 'gate-auth', lines: ['AuthGuard'], color: 'emerald', size: 44, align: 'center' },
      { id: 'gate-val', lines: ['ValidationPipe'], color: 'emerald', size: 44, align: 'center' },
      {
        id: 'ok-auth',
        lines: ['STATUS: AUTHORIZED'],
        color: 'emerald',
        size: 32,
        panel: true,
        align: 'center',
      },
      {
        id: 'ok-val',
        lines: ['STATUS: AUTHORIZED'],
        color: 'emerald',
        size: 32,
        panel: true,
        align: 'center',
      },
      {
        id: 'emblem',
        lines: ['NESTJS · NODE.JS'],
        color: 'violet',
        size: 46,
        panel: true,
        accent: 'indigo',
        align: 'center',
      },
      {
        id: 'call',
        lines: ['AboutService.getProfile()'],
        color: 'cyan',
        size: 32,
        align: 'center',
      },
      {
        id: 'skill-1',
        lines: wrapText(
          'Engineered with TypeScript & NestJS for strict domain boundaries and modular architecture.',
          24,
        ),
        color: 'text',
        size: 30,
        panel: true,
        accent: 'indigo',
      },
      {
        id: 'skill-2',
        lines: wrapText('Asynchronous non-blocking I/O processing active.', 24),
        color: 'text',
        size: 30,
        panel: true,
        accent: 'indigo',
      },
      {
        id: 'pg',
        lines: ['POSTGRESQL_PRIMARY_CLUSTER'],
        color: 'yellow',
        size: 40,
        align: 'center',
      },
      {
        id: 'response',
        lines: ['RESPONSE_BODY (200 OK)'],
        color: 'gold',
        size: 34,
        panel: true,
        align: 'center',
      },
    ];
    if (records.length)
      specs.push({ id: 'records', lines: records, color: 'cyan', size: 30, panel: true });

    const atlas = LabelAtlas.create(specs, { createCanvas: context.createCanvas });
    const gateLabels = GATES.flatMap((gate) => [
      { id: `gate-${gate.id}`, position: [0, 6.3, gate.z] as const, height: 0.7 },
    ]);
    const fixed = [
      ...gateLabels,
      { id: 'emblem', position: [0, 5.3, CORE_Z] as const, height: 0.8 },
      { id: 'call', position: [0, 4.5, CORE_Z] as const, height: 0.45 },
      { id: 'skill-1', position: [-1.55, 2.7, -13] as const, height: 1.3, rotationY: 0.25 },
      { id: 'skill-2', position: [1.55, 2.2, -13.5] as const, height: 1.0, rotationY: -0.25 },
      { id: 'pg', position: [0, 1.8, PIT_Z - PIT_RADIUS - 0.4] as const, height: 0.8 },
      { id: 'response', position: [3.2, -8.3, PIT_Z] as const, height: 0.5 },
      ...(records.length
        ? [{ id: 'records', position: [0, -6.9, PIT_Z] as const, height: 1.35 }]
        : []),
    ];
    this.object.add(atlas.mesh(fixed));

    // "STATUS: AUTHORIZED" appears as the camera passes each gate.
    for (const gate of GATES) {
      const mesh = atlas.mesh([{ id: `ok-${gate.id}`, position: [0, 5.35, gate.z], height: 0.42 }]);
      mesh.visible = false;
      this.authorized.push(mesh);
      this.object.add(mesh);
    }
  }

  /** Spaces the racks evenly along a fixed aisle: fewer racks on a lower tier means wider gaps, never a shorter room. */
  private layoutRacks(perSide: number): void {
    const count = Math.min(perSide, MAX_RACKS_PER_SIDE);
    const spacing = count > 1 ? RACK_SPAN / (count - 1) : 0;
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();
    for (let i = 0; i < count; i++) {
      const z = RACK_START_Z - i * spacing;
      for (const side of [-1, 1]) {
        const index = i * 2 + (side === -1 ? 0 : 1);
        const height = 5 + hash(index) * 2; // slightly uneven rack tops
        position.set(side * AISLE_HALF_WIDTH, FLOOR_Y + height / 2, z);
        scale.set(1, height / 6, 1);
        this.racks.setMatrixAt(index, this.matrix.compose(position, rotation, scale));
        position.set(side * (AISLE_HALF_WIDTH - 0.57), FLOOR_Y + 3.1, z);
        scale.set(1, 1, 1);
        this.leds.setMatrixAt(index, this.matrix.compose(position, rotation, scale));
      }
    }
    this.racks.count = count * 2;
    this.leds.count = count * 2;
    this.racks.instanceMatrix.needsUpdate = true;
    this.leds.instanceMatrix.needsUpdate = true;
  }

  setProfile(profile: ThreeProfile): void {
    this.layoutRacks(profile.racksPerSide);
  }

  /** The About room has nothing to focus: the camera tour is the whole story. */
  protected focusWaypoint(): Waypoint | null {
    return null;
  }

  protected tick(dt: number, now: number): void {
    this.ledMaterial.uniforms['uTime']!.value = now;

    // Where the camera is along its path decides which gates have been passed.
    const camZ = pathPose(WAYPOINTS, pingPong(this.time, PERIOD), this.cam).pz;
    GATES.forEach((gate, i) => {
      const y = FLOOR_Y + 2.4 + Math.sin(now * 1.6 + i * 1.7) * 2.6;
      this.scans.setMatrixAt(i, this.matrix.makeTranslation(0, y, gate.z));
      this.authorized[i]!.visible = camZ < gate.z - 0.5 && this.cam.py > 0;
    });
    this.scans.instanceMatrix.needsUpdate = true;

    this.coreWire.rotation.y += dt * 0.9;
    this.coreWire.rotation.x += dt * 0.35;
    this.laser.rotation.y += dt * 0.6;
    this.container.position.y = -9.4 + Math.sin(now * 1.3) * 0.15;
    this.container.rotation.y += dt * 0.4;
  }
}

export function createAboutRoom(context: RoomContext): Room {
  return new AboutRoom(context);
}

/** The layout constants, exported so tests can check the camera path against the world it moves through. */
export const ABOUT_LAYOUT = { CORE_Z, PIT_Z, PIT_BOTTOM, PERIOD, WAYPOINTS, GATES } as const;
