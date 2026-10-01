import type { Object3D } from 'three';
import type { EndpointId } from '../../../core/experience';
import { EMPTY_CONTENT, type SceneContent } from '../../scene-host';
import type { Pose } from '../camera-rig';
import { THREE_PROFILES } from '../profiles';
import type { Room, RoomContext } from '../room';
import { ABOUT_LAYOUT, createAboutRoom } from './about-room';
import { bladeName, createEducationRoom } from './education-room';
import { createExperienceRoom, expandedLines } from './experience-room';
import { createProjectsRoom, graphSize, podGraph } from './projects-room';
import { chipLayout, createSkillsRoom } from './skills-room';

const SAMPLE: SceneContent = {
  records: [
    { key: 'NAME', value: 'Abinash Anand' },
    { key: 'ROLE', value: 'Full-Stack Software Engineer' },
    { key: 'LOCATION', value: 'Stuttgart, Germany' },
    { key: 'STATUS', value: 'Enrolled in M.Sc. Software Technology @ HFT Stuttgart' },
    {
      key: 'SPECIALIZATION',
      value: 'Software Architecture, Distributed Systems & Agentic Workflows',
    },
  ],
  skills: [
    {
      id: 'languages',
      label: 'Languages & Frameworks',
      items: ['TypeScript', 'React', 'Angular', 'NestJS'],
    },
    { id: 'data', label: 'Data & Backend', items: ['PostgreSQL', 'MongoDB', 'RabbitMQ'] },
    {
      id: 'arch',
      label: 'Architecture & Engineering',
      items: ['Software Architecture', 'System Design', 'Docker'],
    },
    { id: 'ai', label: 'AI-Assisted Engineering', items: ['Agentic coding workflows'] },
  ],
  education: [
    {
      id: 'msc',
      degree: 'M.Sc. Software Technology',
      institution: 'HFT Stuttgart',
      period: 'Oct 2025 – Aug 2027 (expected)',
      note: 'Focus: Software Architecture, Distributed Systems',
    },
    {
      id: 'btech',
      degree: 'B.Tech. Information Technology',
      institution: 'Bharati Vidyapeeth (DU) College of Engineering',
      period: 'Jul 2020 – Jun 2024',
      note: 'GPA: 1.6 (German scale)',
    },
  ],
  experience: [
    {
      id: 'hft',
      role: 'Student Assistant, Facility Data Systems',
      organisation: 'HFT Stuttgart',
      period: 'Jun 2026 – Aug 2026',
      highlights: [
        'Built and shipped a Python automation tool that replaced manual facility-data entry, processing 200+ records across 10+ buildings in a live production run with zero errors.',
        'Architected a hierarchical resolution and verification pipeline to guarantee data accuracy at scale.',
        'Delivered a fully automated test suite (100% passing) plus independent post-import verification.',
      ],
    },
    {
      id: 'letstream',
      role: 'Software Development Engineer I',
      organisation: 'Letstream',
      period: 'Dec 2024 – Apr 2025',
      highlights: [
        'Built a reactive Angular dashboard for logistics tracking, improving real-time data sync speed by 25%.',
      ],
    },
    {
      id: 'elluminati',
      role: 'Software Engineer, Full Stack Intern (MEAN)',
      organisation: 'Elluminati Ventures',
      period: 'Oct 2023 – Oct 2024',
      highlights: [
        'Built a full-stack ride-booking platform with real-time tracking and Stripe payments.',
      ],
    },
  ],
  projects: [
    {
      slug: 'SynthGraph',
      title: 'SynthGraph',
      caption: 'Data lineage and control plane for synthetic training data',
      kind: 'graph',
      stack: ['TypeScript', 'Python', 'JavaScript'],
      stars: 1,
      languages: [
        { name: 'TypeScript', percent: 70.9 },
        { name: 'Python', percent: 28.2 },
      ],
    },
    {
      slug: 'ParkRabbit',
      title: 'ParkRabbit',
      caption: 'Event-driven parking management system',
      kind: 'events',
      stack: ['Java', 'JavaScript'],
      stars: 1,
      languages: [{ name: 'Java', percent: 69.3 }],
    },
    {
      slug: 'Eber-app',
      title: 'Eber-app',
      caption: 'Ride booking platform',
      kind: 'graph',
      stack: ['JavaScript', 'TypeScript'],
      stars: 0,
      languages: [{ name: 'JavaScript', percent: 38.1 }],
    },
  ],
};

const contextFor = (
  content: SceneContent,
  tier: 'high' | 'medium' | 'low' = 'high',
): RoomContext => ({
  content,
  profile: THREE_PROFILES[tier],
  random: () => 0.5,
  createCanvas: () => null, // no canvas in tests: text quads are built, left blank
});

/** What to test in every room. */
interface RoomCase {
  readonly name: EndpointId;
  readonly create: (context: RoomContext) => Room;
  /** An id `setFocus` should accept, if the room has anything to focus. */
  readonly focusId?: string;
}

const CASES: readonly RoomCase[] = [
  { name: 'about', create: createAboutRoom },
  { name: 'education', create: createEducationRoom, focusId: 'btech' },
  { name: 'skills', create: createSkillsRoom, focusId: 'data' },
  { name: 'projects', create: createProjectsRoom, focusId: 'ParkRabbit' },
  { name: 'experience', create: createExperienceRoom, focusId: 'letstream' },
];

const centred = { x: 0, y: 0 };
const copy = (pose: Pose): Pose => ({ ...pose });

/** Objects that cost a draw call each (instanced meshes count once, however many instances). */
function drawables(root: Object3D): number {
  let count = 0;
  root.traverse((o) => {
    const flags = o as { isMesh?: boolean; isPoints?: boolean; isLine?: boolean };
    if (flags.isMesh || flags.isPoints || flags.isLine) count++;
  });
  return count;
}

function advance(room: Room, seconds: number, from = 0): number {
  let now = from;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    now += 1 / 60;
    room.update(1 / 60, now);
  }
  return now;
}

describe.each(CASES)('$name room', ({ name, create, focusId }) => {
  it('builds hidden, from real content and from nothing at all', () => {
    const real = create(contextFor(SAMPLE));
    expect(real.id).toBe(name);
    expect(real.object.visible).toBe(false);
    real.dispose();

    const empty = create(contextFor(EMPTY_CONTENT));
    expect(empty.object.visible).toBe(false);
    expect(() => advance(empty, 1)).not.toThrow(); // hidden: does nothing
    empty.show();
    expect(() => advance(empty, 2)).not.toThrow();
    expect(copy(empty.pose(5, centred, 1.6)).fov).toBeGreaterThan(0);
    empty.dispose();
  });

  it('stays within the draw-call budget, however much content it holds', () => {
    const room = create(contextFor(SAMPLE));
    expect(drawables(room.object)).toBeLessThanOrEqual(36);
    room.dispose();
  });

  it('shows and hides, and animates only while shown', () => {
    const room = create(contextFor(SAMPLE));
    room.show();
    expect(room.object.visible).toBe(true);
    expect(() => advance(room, 3)).not.toThrow();
    room.hide();
    expect(room.object.visible).toBe(false);
    room.dispose();
  });

  it('gives a camera path of finite, sensible poses that keeps moving, for as long as the visitor stays', () => {
    const room = create(contextFor(SAMPLE));
    room.show();
    let moved = 0;
    let previous: Pose | null = null;
    for (let t = 0; t < 600; t += 1.5) {
      const pose = copy(room.pose(t, centred, 1.6));
      for (const value of Object.values(pose)) expect(Number.isFinite(value)).toBe(true);
      expect(pose.fov).toBeGreaterThan(30);
      expect(pose.fov).toBeLessThan(100);
      for (const coordinate of [pose.px, pose.py, pose.pz, pose.tx, pose.ty, pose.tz]) {
        expect(Math.abs(coordinate)).toBeLessThan(120);
      }
      if (previous) {
        // No jumps: a smooth glide never moves more than a few metres in a second and a half.
        const step = Math.hypot(
          pose.px - previous.px,
          pose.py - previous.py,
          pose.pz - previous.pz,
        );
        expect(step).toBeLessThan(8);
        if (step > 0.01) moved++;
      }
      previous = pose;
    }
    expect(moved).toBeGreaterThan(100);
    room.dispose();
  });

  it('widens the field of view on a portrait screen and leans toward the pointer', () => {
    const room = create(contextFor(SAMPLE));
    const landscape = copy(room.pose(10, centred, 1.8));
    const portrait = copy(room.pose(10, centred, 0.5));
    expect(portrait.fov).toBeGreaterThan(landscape.fov);

    const left = copy(room.pose(10, { x: -1, y: 0 }, 1.8)).px;
    const right = copy(room.pose(10, { x: 1, y: 0 }, 1.8)).px;
    expect(right).toBeGreaterThan(left);
    room.dispose();
  });

  it('ignores a focus id it does not know, and moves toward one it does', () => {
    const room = create(contextFor(SAMPLE));
    room.show();
    const before = copy(room.pose(12, centred, 1.8));
    room.setFocus('no-such-thing');
    advance(room, 2);
    expect(copy(room.pose(12, centred, 1.8))).toEqual(before);

    if (focusId) {
      room.setFocus(focusId);
      advance(room, 3);
      const focused = copy(room.pose(12, centred, 1.8));
      expect(focused).not.toEqual(before);
      room.setFocus(null);
      advance(room, 4);
      const released = copy(room.pose(12, centred, 1.8));
      expect(Math.abs(released.px - before.px) + Math.abs(released.pz - before.pz)).toBeLessThan(
        0.1,
      );
    }
    room.dispose();
  });

  it('releases every GPU resource, once', () => {
    const room = create(contextFor(SAMPLE));
    const released = room.dispose();
    expect(released.geometries).toBeGreaterThan(2);
    expect(released.materials).toBeGreaterThan(1);
    expect(() => room.dispose()).not.toThrow();
  });
});

describe('quality tiers', () => {
  it('thins the About aisle on lower tiers without shortening the room', () => {
    const room = create(createAboutRoom, 'high');
    const racks = (r: Room) =>
      (
        r.object.children.find(
          (c) => 'count' in c && (c as { count: number }).count > 0,
        ) as unknown as { count: number }
      ).count;
    const high = racks(room);
    room.setProfile(THREE_PROFILES.low);
    expect(racks(room)).toBe(THREE_PROFILES.low.racksPerSide * 2);
    expect(racks(room)).toBeLessThan(high);
    room.dispose();

    function create(factory: (c: RoomContext) => Room, tier: 'high' | 'medium' | 'low'): Room {
      return factory(contextFor(SAMPLE, tier));
    }
  });

  it.each([
    ['skills', createSkillsRoom],
    ['projects', createProjectsRoom],
    ['experience', createExperienceRoom],
  ] as const)('%s has fewer streaming dots on a lower tier', (_name, factory) => {
    const room = factory(contextFor(SAMPLE, 'high'));
    const dots = (): number => {
      let count = 0;
      room.object.traverse((o) => {
        if ((o as { isPoints?: boolean }).isPoints)
          count += (o as unknown as { geometry: { drawRange: { count: number } } }).geometry
            .drawRange.count;
      });
      return count;
    };
    const high = dots();
    room.setProfile(THREE_PROFILES.low);
    expect(dots()).toBeLessThan(high);
    room.setProfile(THREE_PROFILES.high);
    expect(dots()).toBe(high);
    room.dispose();
  });
});

describe('About room layout', () => {
  const { CORE_Z, PIT_Z, PIT_BOTTOM, PERIOD, GATES } = ABOUT_LAYOUT;

  it('never takes the camera through the server core or the racks', () => {
    const room = createAboutRoom(contextFor(SAMPLE));
    for (let t = 0; t <= PERIOD; t += 0.25) {
      const pose = copy(room.pose(t, centred, 1.6));
      // Near the core's height and position the camera must be above it (the core stands 3.8 high).
      if (Math.abs(pose.pz - CORE_Z) < 1.8) expect(pose.py).toBeGreaterThan(4.2);
      // Inside the aisle, between the racks, while below their tops.
      if (pose.py < 6 && pose.pz < -2 && pose.pz > -38 && pose.py > -1)
        expect(Math.abs(pose.px)).toBeLessThan(2.8);
      // Down in the pit, inside the shaft and above the drums.
      if (pose.py < -1) {
        expect(Math.hypot(pose.px, pose.pz - PIT_Z)).toBeLessThan(4.2); // clear of the shaft wall (radius 5.6)
        expect(pose.py).toBeGreaterThan(PIT_BOTTOM + 1);
      }
    }
    room.dispose();
  });

  it('visits the whole story in order: aisle, gates, core, pit', () => {
    const room = createAboutRoom(contextFor(SAMPLE));
    const first = copy(room.pose(0, centred, 1.6));
    const middle = copy(room.pose(PERIOD / 2, centred, 1.6));
    expect(first.pz).toBeGreaterThan(GATES[0].z); // starts before the first gate
    expect(middle.py).toBeLessThan(0); // reaches the database vault
    expect(middle.pz).toBeLessThan(CORE_Z);
    room.dispose();
  });

  it('stamps "STATUS: AUTHORIZED" on each gate only after the camera has passed it', () => {
    const room = createAboutRoom(contextFor(SAMPLE));
    const authorized = (room as unknown as { authorized: { visible: boolean }[] }).authorized;
    room.show();
    advance(room, 0.5);
    expect(authorized.map((m) => m.visible)).toEqual([false, false]);

    // The camera passes the first gate (z = -9) before the second (z = -17).
    let sawFirstOnly = false;
    let now = 0.5;
    for (let i = 0; i < 60 * 30; i++) {
      now += 1 / 60;
      room.update(1 / 60, now);
      if (authorized[0]!.visible && !authorized[1]!.visible) sawFirstOnly = true;
    }
    expect(sawFirstOnly).toBe(true);
    expect(authorized.map((m) => m.visible)).toEqual([true, true]);
    room.dispose();
  });
});

describe('Education room', () => {
  it('names a blade the way a server blade would be named', () => {
    expect(bladeName('M.Sc. Software Technology')).toBe('M.SC_SOFTWARE_TECHNOLOGY');
    expect(bladeName('B.Tech. Information Technology')).toBe('B.TECH_INFORMATION_TECHNOLOGY');
    expect(bladeName('Diploma')).toBe('DIPLOMA');
  });

  it('shows no more than four degrees, and focuses each by id', () => {
    const many = {
      ...SAMPLE,
      education: Array.from({ length: 6 }, (_, i) => ({ ...SAMPLE.education[0]!, id: `d${i}` })),
    };
    const room = createEducationRoom(contextFor(many));
    room.setFocus('d3');
    expect((room as unknown as { focused: string | null }).focused).toBe('d3');
    room.setFocus('d4'); // the fifth is not drawn
    expect((room as unknown as { focused: string | null }).focused).toBeNull();
    room.dispose();
  });
});

describe('Skills room', () => {
  it('lays chips out in a grid with no overlaps, for any number of groups', () => {
    for (let count = 0; count <= 6; count++) {
      const spots = chipLayout(count);
      expect(spots).toHaveLength(count);
      for (let i = 0; i < spots.length; i++) {
        for (let j = i + 1; j < spots.length; j++) {
          const apartX = Math.abs(spots[i]!.x - spots[j]!.x) >= 5.2;
          const apartZ = Math.abs(spots[i]!.z - spots[j]!.z) >= 3.4;
          expect(apartX || apartZ).toBe(true);
        }
      }
    }
  });

  it('centres the board on the origin', () => {
    const spots = chipLayout(4);
    expect(spots.reduce((sum, s) => sum + s.x, 0)).toBeCloseTo(0, 10);
    expect(spots.reduce((sum, s) => sum + s.z, 0)).toBeCloseTo(0, 10);
  });
});

describe('Projects room', () => {
  it('generates the same picture for the same project, every time', () => {
    expect(podGraph('graph', 'SynthGraph', 20)).toEqual(podGraph('graph', 'SynthGraph', 20));
    expect(podGraph('graph', 'SynthGraph', 20)).not.toEqual(podGraph('graph', 'Other', 20));
  });

  it('builds valid graphs: edges join existing nodes, with no loops or repeats', () => {
    for (const kind of ['graph', 'events'] as const) {
      for (const seed of ['a', 'SynthGraph', 'ParkRabbit', 'Eber-app']) {
        const { nodes, edges } = podGraph(kind, seed, 24);
        expect(nodes.length).toBeGreaterThan(5);
        const keys = new Set<string>();
        for (const [a, b] of edges) {
          expect(a).not.toBe(b);
          expect(nodes[a]).toBeDefined();
          expect(nodes[b]).toBeDefined();
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }
        for (const node of nodes) for (const c of node) expect(Math.abs(c)).toBeLessThan(2.5); // inside the glass
      }
    }
  });

  it('sizes a graph by languages and stars, within limits', () => {
    expect(graphSize(1, 0)).toBe(18);
    expect(graphSize(5, 100)).toBeGreaterThan(graphSize(1, 0));
    expect(graphSize(50, 1_000_000)).toBe(36);
    expect(graphSize(0, 0)).toBe(14);
  });

  it('draws event pipelines left to right: every edge points the way messages travel', () => {
    const { nodes, edges } = podGraph('events', 'ParkRabbit', 0);
    for (const [from, to] of edges) expect(nodes[to]![0]).toBeGreaterThan(nodes[from]![0]);
  });

  it('builds a pod per project (at most five) and none for an empty list', () => {
    const many = {
      ...SAMPLE,
      projects: Array.from({ length: 9 }, (_, i) => ({
        ...SAMPLE.projects[0]!,
        slug: `p${i}`,
        title: `P${i}`,
      })),
    };
    const room = createProjectsRoom(contextFor(many));
    room.setFocus('p4');
    expect((room as unknown as { focused: string | null }).focused).toBe('p4');
    room.setFocus('p5');
    expect((room as unknown as { focused: string | null }).focused).toBeNull();
    room.dispose();

    const none = createProjectsRoom(contextFor({ ...SAMPLE, projects: [] }));
    none.show();
    expect(() => advance(none, 1)).not.toThrow();
    none.dispose();
  });
});

describe('Experience room', () => {
  it('shows whole achievements up to a limit, wrapped under bullets, and says when more exist', () => {
    const [first] = SAMPLE.experience;
    const lines = expandedLines(first!.highlights);
    expect(lines[0]).toMatch(/^• /);
    // The first two fit in the limit; the third would not, so it is left for the panel.
    expect(lines.filter((line) => line.startsWith('• '))).toHaveLength(2);
    expect(lines.at(-1)).toBe('+ 1 more in the panel');
    for (const line of lines.slice(0, -1)) expect(line.length).toBeLessThanOrEqual(38);

    // Continuation lines are indented under their bullet, and no words are lost.
    const text = lines
      .filter((line) => !line.startsWith('+'))
      .map((line) => line.replace(/^(• | {2})/, ''))
      .join(' ');
    expect(text).toBe(`${first!.highlights[0]} ${first!.highlights[1]}`);
  });

  it('always shows at least one achievement, however long, and counts the rest', () => {
    const long = 'word '.repeat(120).trim();
    const lines = expandedLines([long, 'second']);
    expect(lines.filter((line) => line.startsWith('• '))).toHaveLength(1);
    expect(lines.at(-1)).toBe('+ 1 more in the panel');
  });

  it('shows everything when it fits, with no "more" note', () => {
    expect(expandedLines(['Short one.', 'Short two.']).at(-1)).toBe(
      '  Short two.'.replace('  ', '• '),
    );
    expect(expandedLines([])).toEqual([]);
  });

  it('opens a commit by itself as the camera reaches it, and a picked commit stays open', () => {
    const room = createExperienceRoom(contextFor(SAMPLE));
    const bodies = (room as unknown as { bodies: { visible: boolean }[] }).bodies;
    room.show();
    expect(bodies.every((body) => !body.visible)).toBe(true);

    let opened = new Set<number>();
    let now = 0;
    for (let i = 0; i < 60 * 100; i++) {
      now += 1 / 60;
      room.update(1 / 60, now);
      bodies.forEach((body, index) => body.visible && opened.add(index));
    }
    expect(opened.size).toBe(bodies.length); // the tour opens each commit in turn

    opened = new Set();
    room.setFocus('letstream');
    advance(room, 3, now);
    expect(bodies.map((body) => body.visible)).toEqual([false, true, false]);
    room.dispose();
  });

  it('lists the newest commit nearest the visitor, like git log', () => {
    const room = createExperienceRoom(contextFor(SAMPLE));
    const commits = (room as unknown as { commits: { id: string; z: number }[] }).commits;
    expect(commits.map((c) => c.id)).toEqual(['hft', 'letstream', 'elluminati']);
    expect(commits[0]!.z).toBeGreaterThan(commits[1]!.z);
    expect(commits[1]!.z).toBeGreaterThan(commits[2]!.z);
    room.dispose();
  });
});
