import type { EndpointId } from '../../core/experience';
import type { SceneContent } from '../scene-host';
import type { Pointer, Pose } from './camera-rig';
import type { LabelAtlasOptions } from './labels';
import type { ThreeProfile } from './profiles';
import type { WorldPart } from './world/part';

/**
 * A destination of the journey (CONCEPT.md section 7): a self-contained piece of world, built from content,
 * shown while the visitor is in that room and released when they have moved on. At most two rooms exist at once
 * (the current one and the one being prepared), which is the per-tier memory budget.
 */
export interface RoomContext {
  readonly content: SceneContent;
  readonly profile: ThreeProfile;
  /** Seeded in tests so scenes are reproducible. */
  readonly random: () => number;
  /** Where label text is drawn. Defaults to a DOM canvas; tests supply a fake. */
  readonly createCanvas?: LabelAtlasOptions['createCanvas'];
}

export interface Room extends WorldPart {
  readonly id: EndpointId;

  /**
   * Where the camera wants to be `t` seconds after arriving. Pure with respect to the room's own state (its focus),
   * so it is unit-testable; the camera rig eases toward it, so a change of focus becomes a smooth move.
   */
  pose(t: number, pointer: Pointer, aspect: number): Pose;

  /** Applies a quality tier by trimming counts. Never rebuilds geometry. */
  setProfile(profile: ThreeProfile): void;

  /** Scales point sprites with the drawing-buffer height, so glowing dots look the same at any resolution. */
  setPixelScale(scale: number): void;

  /** Draws attention to one thing in the room (a project pod, a commit); null releases it. Unknown ids are ignored. */
  setFocus(id: string | null): void;

  /** The room becomes the visible one. */
  show(): void;
  hide(): void;
}

/** Builds a room from content. Synchronous: construction is one scheduled step, so keep it cheap. */
export type RoomFactory = (context: RoomContext) => Room;

/** Loads the code of a room (its own chunk). */
export type RoomLoader = () => Promise<RoomFactory>;

/** The lazy loaders for every endpoint, one chunk each, so a visitor only downloads the rooms they enter. */
export const ROOM_LOADERS: Readonly<Record<EndpointId, RoomLoader>> = {
  about: () => import('./rooms/about-room').then((m) => m.createAboutRoom),
  education: () => import('./rooms/education-room').then((m) => m.createEducationRoom),
  skills: () => import('./rooms/skills-room').then((m) => m.createSkillsRoom),
  projects: () => import('./rooms/projects-room').then((m) => m.createProjectsRoom),
  experience: () => import('./rooms/experience-room').then((m) => m.createExperienceRoom),
};
