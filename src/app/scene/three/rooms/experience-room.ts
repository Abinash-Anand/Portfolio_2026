import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { EndpointId } from '../../../core/experience';
import { damp, type Pose } from '../camera-rig';
import { LabelAtlas, wrapText, type LabelPlacement, type LabelSpec } from '../labels';
import { tokenColor } from '../palette';
import { MAX_RINGS, type ThreeProfile } from '../profiles';
import type { Room, RoomContext } from '../room';
import {
  createPulseField,
  FLOOR_Y,
  gridGeometry,
  seededRandom,
  segmentsGeometry,
  type PulseField,
} from '../world/kit';
import { pathPose, pingPong, type Waypoint } from '../world/path';
import { BaseRoom } from './base-room';

/**
 * Experience: the git commit vault. A dark corridor drawn as a `git log --graph`: the main branch runs down the
 * middle, each job is a commit (newest nearest, like `git log`), and as the camera reaches a commit, or the
 * visitor picks it, its achievements unfold in mid-air beside it. The words come from the experience content.
 */

const MAX_COMMITS = 5;
const FIRST_COMMIT_Z = -9;
const COMMIT_PITCH = 11;
const BRANCH_Y = 1.2;
const CORRIDOR_HALF_WIDTH = 3.4;
const CORRIDOR_HEIGHT = 5.6;
const RIB_PITCH = 3;
const MAX_RIBS = 56;
const PERIOD = 100;
/** How much of a commit's achievements the 3D card shows: whole bullets up to this many characters. */
const BODY_CHARS = 300;
const BODY_WRAP = 34;

/**
 * The text of an expanded commit: as many whole achievements as fit in `maxChars`, each wrapped under a bullet,
 * and a note when more exist (the full list is always in the page next to the 3D view).
 */
export function expandedLines(highlights: readonly string[], maxChars = BODY_CHARS): string[] {
  const lines: string[] = [];
  let used = 0;
  let shown = 0;
  for (const highlight of highlights) {
    if (shown > 0 && used + highlight.length > maxChars) break;
    wrapText(highlight, BODY_WRAP).forEach((line, i) =>
      lines.push(i === 0 ? `• ${line}` : `  ${line}`),
    );
    used += highlight.length;
    shown++;
  }
  if (shown < highlights.length) lines.push(`+ ${highlights.length - shown} more in the panel`);
  return lines;
}

class ExperienceRoom extends BaseRoom {
  readonly id: EndpointId = 'experience';

  private readonly commits: readonly { id: string; z: number }[];
  private readonly bodies: Mesh[] = [];
  private readonly bodyScale: number[] = [];
  private readonly pulses: PulseField;
  private readonly pulseTotal: number;
  private readonly cam: Pose = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 60 };

  constructor(context: RoomContext) {
    super();
    const matrix = new Matrix4();
    const entries = context.content.experience.slice(0, MAX_COMMITS);
    this.commits = entries.map((entry, i) => ({
      id: entry.id,
      z: FIRST_COMMIT_Z - i * COMMIT_PITCH,
    }));
    const length = Math.abs(FIRST_COMMIT_Z) + Math.max(0, entries.length - 1) * COMMIT_PITCH + 10;
    const far = -length;

    // The corridor: ribs along both walls, long rails, and a floor grid.
    const ribCount = Math.min(MAX_RIBS, Math.ceil(length / RIB_PITCH) * 2);
    const ribs = new InstancedMesh(
      new BoxGeometry(0.14, CORRIDOR_HEIGHT, 0.14),
      new MeshBasicMaterial({ color: tokenColor('surface') }),
      ribCount,
    );
    for (let i = 0; i < ribCount; i++) {
      const z = -Math.floor(i / 2) * RIB_PITCH;
      ribs.setMatrixAt(
        i,
        matrix.makeTranslation(
          (i % 2 === 0 ? -1 : 1) * CORRIDOR_HALF_WIDTH,
          FLOOR_Y + CORRIDOR_HEIGHT / 2,
          z,
        ),
      );
    }
    const top = FLOOR_Y + CORRIDOR_HEIGHT;
    const rails: number[] = [];
    for (const x of [-CORRIDOR_HALF_WIDTH, CORRIDOR_HALF_WIDTH]) {
      rails.push(x, FLOOR_Y, 4, x, FLOOR_Y, far, x, top, 4, x, top, far);
    }
    this.object.add(
      ribs,
      new LineSegments(
        segmentsGeometry(rails),
        new LineBasicMaterial({ color: tokenColor('blue'), transparent: true, opacity: 0.35 }),
      ),
      new LineSegments(
        gridGeometry(CORRIDOR_HALF_WIDTH, 4, far, 1.7, FLOOR_Y),
        new LineBasicMaterial({
          color: tokenColor('blue'),
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      ),
    );

    // The branches: the main line, and two side branches that split off and merge back between commits.
    const bars = new InstancedMesh(
      new BoxGeometry(0.04, 0.04, 1),
      new MeshBasicMaterial({
        color: tokenColor('blue-soft'),
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      3,
    );
    bars.setMatrixAt(0, matrix.makeScale(1, 1, length + 2).setPosition(0, BRANCH_Y, (2 + far) / 2));
    const sideA = this.sideSpan(0);
    const sideB = this.sideSpan(1);
    bars.setMatrixAt(
      1,
      matrix.makeScale(1, 1, sideA.length).setPosition(-1.3, BRANCH_Y, sideA.centre),
    );
    bars.setMatrixAt(
      2,
      matrix.makeScale(1, 1, sideB.length).setPosition(1.3, BRANCH_Y, sideB.centre),
    );
    bars.count = entries.length > 1 ? 3 : 1;
    this.object.add(bars);

    // Commit nodes (the newest is `HEAD`, in gold) with a ring around each, plus decorative commits on the branches.
    const count = Math.max(1, entries.length);
    const nodes = new InstancedMesh(
      new SphereGeometry(0.34, 16, 12),
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      count,
    );
    const rings = new InstancedMesh(
      new TorusGeometry(0.62, 0.025, 6, 32),
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      count,
    );
    nodes.count = rings.count = entries.length;
    this.commits.forEach((commit, i) => {
      nodes.setMatrixAt(i, matrix.makeTranslation(0, BRANCH_Y, commit.z));
      rings.setMatrixAt(i, matrix.makeTranslation(0, BRANCH_Y, commit.z));
      const colour = tokenColor(i === 0 ? 'gold' : 'blue-soft');
      nodes.setColorAt(i, colour);
      rings.setColorAt(i, colour);
    });
    const connectors: number[] = [];
    const sideCommits: [number, number][] = [];
    if (entries.length > 1) {
      for (const [side, span] of [
        [-1.3, sideA],
        [1.3, sideB],
      ] as const) {
        for (let k = 1; k <= 3; k++)
          sideCommits.push([side, span.start - (span.start - span.end) * (k / 4)]);
        connectors.push(
          0,
          BRANCH_Y,
          span.start,
          side,
          BRANCH_Y,
          span.start - 1.4,
          side,
          BRANCH_Y,
          span.end + 1.4,
          0,
          BRANCH_Y,
          span.end,
        );
      }
    }
    const small = new InstancedMesh(
      new SphereGeometry(0.15, 10, 8),
      new MeshBasicMaterial({ color: tokenColor('blue') }),
      Math.max(1, sideCommits.length),
    );
    small.count = sideCommits.length;
    sideCommits.forEach(([x, z], i) =>
      small.setMatrixAt(i, matrix.makeTranslation(x, BRANCH_Y, z)),
    );
    this.object.add(nodes, rings, small);
    if (connectors.length) {
      this.object.add(
        new LineSegments(
          segmentsGeometry(connectors),
          new LineBasicMaterial({ color: tokenColor('blue'), transparent: true, opacity: 0.5 }),
        ),
      );
    }

    // History flows toward the present: pulses from the oldest commit to HEAD.
    const perSegment = 10;
    this.pulses = createPulseField(
      [{ from: [0, BRANCH_Y, far], to: [0, BRANCH_Y, 2] }],
      perSegment,
      'blue-soft',
      seededRandom('experience'),
    );
    this.pulseTotal = perSegment;
    this.addPulses(this.pulses);
    this.setProfile(context.profile);

    this.addLabels(context, entries);

    this.waypoints = entries.length
      ? [
          { p: [0, 1.8, 2], look: [0, 1.6, -10], fov: 62 },
          ...this.commits.map((commit): Waypoint => ({
            p: [1.1, 1.95, commit.z + 5],
            look: [-0.4, 1.6, commit.z - 2],
          })),
          {
            p: [0, 1.8, this.commits[this.commits.length - 1]!.z - 7],
            look: [0, 1.6, this.commits[this.commits.length - 1]!.z - 20],
          },
        ]
      : [{ p: [0, 1.8, 2], look: [0, 1.6, -14], fov: 62 }];
    this.period = PERIOD;
    this.object.visible = false;
  }

  /** Where a side branch splits from and rejoins the main line (between consecutive commits). */
  private sideSpan(index: number): { start: number; end: number; length: number; centre: number } {
    const start = FIRST_COMMIT_Z - index * COMMIT_PITCH;
    const end = start - COMMIT_PITCH;
    return { start, end, length: COMMIT_PITCH, centre: (start + end) / 2 };
  }

  private addLabels(context: RoomContext, entries: RoomContext['content']['experience']): void {
    if (!entries.length) return;
    const specs: LabelSpec[] = [
      {
        id: 'head',
        lines: ['HEAD -> main'],
        color: 'gold',
        size: 28,
        panel: true,
        accent: 'gold',
        align: 'center',
      },
    ];
    entries.forEach((entry, i) => {
      specs.push(
        {
          id: `title-${i}`,
          lines: [entry.period, ...wrapText(entry.role, 22), `@ ${entry.organisation}`],
          color: 'text',
          size: 28,
          panel: true,
          accent: i === 0 ? 'gold' : 'blue',
        },
        {
          id: `body-${i}`,
          lines: expandedLines(entry.highlights),
          color: 'cyan',
          size: 22,
          panel: true,
          accent: 'cyan',
        },
      );
    });
    const atlas = LabelAtlas.create(specs, { createCanvas: context.createCanvas });

    const fixed: LabelPlacement[] = [
      { id: 'head', position: [1.3, 2.2, FIRST_COMMIT_Z], height: 0.34 },
    ];
    this.commits.forEach((commit, i) => {
      fixed.push({
        id: `title-${i}`,
        position: [-2.45, 1.8, commit.z],
        height: 1.15,
        rotationY: 0.3,
      });
    });
    this.object.add(atlas.mesh(fixed));

    // The expanded cards start folded away and grow in when their commit is reached or picked.
    this.commits.forEach((commit, i) => {
      const body = atlas.mesh([
        {
          id: `body-${i}`,
          position: [0, 0, 0],
          height: Math.min(1.5, 4.2 / atlas.aspect(`body-${i}`)),
          rotationY: -0.3,
        },
      ]);
      body.position.set(2.45, 2.2, commit.z);
      body.visible = false;
      body.scale.setScalar(0.001);
      this.bodies.push(body);
      this.bodyScale.push(0);
      this.object.add(body);
    });
  }

  protected focusWaypoint(id: string): Waypoint | null {
    const commit = this.commits.find((c) => c.id === id);
    if (!commit) return null;
    return { p: [1.0, 1.9, commit.z + 4.8], look: [-0.2, 1.8, commit.z], fov: 52 };
  }

  setProfile(profile: ThreeProfile): void {
    this.pulses.setCount(Math.floor(this.pulseTotal * (profile.rings / MAX_RINGS)));
  }

  protected tick(dt: number): void {
    // The commit the camera is dwelling at opens by itself; a picked commit stays open.
    const camZ = pathPose(this.waypoints, pingPong(this.time, this.period), this.cam).pz;
    const focused = this.focused;
    this.commits.forEach((commit, i) => {
      const dwelling = focused === null && Math.abs(camZ - (commit.z + 5)) < 3.2;
      const target = focused === commit.id || dwelling ? 1 : 0;
      const next = damp(this.bodyScale[i]!, target, 5, dt);
      this.bodyScale[i] = next;
      const body = this.bodies[i]!;
      body.visible = next > 0.02;
      body.scale.setScalar(Math.max(next, 0.001));
    });
  }
}

export function createExperienceRoom(context: RoomContext): Room {
  return new ExperienceRoom(context);
}
