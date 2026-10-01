import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { ColorToken } from '../../../core/design/tokens';
import type { EndpointId } from '../../../core/experience';
import type { SceneContent } from '../../scene-host';
import { LabelAtlas, wrapText, type LabelPlacement, type LabelSpec } from '../labels';
import { tokenColor } from '../palette';
import { MAX_RINGS, type ThreeProfile } from '../profiles';
import type { Room, RoomContext } from '../room';
import {
  clamp,
  createPulseField,
  FLOOR_Y,
  gridGeometry,
  seededRandom,
  segmentsGeometry,
  type PulseField,
  type PulseSegment,
} from '../world/kit';
import type { Waypoint } from '../world/path';
import { BaseRoom } from './base-room';

/**
 * Projects: the deployed production bay. One pod per project, generated from the project data (a graph whose
 * size follows the project's languages and stars, or a producer-queue-consumer pipeline for event-driven work),
 * so adding a project on GitHub adds a pod without any code change. Pods, glass, rings and nodes are instanced:
 * about ten draw calls however many pods there are.
 */

const MAX_PODS = 5;
const POD_PITCH = 8.2;
const POD_X = 5;
const POD_RADIUS = 2.6;
const POD_HEIGHT = 5;
const POD_CENTER_Y = 2.6;
const FIRST_POD_Z = -7;
const PERIOD = 96;
const ACCENTS: readonly ColorToken[] = ['cyan', 'gold', 'violet', 'emerald', 'blue'];

type Vec3 = readonly [number, number, number];

export interface PodGraph {
  readonly nodes: readonly Vec3[];
  readonly edges: readonly (readonly [number, number])[];
}

/**
 * The picture inside a pod, deterministic for a given seed. A `graph` is points on a sphere joined to their
 * neighbours (a data-lineage network); `events` is three columns, producers to queues to consumers, with every
 * edge pointing the way messages travel.
 */
export function podGraph(kind: 'graph' | 'events', seed: string, size: number): PodGraph {
  const random = seededRandom(seed);
  const nodes: Vec3[] = [];
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const connect = (a: number, b: number): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(key)) {
      seen.add(key);
      edges.push([a, b]);
    }
  };

  if (kind === 'events') {
    const columns = [
      3 + Math.floor(random() * 2),
      2 + Math.floor(random() * 2),
      3 + Math.floor(random() * 2),
    ];
    const firstOfColumn: number[] = [];
    columns.forEach((count, column) => {
      firstOfColumn.push(nodes.length);
      for (let i = 0; i < count; i++) {
        const y = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2.6;
        nodes.push([(column - 1) * 1.7, y, (random() - 0.5) * 0.7]);
      }
    });
    for (let column = 0; column < 2; column++) {
      for (let i = 0; i < columns[column]!; i++) {
        const from = firstOfColumn[column]! + i;
        const targets = 1 + Math.floor(random() * 2);
        for (let t = 0; t < targets; t++) {
          connect(from, firstOfColumn[column + 1]! + Math.floor(random() * columns[column + 1]!));
        }
      }
    }
    return { nodes, edges };
  }

  const count = clamp(Math.round(size), 8, 40);
  nodes.push([0, 0, 0]); // the hub
  for (let i = 0; i < count; i++) {
    // A Fibonacci sphere spreads points evenly; a little jitter makes it organic.
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const angle = i * 2.399963;
    const radius = 1.55 + (random() - 0.5) * 0.5;
    nodes.push([Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius]);
  }
  for (let i = 1; i < nodes.length; i++) {
    const nearest = nodes
      .map((node, j) => ({
        j,
        d:
          (node[0] - nodes[i]![0]) ** 2 +
          (node[1] - nodes[i]![1]) ** 2 +
          (node[2] - nodes[i]![2]) ** 2,
      }))
      .filter(({ j }) => j !== i && j !== 0)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of nearest) connect(i, j);
    if (i % 4 === 0) connect(0, i);
  }
  return { nodes, edges };
}

/** How many nodes a `graph` pod gets: more languages and more stars mean a bigger network. */
export function graphSize(languages: number, stars: number): number {
  return clamp(14 + 4 * languages + 2 * Math.floor(Math.log2(stars + 1)), 14, 36);
}

type PodContent = SceneContent['projects'][number];

class ProjectsRoom extends BaseRoom {
  readonly id: EndpointId = 'projects';

  private readonly slugs: readonly string[];
  private readonly places: readonly { x: number; z: number }[];
  private readonly scanners: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly pulses: PulseField;
  private readonly pulseTotal: number;

  constructor(context: RoomContext) {
    super();
    const matrix = this.matrix;
    const projects = context.content.projects.slice(0, MAX_PODS);
    this.slugs = projects.map((project) => project.slug);
    this.places = projects.map((_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * POD_X,
      z: FIRST_POD_Z - i * POD_PITCH,
    }));
    const count = Math.max(1, projects.length);
    const bayLength = FIRST_POD_Z - projects.length * POD_PITCH - 6;

    // The bay floor.
    this.object.add(
      new LineSegments(
        gridGeometry(14, 4, bayLength, 2, FLOOR_Y),
        new LineBasicMaterial({
          color: tokenColor('gold'),
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      ),
    );

    // Pod structure: platform, glass, two rings, and a ring that scans up and down.
    const platforms = new InstancedMesh(
      new CylinderGeometry(2.8, 3, 0.35, 40),
      new MeshBasicMaterial({ color: tokenColor('surface') }),
      count,
    );
    const glass = new InstancedMesh(
      new CylinderGeometry(POD_RADIUS, POD_RADIUS, POD_HEIGHT, 32, 1, true),
      new MeshBasicMaterial({
        color: new Color(1, 1, 1),
        transparent: true,
        opacity: 0.08,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
      count,
    );
    const ringGeometry = new TorusGeometry(POD_RADIUS, 0.03, 6, 48).rotateX(Math.PI / 2);
    const rings = new InstancedMesh(
      ringGeometry,
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      count * 2,
    );
    this.scanners = new InstancedMesh(
      ringGeometry,
      new MeshBasicMaterial({
        color: new Color(1, 1, 1),
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      count,
    );
    platforms.count = glass.count = this.scanners.count = projects.length;
    rings.count = projects.length * 2;
    this.scanners.frustumCulled = false;

    // The graphs inside: nodes in one instanced mesh, edges in one line mesh, pulses along the edges.
    const allNodes: { at: Vec3; accent: ColorToken; hub: boolean }[] = [];
    const edgeCoordinates: number[] = [];
    const pulseSegments: PulseSegment[] = [];
    projects.forEach((project, i) => {
      const place = this.places[i]!;
      const accent = ACCENTS[i % ACCENTS.length]!;
      platforms.setMatrixAt(i, matrix.makeTranslation(place.x, FLOOR_Y + 0.17, place.z));
      glass.setMatrixAt(i, matrix.makeTranslation(place.x, FLOOR_Y + POD_HEIGHT / 2, place.z));
      glass.setColorAt(i, tokenColor(accent));
      rings.setMatrixAt(i * 2, matrix.makeTranslation(place.x, FLOOR_Y + 0.25, place.z));
      rings.setMatrixAt(i * 2 + 1, matrix.makeTranslation(place.x, FLOOR_Y + POD_HEIGHT, place.z));
      rings.setColorAt(i * 2, tokenColor(accent));
      rings.setColorAt(i * 2 + 1, tokenColor(accent));
      this.scanners.setColorAt(i, tokenColor(accent));

      const graph = podGraph(
        project.kind,
        project.slug,
        graphSize(project.languages.length, project.stars),
      );
      const at = (node: Vec3): Vec3 => [
        place.x + node[0],
        POD_CENTER_Y + node[1],
        place.z + node[2],
      ];
      const offset = allNodes.length;
      graph.nodes.forEach((node, n) =>
        allNodes.push({ at: at(node), accent, hub: project.kind === 'graph' && n === 0 }),
      );
      for (const [a, b] of graph.edges) {
        const from = allNodes[offset + a]!.at;
        const to = allNodes[offset + b]!.at;
        edgeCoordinates.push(...from, ...to);
        pulseSegments.push({ from, to });
      }
    });
    platforms.instanceMatrix.needsUpdate = true;
    glass.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    this.object.add(platforms, glass, rings, this.scanners);

    const nodes = new InstancedMesh(
      new SphereGeometry(0.085, 8, 6),
      new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      Math.max(1, allNodes.length),
    );
    nodes.count = allNodes.length;
    allNodes.forEach((node, n) => {
      nodes.setMatrixAt(
        n,
        matrix
          .makeScale(node.hub ? 2 : 1, node.hub ? 2 : 1, node.hub ? 2 : 1)
          .setPosition(...node.at),
      );
      nodes.setColorAt(n, tokenColor(node.hub ? 'text' : node.accent));
    });
    nodes.instanceMatrix.needsUpdate = true;
    this.object.add(nodes);
    if (edgeCoordinates.length) {
      this.object.add(
        new LineSegments(
          segmentsGeometry(edgeCoordinates),
          new LineBasicMaterial({
            color: tokenColor('blue-soft'),
            transparent: true,
            opacity: 0.45,
          }),
        ),
      );
    }

    const perSegment = 2;
    this.pulses = createPulseField(pulseSegments, perSegment, 'gold', seededRandom('projects'));
    this.pulseTotal = pulseSegments.length * perSegment;
    this.addPulses(this.pulses);
    this.setProfile(context.profile);

    this.addLabels(context, projects);

    // The camera: down the bay, swinging toward each pod in turn.
    const side = (i: number): number => (this.places[i]!.x < 0 ? 1 : -1);
    this.waypoints = projects.length
      ? [
          { p: [0, 3.2, 2], look: [0, 2.6, -10], fov: 62 },
          ...this.places.map((place, i): Waypoint => ({
            p: [side(i) * 1.6, 3.2, place.z + 6.2],
            look: [place.x * 0.75, POD_CENTER_Y - 0.1, place.z],
          })),
          {
            p: [0, 3.6, this.places[projects.length - 1]!.z - 5],
            look: [0, 2.4, this.places[projects.length - 1]!.z - 16],
          },
        ]
      : [{ p: [0, 3.2, 2], look: [0, 2.6, -14], fov: 62 }];
    this.period = PERIOD;
    this.object.visible = false;
  }

  private addLabels(context: RoomContext, projects: readonly PodContent[]): void {
    const specs: LabelSpec[] = [];
    projects.forEach((project, i) => {
      const accent = ACCENTS[i % ACCENTS.length]!;
      const languages = project.languages
        .slice(0, 3)
        .map((language) => `${language.name} ${Math.round(language.percent)}%`)
        .join(' · ');
      specs.push(
        { id: `title-${i}`, lines: [project.title], color: 'text', size: 52, align: 'center' },
        {
          id: `meta-${i}`,
          lines: [
            ...wrapText(project.caption, 34),
            ...wrapText(project.stack.slice(0, 5).join(' · '), 34),
            ...(languages ? [languages] : []),
            ...(project.stars > 0 ? [`★ ${project.stars}`] : []),
          ],
          color: 'blue-soft',
          size: 26,
          panel: true,
          accent,
        },
      );
    });
    if (!specs.length) return;
    const atlas = LabelAtlas.create(specs, { createCanvas: context.createCanvas });
    const placements: LabelPlacement[] = [];
    this.places.forEach((place, i) => {
      const turn = place.x < 0 ? 0.3 : -0.3;
      placements.push(
        {
          id: `title-${i}`,
          position: [place.x, FLOOR_Y + POD_HEIGHT + 0.9, place.z],
          height: 0.75,
          rotationY: turn,
        },
        {
          id: `meta-${i}`,
          position: [place.x * 0.7, 1.1, place.z + 3.6],
          height: Math.min(1.8, 4.2 / atlas.aspect(`meta-${i}`)),
          rotationY: turn,
          rotationX: -0.25,
        },
      );
    });
    this.object.add(atlas.mesh(placements));
  }

  protected focusWaypoint(id: string): Waypoint | null {
    const place = this.places[this.slugs.indexOf(id)];
    if (!place) return null;
    return {
      p: [place.x * 0.3, 3.1, place.z + 5.3],
      look: [place.x, POD_CENTER_Y, place.z],
      fov: 48,
    };
  }

  setProfile(profile: ThreeProfile): void {
    this.pulses.setCount(Math.floor(this.pulseTotal * (profile.rings / MAX_RINGS)));
  }

  protected tick(_dt: number, now: number): void {
    // Each pod's scanner ring sweeps up and down, out of step with its neighbours.
    for (let i = 0; i < this.places.length; i++) {
      const place = this.places[i]!;
      const y = FLOOR_Y + 0.3 + (0.5 + 0.5 * Math.sin(now * 0.9 + i * 1.3)) * (POD_HEIGHT - 0.5);
      this.scanners.setMatrixAt(i, this.matrix.makeTranslation(place.x, y, place.z));
    }
    this.scanners.instanceMatrix.needsUpdate = true;
  }
}

export function createProjectsRoom(context: RoomContext): Room {
  return new ProjectsRoom(context);
}
