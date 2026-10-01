import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  type ShaderMaterial,
} from 'three';
import type { EndpointId } from '../../../core/experience';
import { LabelAtlas, wrapText, type LabelPlacement, type LabelSpec } from '../labels';
import { tokenColor } from '../palette';
import type { RoomContext, Room } from '../room';
import { createLedMaterial, FLOOR_Y, gridGeometry } from '../world/kit';
import type { Waypoint } from '../world/path';
import { BaseRoom } from './base-room';

/**
 * Education: the HFT Stuttgart compute core. A tall server tower, `STUTTGART_NODE_01`, whose blades are the
 * degrees: each one is pulled out of the rack, glowing, with a terminal window beside it. Everything on the
 * windows comes from the education content, so the 3D room and the 2D page say the same things.
 */

const TOWER_Z = -9;
const BLADE_COUNT = 20;
const BLADE_PITCH = 0.44;
const BLADE_Y0 = FLOOR_Y + 0.55;
const PULL_OUT = 1.6;
/** Which slots of the rack the degrees occupy (first entry gets the first slot). */
const ACTIVE_SLOTS = [13, 7, 17, 3] as const;
const MAX_ENTRIES = ACTIVE_SLOTS.length;
const PERIOD = 76;

const bladeY = (slot: number): number => BLADE_Y0 + slot * BLADE_PITCH;

/** `M.Sc. Software Technology` becomes `M.SC_SOFTWARE_TECHNOLOGY`, the way a server blade would be named. */
export function bladeName(degree: string): string {
  return degree.toUpperCase().replace(/\.\s+/g, '_').replace(/\s+/g, '_');
}

class EducationRoom extends BaseRoom {
  readonly id: EndpointId = 'education';

  private readonly ledMaterial: ShaderMaterial;
  private readonly glow: MeshBasicMaterial;
  private readonly entries: readonly { id: string; slot: number }[];

  constructor(context: RoomContext) {
    super();
    const matrix = new Matrix4();
    const education = context.content.education.slice(0, MAX_ENTRIES);
    this.entries = education.map((entry, i) => ({ id: entry.id, slot: ACTIVE_SLOTS[i]! }));
    const activeSlots = new Set(this.entries.map((entry) => entry.slot));

    // The glass floor.
    this.object.add(
      new LineSegments(
        gridGeometry(12, 8, -24, 1, FLOOR_Y),
        new LineBasicMaterial({
          color: tokenColor('blue'),
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      ),
    );

    // The tower's frame, and its blades (one instance each; the degrees are pulled forward).
    const frameBox = new BoxGeometry(3.3, BLADE_COUNT * BLADE_PITCH + 0.8, 1.9);
    const frame = new LineSegments(
      new EdgesGeometry(frameBox),
      new LineBasicMaterial({ color: tokenColor('blue-soft'), transparent: true, opacity: 0.7 }),
    );
    frame.position.set(0, FLOOR_Y + (BLADE_COUNT * BLADE_PITCH + 0.8) / 2, TOWER_Z);
    frameBox.dispose();
    this.object.add(frame);

    const blades = new InstancedMesh(
      new BoxGeometry(2.9, 0.34, 1.5),
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      BLADE_COUNT,
    );
    const leds = new InstancedMesh(
      new BoxGeometry(0.7, 0.05, 0.02),
      (this.ledMaterial = createLedMaterial('blue', 'cyan', [60, 8])),
      BLADE_COUNT * 2,
    );
    for (let slot = 0; slot < BLADE_COUNT; slot++) {
      const z = TOWER_Z + (activeSlots.has(slot) ? PULL_OUT : 0);
      blades.setMatrixAt(slot, matrix.makeTranslation(0, bladeY(slot), z));
      blades.setColorAt(slot, tokenColor(activeSlots.has(slot) ? 'surface' : 'raised'));
      leds.setMatrixAt(slot * 2, matrix.makeTranslation(-0.95, bladeY(slot), z + 0.76));
      leds.setMatrixAt(slot * 2 + 1, matrix.makeTranslation(0.95, bladeY(slot), z + 0.76));
    }
    this.object.add(blades, leds);

    // A glowing plate on top of each pulled-out blade.
    this.glow = new MeshBasicMaterial({
      color: tokenColor('blue-soft'),
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const plates = new InstancedMesh(
      new PlaneGeometry(2.9, 1.5).rotateX(-Math.PI / 2),
      this.glow,
      Math.max(1, this.entries.length),
    );
    plates.count = this.entries.length;
    this.entries.forEach((entry, i) => {
      plates.setMatrixAt(
        i,
        matrix.makeTranslation(0, bladeY(entry.slot) + 0.18, TOWER_Z + PULL_OUT),
      );
    });
    this.object.add(plates);

    // Text: the node's name, each blade's name, and a terminal window per degree.
    const specs: LabelSpec[] = [
      {
        id: 'node',
        lines: ['STUTTGART_NODE_01'],
        color: 'blue-soft',
        size: 56,
        panel: true,
        accent: 'blue',
        align: 'center',
      },
      {
        id: 'sub',
        lines: ['HFT STUTTGART // COMPUTE CORE'],
        color: 'muted',
        size: 30,
        align: 'center',
      },
    ];
    const placements: LabelPlacement[] = [
      { id: 'node', position: [0, FLOOR_Y + 9.9, TOWER_Z + 1.05], height: 0.9 },
      { id: 'sub', position: [0, FLOOR_Y + 9.1, TOWER_Z + 1.05], height: 0.42 },
    ];
    education.forEach((entry, i) => {
      const slot = this.entries[i]!.slot;
      const y = bladeY(slot);
      const side = i % 2 === 0 ? 1 : -1;
      const name = bladeName(entry.degree);
      specs.push(
        {
          id: `blade-${i}`,
          lines: [name],
          color: 'cyan',
          size: 34,
          panel: true,
          accent: 'cyan',
          align: 'center',
        },
        {
          id: `term-${i}`,
          lines: [
            `$ cat ${name.toLowerCase()}.txt`,
            entry.degree,
            entry.institution,
            entry.period,
            ...wrapText(entry.note, 40),
          ],
          color: 'emerald',
          size: 26,
          panel: true,
          accent: 'emerald',
        },
      );
      placements.push(
        { id: `blade-${i}`, position: [0, y + 0.5, TOWER_Z + PULL_OUT + 0.9], height: 0.34 },
        {
          id: `term-${i}`,
          position: [side * 4.5, y + 0.4, TOWER_Z + 1.6],
          height: 1.5,
          rotationY: -side * 0.32,
        },
      );
    });
    const atlas = LabelAtlas.create(specs, { createCanvas: context.createCanvas });
    this.object.add(atlas.mesh(placements));

    // The camera: from the front, in toward each degree in turn, and back.
    const near = (i: number): Waypoint => {
      const side = i % 2 === 0 ? 1 : -1;
      const y = bladeY(this.entries[i]!.slot);
      return { p: [side * 1.6, y + 0.8, TOWER_Z + 3.2], look: [0, y, TOWER_Z + PULL_OUT], fov: 54 };
    };
    this.waypoints = [
      { p: [0, 2.6, 3], look: [0, 3.6, TOWER_Z], fov: 62 },
      { p: [3.2, 3.4, -1.5], look: [0, 4.6, TOWER_Z] },
      ...this.entries.map((_, i) => near(i)),
      { p: [0, 2.8, 3.5], look: [0, 3.6, TOWER_Z], fov: 62 },
    ];
    this.period = PERIOD;
    this.object.visible = false;
  }

  protected focusWaypoint(id: string): Waypoint | null {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    const side = index % 2 === 0 ? 1 : -1;
    const y = bladeY(this.entries[index]!.slot);
    return {
      p: [side * 1.3, y + 0.35, TOWER_Z + PULL_OUT + 3.6],
      look: [0, y, TOWER_Z + PULL_OUT],
      fov: 44,
    };
  }

  /** The room is a single tower: the same at every tier. */
  setProfile(): void {
    /* intentionally empty */
  }

  protected tick(_dt: number, now: number): void {
    this.ledMaterial.uniforms['uTime']!.value = now;
    this.glow.opacity = 0.3 + 0.1 * Math.sin(now * 2.2);
  }
}

export function createEducationRoom(context: RoomContext): Room {
  return new EducationRoom(context);
}
