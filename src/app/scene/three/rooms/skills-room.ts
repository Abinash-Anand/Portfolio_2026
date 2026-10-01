import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { ColorToken } from '../../../core/design/tokens';
import type { EndpointId } from '../../../core/experience';
import { LabelAtlas, wrapText, type LabelPlacement, type LabelSpec } from '../labels';
import { tokenColor } from '../palette';
import { MAX_RINGS, type ThreeProfile } from '../profiles';
import type { Room, RoomContext } from '../room';
import {
  createPulseField,
  gridGeometry,
  hash,
  seededRandom,
  segmentsGeometry,
  type PulseField,
  type PulseSegment,
} from '../world/kit';
import type { Waypoint } from '../world/path';
import { BaseRoom } from './base-room';

/**
 * Skills: the microservice circuit grid. A printed circuit board floating in dark space, one microchip per skill
 * group, each chip's skills printed on its die, with traces running out of its pins and data pulses streaming
 * along them. Everything repeated is instanced: the whole room is about nine draw calls.
 */

const COLUMN_PITCH = 7.2;
const ROW_PITCH = 5.2;
const CHIP_WIDTH = 5.2;
const CHIP_DEPTH = 3.4;
const CHIP_HEIGHT = 0.5;
const PINS_PER_SIDE = 12;
const BOARD_Y = -0.05;
const PERIOD = 90;
const MAX_CHIPS = 6;
const ACCENTS: readonly ColorToken[] = ['blue', 'violet', 'cyan', 'gold', 'emerald', 'indigo'];

export interface ChipSpot {
  readonly x: number;
  readonly z: number;
  readonly row: number;
  readonly rows: number;
}

/** Where each chip sits: one row for up to two chips, two rows up to four, three columns beyond that. */
export function chipLayout(count: number): ChipSpot[] {
  if (count <= 0) return [];
  const columns = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    return {
      x: (column - (columns - 1) / 2) * COLUMN_PITCH,
      z: (row - (rows - 1) / 2) * ROW_PITCH,
      row,
      rows,
    };
  });
}

class SkillsRoom extends BaseRoom {
  readonly id: EndpointId = 'skills';

  private readonly spots: readonly ChipSpot[];
  private readonly groupIds: readonly string[];
  private readonly pulses: PulseField;
  private readonly pulseTotal: number;

  constructor(context: RoomContext) {
    super();
    const matrix = new Matrix4();
    const groups = context.content.skills.slice(0, MAX_CHIPS);
    this.groupIds = groups.map((group) => group.id);
    this.spots = chipLayout(groups.length);
    const columns = this.spots.length ? new Set(this.spots.map((s) => s.x)).size : 1;
    const rows = this.spots.length ? this.spots[0]!.rows : 1;
    const boardWidth = columns * COLUMN_PITCH + 3;
    const boardDepth = rows * ROW_PITCH + 3;

    // The board: a dark plate, a border, and a faint grid.
    const plate = new Mesh(
      new PlaneGeometry(boardWidth, boardDepth).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: tokenColor('surface'), side: DoubleSide }),
    );
    plate.position.y = BOARD_Y;
    const hx = boardWidth / 2;
    const hz = boardDepth / 2;
    const border = new LineSegments(
      segmentsGeometry([
        -hx,
        0,
        -hz,
        hx,
        0,
        -hz,
        hx,
        0,
        -hz,
        hx,
        0,
        hz,
        hx,
        0,
        hz,
        -hx,
        0,
        hz,
        -hx,
        0,
        hz,
        -hx,
        0,
        -hz,
      ]),
      new LineBasicMaterial({ color: tokenColor('blue'), transparent: true, opacity: 0.7 }),
    );
    const grid = new LineSegments(
      gridGeometry(hx, hz, -hz, 1, 0.005),
      new LineBasicMaterial({
        color: tokenColor('blue'),
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    );
    this.object.add(plate, border, grid);

    // Chips: a body and a glowing die each, plus pins along both long edges.
    const count = Math.max(1, this.spots.length);
    const bodies = new InstancedMesh(
      new BoxGeometry(CHIP_WIDTH, CHIP_HEIGHT, CHIP_DEPTH),
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      count,
    );
    const dies = new InstancedMesh(
      new PlaneGeometry(CHIP_WIDTH - 0.6, CHIP_DEPTH - 0.6).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({
        color: new Color(1, 1, 1),
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
      count,
    );
    bodies.count = dies.count = this.spots.length;
    const pins = new InstancedMesh(
      new BoxGeometry(0.14, 0.08, 0.5),
      new MeshBasicMaterial({ color: tokenColor('muted') }),
      count * PINS_PER_SIDE * 2,
    );
    pins.count = this.spots.length * PINS_PER_SIDE * 2;

    const trace: number[] = [];
    const pulseSegments: PulseSegment[] = [];
    let pin = 0;
    this.spots.forEach((spot, i) => {
      bodies.setMatrixAt(i, matrix.makeTranslation(spot.x, CHIP_HEIGHT / 2, spot.z));
      bodies.setColorAt(i, tokenColor('raised'));
      dies.setMatrixAt(i, matrix.makeTranslation(spot.x, CHIP_HEIGHT + 0.01, spot.z));
      dies.setColorAt(i, tokenColor(ACCENTS[i % ACCENTS.length]!));

      for (const side of [-1, 1]) {
        // Traces may not run under a neighbouring row: they get less room on that side.
        const neighbour = side > 0 ? spot.row < spot.rows - 1 : spot.row > 0;
        const reach = neighbour ? 1.4 : 3.0;
        for (let k = 0; k < PINS_PER_SIDE; k++) {
          const x = spot.x - (CHIP_WIDTH - 1) / 2 + (k * (CHIP_WIDTH - 1)) / (PINS_PER_SIDE - 1);
          const edge = spot.z + side * (CHIP_DEPTH / 2 + 0.25);
          pins.setMatrixAt(pin++, matrix.makeTranslation(x, 0.1, edge));

          const seed = i * 97 + (side > 0 ? 50 : 0) + k;
          const first = reach * (0.35 + hash(seed) * 0.25);
          const jog = (hash(seed + 7) - 0.5) * 1.1;
          const y = 0.02;
          const a: [number, number, number] = [x, y, spot.z + side * (CHIP_DEPTH / 2 + 0.5)];
          const b: [number, number, number] = [
            x,
            y,
            spot.z + side * (CHIP_DEPTH / 2 + 0.5 + first),
          ];
          const c: [number, number, number] = [x + jog, y, b[2] + side * 0.35];
          const d: [number, number, number] = [
            x + jog,
            y,
            spot.z + side * (CHIP_DEPTH / 2 + 0.5 + reach),
          ];
          trace.push(...a, ...b, ...b, ...c, ...c, ...d);
          if (k % 2 === 0) pulseSegments.push({ from: a, to: b }, { from: c, to: d });
        }
      }
    });

    // Buses between neighbouring chips on the same row: four lanes each, carrying the busiest data.
    this.spots.forEach((spot, i) => {
      const next = this.spots[i + 1];
      if (!next || next.row !== spot.row) return;
      for (let lane = 0; lane < 4; lane++) {
        const z = spot.z + (lane - 1.5) * 0.55;
        const from: [number, number, number] = [spot.x + CHIP_WIDTH / 2 + 0.05, 0.02, z];
        const to: [number, number, number] = [next.x - CHIP_WIDTH / 2 - 0.05, 0.02, z];
        trace.push(...from, ...to);
        pulseSegments.push({ from, to }, { from: to, to: from });
      }
    });

    bodies.instanceMatrix.needsUpdate = true;
    dies.instanceMatrix.needsUpdate = true;
    pins.instanceMatrix.needsUpdate = true;
    this.object.add(bodies, dies, pins);
    if (trace.length) {
      this.object.add(
        new LineSegments(
          segmentsGeometry(trace),
          new LineBasicMaterial({
            color: tokenColor('blue-soft'),
            transparent: true,
            opacity: 0.4,
          }),
        ),
      );
    }

    // Data streams: glowing dots riding the traces.
    const perSegment = 3;
    this.pulses = createPulseField(pulseSegments, perSegment, 'cyan', seededRandom('skills'));
    this.pulseTotal = pulseSegments.length * perSegment;
    this.addPulses(this.pulses);
    this.setProfile(context.profile);

    // Text on each chip: its name, and its skills as a wrapped line.
    const specs: LabelSpec[] = [];
    groups.forEach((group, i) => {
      specs.push(
        {
          id: `title-${i}`,
          lines: [group.label.toUpperCase()],
          color: ACCENTS[i % ACCENTS.length]!,
          size: 40,
          align: 'center',
        },
        {
          id: `items-${i}`,
          lines: wrapText(group.items.join(' · '), 34),
          color: 'text',
          size: 28,
          panel: true,
          accent: ACCENTS[i % ACCENTS.length]!,
        },
      );
    });
    if (specs.length) {
      const atlas = LabelAtlas.create(specs, { createCanvas: context.createCanvas });
      const placements: LabelPlacement[] = [];
      this.spots.forEach((spot, i) => {
        const itemsAspect = atlas.aspect(`items-${i}`);
        placements.push(
          {
            id: `title-${i}`,
            position: [spot.x, CHIP_HEIGHT + 0.05, spot.z - 1.15],
            height: 0.46,
            rotationX: -Math.PI / 2,
          },
          {
            id: `items-${i}`,
            position: [spot.x, CHIP_HEIGHT + 0.05, spot.z + 0.35],
            height: Math.min(1.5, 4.5 / itemsAspect),
            rotationX: -Math.PI / 2,
          },
        );
      });
      this.object.add(atlas.mesh(placements));
    }

    // The camera: an overview, then in over each chip in turn, and back out.
    const reach = Math.max(boardWidth, boardDepth);
    const overview: Waypoint = { p: [0, reach * 0.62, reach * 0.62], look: [0, 0, 0.4], fov: 56 };
    this.waypoints = [
      overview,
      ...this.spots.map((spot): Waypoint => ({
        p: [spot.x * 0.7, 4.8, spot.z + 4.6],
        look: [spot.x, 0.4, spot.z - 0.2],
        fov: 48,
      })),
      overview,
    ];
    this.period = PERIOD;
    this.object.visible = false;
  }

  protected focusWaypoint(id: string): Waypoint | null {
    const index = this.groupIds.indexOf(id);
    const spot = this.spots[index];
    if (!spot) return null;
    return { p: [spot.x, 4.2, spot.z + 3.8], look: [spot.x, 0.3, spot.z], fov: 42 };
  }

  setProfile(profile: ThreeProfile): void {
    // Fewer streaming dots on lower tiers; the board and chips are the same.
    this.pulses.setCount(Math.floor(this.pulseTotal * (profile.rings / MAX_RINGS)));
  }

  protected tick(): void {
    /* The pulse field and shaders run on the GPU; nothing to do per frame. */
  }
}

export function createSkillsRoom(context: RoomContext): Room {
  return new SkillsRoom(context);
}
