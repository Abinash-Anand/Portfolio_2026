import { PROFILE_RECORDS } from '../../content/profile';
import { RESUME } from '../../content/resume';
import { makeProject } from '../../data/testing';
import { buildSceneContent } from './scene-content';

const synth = makeProject({
  slug: 'SynthGraph',
  title: 'SynthGraph',
  stack: ['TypeScript', 'Python'],
  stars: 3,
  languages: [
    { name: 'TypeScript', color: '#3178c6', percent: 70.9 },
    { name: 'Python', color: '#3572a5', percent: 28.2 },
  ],
  featured: true,
});
const park = makeProject({
  slug: 'ParkRabbit',
  title: 'ParkRabbit',
  stack: ['Java'],
  featured: true,
});
const plain = makeProject({ slug: 'plain', title: 'Plain', summary: 'A plain library.' });

describe('buildSceneContent', () => {
  it('carries the CV content across unchanged, so the 3D rooms and the 2D pages agree', () => {
    const content = buildSceneContent(RESUME, [synth], [synth]);

    expect(content.records).toBe(PROFILE_RECORDS);
    expect(content.skills.map((s) => s.label)).toEqual(RESUME.skills.map((s) => s.label));
    expect(content.skills[0]!.items).toEqual(RESUME.skills[0]!.items);
    expect(content.education.map((e) => e.degree)).toEqual(RESUME.education.map((e) => e.degree));
    expect(content.experience.map((e) => e.role)).toEqual(RESUME.experience.map((e) => e.role));
    expect(content.experience[1]!.highlights).toEqual(RESUME.experience[1]!.highlights);
  });

  it('keeps the experience in the order of the CV, newest first, as git log would', () => {
    const { experience } = buildSceneContent(RESUME, [], []);
    expect(experience.map((e) => e.id)).toEqual(RESUME.experience.map((e) => e.id));
    expect(experience[0]!.period).toBe(RESUME.experience[0]!.period);
  });

  it('makes a pod for each pinned project, with the CV caption when the CV describes it', () => {
    const { projects } = buildSceneContent(RESUME, [synth, park, plain], [synth, park]);
    expect(projects.map((p) => p.slug)).toEqual(['SynthGraph', 'ParkRabbit']);
    expect(projects[0]!.caption).toBe(
      RESUME.projects.find((p) => p.repoSlug === 'SynthGraph')!.role,
    );
    expect(projects[0]!.stars).toBe(3);
    expect(projects[0]!.languages).toEqual([
      { name: 'TypeScript', percent: 70.9 },
      { name: 'Python', percent: 28.2 },
    ]);
  });

  it('falls back to the first projects, with their GitHub summary, until some are pinned', () => {
    const { projects } = buildSceneContent(RESUME, [plain, synth], []);
    expect(projects.map((p) => p.slug)).toEqual(['plain', 'SynthGraph']);
    expect(projects[0]!.caption).toBe('A plain library.');
  });

  it('draws an event pipeline for event-driven work, and a graph for the rest', () => {
    const { projects } = buildSceneContent(RESUME, [synth, park, plain], [synth, park, plain]);
    expect(projects.find((p) => p.slug === 'ParkRabbit')!.kind).toBe('events'); // the CV says RabbitMQ and WebSockets
    expect(projects.find((p) => p.slug === 'SynthGraph')!.kind).toBe('graph');
    expect(projects.find((p) => p.slug === 'plain')!.kind).toBe('graph');
  });

  it('also detects event-driven work from the project itself', () => {
    const queue = makeProject({ slug: 'q', summary: 'An event-driven job runner on Kafka.' });
    expect(buildSceneContent(RESUME, [queue], [queue]).projects[0]!.kind).toBe('events');
  });

  it('draws at most five pods', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      makeProject({ slug: `p${i}`, featured: true }),
    );
    expect(buildSceneContent(RESUME, many, many).projects).toHaveLength(5);
  });

  it('copes with no projects at all', () => {
    expect(buildSceneContent(RESUME, [], []).projects).toEqual([]);
  });
});
