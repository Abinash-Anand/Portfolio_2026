import { InjectionToken } from '@angular/core';
import type { EndpointId } from '../core/experience';
import type { Tier } from '../motion/tier';

/**
 * The contract between the Angular app and whatever draws the world (ARCHITECTURE.md S3, S4).
 *
 * A SceneHost is an imperative island: framework-agnostic, no Angular imports, and nothing per frame ever
 * crosses back into signals. The Angular side pushes COARSE state in (phase, tier, size) and PULLS stats out a
 * few times a second. Implementations: a 2D-canvas placeholder (Phase 2) and the Three.js scene (Spike 0).
 */

export type ScenePhase = 'boot' | 'console' | 'journey' | 'room';

export interface SceneSnapshot {
  readonly phase: ScenePhase;
  readonly endpoint: EndpointId | null;
}

/** Tiers a host actually renders at; `static` means "no canvas" and never reaches a host. */
export type RenderTier = Exclude<Tier, 'static'>;

/** What a visitor can hover in the DOM that the 3D world should react to. */
export type SceneHover = 'headset' | null;

export interface SceneStats {
  /** What draws the world, shown in the HUD (`ENGINE: ...`). */
  readonly engine: string;
  /** Rendered frames per second, averaged over about half a second. */
  readonly fps: number;
  /** Average time between rendered frames, in ms. */
  readonly frameMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
  /** Average JavaScript time per frame (update plus render submission), when the host measures it. */
  readonly cpuMs?: number;
  /** Average GPU time per frame from timer queries; null when the browser does not expose them. */
  readonly gpuMs?: number | null;
  /** Live GPU resources, for leak checks. */
  readonly geometries?: number;
  readonly textures?: number;
}

/** Resource and draw counters straight from the renderer. */
export interface RenderInfo {
  readonly calls: number;
  readonly triangles: number;
  readonly points: number;
  readonly lines: number;
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
}

export interface FrameRecording {
  /** Time between rendered frames, in ms. */
  readonly deltaMs: readonly number[];
  /** JavaScript time per frame, in ms. */
  readonly cpuMs: readonly number[];
  /** GPU time per frame from timer queries, in ms. Empty when the browser does not expose them. */
  readonly gpuMs: readonly number[];
}

/** Measurement hooks used by the Spike 0 benchmark. Optional: only the real 3D host implements them. */
export interface BenchApi {
  /**
   * Renders `frames` frames back to back (no vsync, no pacing) and forces the GPU to finish each one,
   * so the wall time is the true CPU + GPU cost of a frame regardless of the display or a throttled tab.
   */
  renderCost(frames: number): Promise<{ cpuMs: number[]; wallMs: number[]; gpuMs: number[] }>;
  info(): RenderInfo;
  startRecording(): void;
  stopRecording(): FrameRecording;
  /** Adds `layers` full-screen overdraw layers to push GPU time over budget (governor test). */
  setStress(layers: number): void;
  /** Turns on GPU timer queries. Returns false when the browser does not support them. */
  enableGpuTiming(): boolean;
  /**
   * What the renderer still counted as alive right after `dispose()` released the scene (null before disposal).
   * Anything above zero is a leak.
   */
  residual(): RenderInfo | null;
  /** Resolves when every shader program has finished compiling (started at mount). */
  whenCompiled(): Promise<void>;
  /** Runs the first-draw warm-up now (normally spread over the first frames); returns each step's time in ms. */
  warmUp(): Promise<number[]>;
}

export interface SceneHost {
  readonly engine: string;
  /** Receives the (60 fps-normalised) time of every rendered frame, for the adaptive-quality governor. */
  onFrameTime: ((ms: number) => void) | null;
  /** Called when the browser takes the WebGL context away (common on phones under memory pressure). */
  onContextLost?: (() => void) | null;
  mount(canvas: HTMLCanvasElement): void;
  setSnapshot(snapshot: SceneSnapshot): void;
  setTier(tier: RenderTier): void;
  /** Reacts to a DOM control being hovered, for example the headset glowing when "Initialize" is hovered. */
  setHover?(target: SceneHover): void;
  resize(width: number, height: number, devicePixelRatio: number): void;
  pause(): void;
  resume(): void;
  /** Pulled by the dev overlay a few times a second. */
  stats(): SceneStats;
  readonly bench?: BenchApi;
  /** Releases everything: loop, GPU resources, listeners. Safe to call twice. */
  dispose(): void;
}

/** Asynchronous so the implementation (and its libraries, such as Three.js) can be loaded lazily. */
export type SceneHostFactory = () => Promise<SceneHost>;

/** Which scene implementation to use. Provided in app.config. */
export const SCENE_HOST_FACTORY = new InjectionToken<SceneHostFactory>('SCENE_HOST_FACTORY');
