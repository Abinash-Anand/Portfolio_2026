import { PROFILE_RECORDS } from '../../content/profile';
import type { Resume } from '../../content/resume';
import type { Project } from '../../data/models';
import type { SceneContent } from '../../scene/scene-host';

/** Work that is about events and messages gets an event-pipeline pod instead of a lineage graph. */
const EVENT_WORDS = /rabbitmq|websocket|event[- ]driven|message queue|kafka|mqtt/i;

/** The most pods the projects room draws. */
const MAX_PROJECTS = 5;

/**
 * The projects the experience shows: the pinned ones first, and until some are pinned the first few, so the room
 * and its panel are never empty. One rule for both, so a pod and a card in the panel always match.
 */
export function showcaseProjects(
  projects: readonly Project[],
  featured: readonly Project[],
): readonly Project[] {
  return (featured.length ? featured : projects).slice(0, MAX_PROJECTS);
}

/**
 * Maps what the site already knows (the CV content and the synced GitHub projects) into the plain data the 3D rooms
 * are built from. The scene never imports these layers: this is the one place they meet, so the rooms and the 2D
 * pages show the same facts by construction.
 */
export function buildSceneContent(
  resume: Resume,
  projects: readonly Project[],
  featured: readonly Project[],
): SceneContent {
  const shown = showcaseProjects(projects, featured);

  return {
    records: PROFILE_RECORDS,
    skills: resume.skills.map(({ id, label, items }) => ({ id, label, items })),
    education: resume.education.map(({ id, degree, institution, period, note }) => ({
      id,
      degree,
      institution,
      period,
      note,
    })),
    experience: resume.experience.map(({ id, role, organisation, period, highlights }) => ({
      id,
      role,
      organisation,
      period,
      highlights,
    })),
    projects: shown.map((project) => {
      const entry = resume.projects.find((candidate) => candidate.repoSlug === project.slug);
      const text = [
        entry?.role,
        ...(entry?.highlights ?? []),
        project.summary,
        ...project.stack,
      ].join(' ');
      return {
        slug: project.slug,
        title: project.title,
        caption: entry?.role ?? project.summary,
        kind: EVENT_WORDS.test(text) ? ('events' as const) : ('graph' as const),
        stack: project.stack,
        stars: project.stars,
        languages: project.languages.map(({ name, percent }) => ({ name, percent })),
      };
    }),
  };
}
