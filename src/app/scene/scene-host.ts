import { InjectionToken } from '@angular/core';
import type { EndpointId } from '../core/experience';
import type { Tier } from '../motion/tier';

/**
 * The contract between the Angular app and whatever draws the world (ARCHITECTURE.md S3, S4).
 *
 * A SceneHost is an imperative island: framework-agnostic, no Angular imports, and nothing per frame ever
 * crosses back into signals. The Angular side pushes COARSE state in (phase, tier, size) and PULLS stats out a
 * few times a second. Phase 2 ships a placeholder implementation; Spike 0 replaces it with Three.js, and a
 * worker-backed host can implement the same interface later.
 */

export type ScenePhase = 'boot' | 'console' | 'journey' | 'room';

export interface SceneSnapshot {
  readonly phase: ScenePhase;
  readonly endpoint: EndpointId | null;
}

/** Tiers a host actually renders at; `static` means "no canvas" and never reaches a host. */
export type RenderTier = Exclude<Tier, 'static'>;

export interface SceneStats {
  /** What draws the world, shown in the HUD (`ENGINE: ...`). */
  readonly engine: string;
  /** Rendered frames per second, averaged over about half a second. */
  readonly fps: number;
  /** Average time between rendered frames, in ms. */
  readonly frameMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
}

export interface SceneHost {
  readonly engine: string;
  /** Receives the (60 fps-normalised) time of every rendered frame, for the adaptive-quality governor. */
  onFrameTime: ((ms: number) => void) | null;
  mount(canvas: HTMLCanvasElement): void;
  setSnapshot(snapshot: SceneSnapshot): void;
  setTier(tier: RenderTier): void;
  resize(width: number, height: number, devicePixelRatio: number): void;
  pause(): void;
  resume(): void;
  /** Pulled by the dev overlay a few times a second. */
  stats(): SceneStats;
  /** Releases everything: loop, buffers, listeners. Safe to call twice. */
  dispose(): void;
}

/** Asynchronous so the implementation (and its libraries, such as Three.js) can be loaded lazily. */
export type SceneHostFactory = () => Promise<SceneHost>;

/** Which scene implementation to use. Provided in app.config; Spike 0 swaps in the Three.js host. */
export const SCENE_HOST_FACTORY = new InjectionToken<SceneHostFactory>('SCENE_HOST_FACTORY');
