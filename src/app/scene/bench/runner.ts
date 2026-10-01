import type { EndpointId } from '../../core/experience';
import type { RenderTier, SceneHost, ScenePhase } from '../scene-host';
import {
  estimateRefreshHz,
  growth,
  meanFps,
  overBudgetRatio,
  summarize,
  type Summary,
} from './stats';

/**
 * The Spike 0 measurements (docs/SPIKE-0.md). Each scenario takes a host and returns plain data, so results can
 * be read in the page, pasted into an issue, or collected by automation (`window.__spike`).
 *
 * Why two ways to measure: the `cost` scenarios render back to back and force the GPU to finish each frame, so
 * they measure what a frame COSTS and work on any display, even in a throttled tab. The `live` scenarios let the
 * real frame loop run and measure what a visitor SEES (needs a visible tab).
 */

export interface CostRow {
  readonly tier: RenderTier;
  readonly phase: ScenePhase;
  /** JavaScript time per frame: world update plus draw-call submission. */
  readonly cpu: Summary;
  /** Wall time per frame with the GPU forced to finish: the true cost of the frame. */
  readonly wall: Summary;
  /** GPU time per frame from timer queries; null when the browser does not expose them. */
  readonly gpu: Summary | null;
  readonly calls: number;
  readonly triangles: number;
  readonly points: number;
  readonly geometries: number;
  readonly textures: number;
}

export interface CostOptions {
  readonly frames?: number;
  readonly tiers?: readonly RenderTier[];
  readonly phases?: readonly ScenePhase[];
  /** Render at this fixed size and DPR 1, so numbers are comparable between devices. */
  readonly reference?: { readonly width: number; readonly height: number };
  /** The size to put back afterwards (the real canvas). */
  readonly restore?: { readonly width: number; readonly height: number; readonly dpr: number };
  readonly endpoint?: EndpointId;
}

const ALL_TIERS: readonly RenderTier[] = ['high', 'medium', 'low'];
const ALL_PHASES: readonly ScenePhase[] = ['boot', 'console', 'journey', 'room'];
const REFERENCE = { width: 1920, height: 1080 };

function requireBench(host: SceneHost): NonNullable<SceneHost['bench']> {
  if (!host.bench) throw new Error('This scene has no benchmark hooks (use the Three.js scene).');
  return host.bench;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function runCost(host: SceneHost, options: CostOptions = {}): Promise<CostRow[]> {
  const bench = requireBench(host);
  const frames = options.frames ?? 120;
  const endpoint = options.endpoint ?? 'about';
  const reference = options.reference ?? REFERENCE;
  const rows: CostRow[] = [];

  host.pause(); // the benchmark drives frames itself
  bench.enableGpuTiming();
  host.resize(reference.width, reference.height, 1);

  for (const tier of options.tiers ?? ALL_TIERS) {
    host.setTier(tier);
    for (const phase of options.phases ?? ALL_PHASES) {
      host.setSnapshot({
        phase,
        endpoint: phase === 'journey' || phase === 'room' ? endpoint : null,
      });
      await bench.renderCost(20); // warm-up: shader compilation, buffer uploads, JIT
      const { cpuMs, wallMs, gpuMs } = await bench.renderCost(frames);
      const info = bench.info();
      rows.push({
        tier,
        phase,
        cpu: summarize(cpuMs),
        wall: summarize(wallMs),
        gpu: gpuMs.length ? summarize(gpuMs) : null,
        calls: info.calls,
        triangles: info.triangles,
        points: info.points,
        geometries: info.geometries,
        textures: info.textures,
      });
    }
  }

  const back = options.restore;
  if (back) host.resize(back.width, back.height, back.dpr);
  host.resume();
  return rows;
}

export interface LongTasks {
  readonly count: number;
  readonly totalMs: number;
  readonly maxMs: number;
}

export interface LiveResult {
  readonly seconds: number;
  readonly fps: number;
  readonly refreshHz: number;
  readonly frameMs: Summary;
  readonly cpuMs: Summary;
  readonly gpuMs: Summary;
  /** Share of frames later than two display refreshes (visible stutter). */
  readonly stutterRatio: number;
  readonly longTasks: LongTasks | null;
  readonly tierAtEnd: string;
}

export interface LiveOptions {
  readonly seconds: number;
  /** Reads the effective quality tier, to show what the governor did. */
  readonly readTier?: () => string;
  /** Block the main thread for `busyMs` every `everyMs`: the stalls a worker could in theory hide. */
  readonly contention?: { readonly busyMs: number; readonly everyMs: number };
}

/** Watches for tasks that block the main thread for 50 ms or more (Chromium only). */
function watchLongTasks(): { stop(): LongTasks | null } {
  if (typeof PerformanceObserver === 'undefined') return { stop: () => null };
  const entries: number[] = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) entries.push(entry.duration);
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch {
    return { stop: () => null }; // unsupported
  }
  return {
    stop: () => {
      observer?.disconnect();
      return {
        count: entries.length,
        totalMs: Math.round(entries.reduce((sum, d) => sum + d, 0)),
        maxMs: Math.round(Math.max(0, ...entries)),
      };
    },
  };
}

export async function runLive(host: SceneHost, options: LiveOptions): Promise<LiveResult> {
  const bench = requireBench(host);
  bench.enableGpuTiming();

  let stalls: ReturnType<typeof setInterval> | null = null;
  if (options.contention) {
    const { busyMs, everyMs } = options.contention;
    stalls = setInterval(() => {
      const end = performance.now() + busyMs;
      while (performance.now() < end) {
        /* hold the main thread */
      }
    }, everyMs);
  }

  const longTasks = watchLongTasks();
  bench.startRecording();
  await sleep(options.seconds * 1000);
  const recording = bench.stopRecording();
  const blocked = longTasks.stop();
  if (stalls) clearInterval(stalls);

  const refreshHz = estimateRefreshHz(recording.deltaMs);
  const twoRefreshes = (2 * 1000) / refreshHz + 1;
  return {
    seconds: options.seconds,
    fps: meanFps(recording.deltaMs),
    refreshHz,
    frameMs: summarize(recording.deltaMs),
    cpuMs: summarize(recording.cpuMs),
    gpuMs: summarize(recording.gpuMs),
    stutterRatio: overBudgetRatio(recording.deltaMs, twoRefreshes),
    longTasks: blocked,
    tierAtEnd: options.readTier?.() ?? 'n/a',
  };
}

export interface StressRow {
  readonly layers: number;
  readonly wall: Summary;
  readonly cpu: Summary;
  readonly gpu: Summary | null;
}

/** How frame cost grows as full-screen overdraw is added: shows whether the scene is GPU-bound. */
export async function runStressCurve(
  host: SceneHost,
  layers: readonly number[] = [0, 4, 8, 16, 32],
  frames = 60,
): Promise<StressRow[]> {
  const bench = requireBench(host);
  host.pause();
  const rows: StressRow[] = [];
  for (const count of layers) {
    bench.setStress(count);
    await bench.renderCost(10);
    const { cpuMs, wallMs, gpuMs } = await bench.renderCost(frames);
    rows.push({
      layers: count,
      wall: summarize(wallMs),
      cpu: summarize(cpuMs),
      gpu: gpuMs.length ? summarize(gpuMs) : null,
    });
  }
  bench.setStress(0);
  host.resume();
  return rows;
}

export interface LifecycleResult {
  readonly cycles: number;
  /** Geometries and textures the renderer reported alive just before each dispose (should be constant). */
  readonly alive: readonly { geometries: number; textures: number }[];
  /** What was still alive right after dispose (must be zero). */
  readonly residual: readonly { geometries: number; textures: number }[];
  /** True when the browser reported the WebGL context as released after every dispose. */
  readonly contextsReleased: boolean;
  readonly heapMb: readonly number[] | null;
  readonly heapGrowth: number | null;
  /** Mount cost, then the first frame drawn in each phase on a fresh scene (after shader pre-compilation). */
  readonly coldFrameMs: Readonly<Record<string, number>>;
  /** The same first frames on a second fresh scene that ran the draw-ahead warm-up first. */
  readonly warmedFrameMs: Readonly<Record<string, number>>;
  /** Time each warm-up draw took (console, tunnel, vault), in ms. */
  readonly warmUpMs: readonly number[];
  readonly leaked: boolean;
}

const heapMb = (): number | null => {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round((memory.usedJSHeapSize / 1048576) * 10) / 10 : null;
};

/** Creates, uses and disposes the scene repeatedly (what route changes do) and checks that nothing accumulates. */
export async function runLifecycle(
  create: () => Promise<SceneHost>,
  cycles = 12,
): Promise<LifecycleResult> {
  const alive: { geometries: number; textures: number }[] = [];
  const residual: { geometries: number; textures: number }[] = [];
  const heap: number[] = [];
  const coldFrameMs: Record<string, number> = {};
  const warmedFrameMs: Record<string, number> = {};
  let warmUpMs: number[] = [];
  let released = true;

  for (let cycle = 0; cycle < cycles; cycle++) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const host = await create();
    const bench = requireBench(host);
    host.setTier('high');
    const mountStart = performance.now();
    host.mount(canvas);
    const mountMs = performance.now() - mountStart;
    host.resize(640, 360, 1);
    host.pause();
    await bench.whenCompiled();
    // Cycle 0 measures first frames as they are; cycle 1 runs the draw-ahead warm-up first (an A/B in one page).
    const record = cycle === 0 ? coldFrameMs : cycle === 1 ? warmedFrameMs : null;
    if (cycle === 1) warmUpMs = (await bench.warmUp()).map((ms) => Math.round(ms * 10) / 10);
    if (record) {
      record['mount (blocking)'] = Math.round(mountMs * 10) / 10;
      record['compile (until ready)'] = Math.round((performance.now() - mountStart) * 10) / 10;
    }

    for (const phase of ['console', 'journey', 'room'] as const) {
      host.setSnapshot({ phase, endpoint: phase === 'console' ? null : 'about' });
      const { wallMs } = await bench.renderCost(1);
      if (record) record[phase] = Math.round((wallMs[0] ?? 0) * 10) / 10;
      await bench.renderCost(5);
    }

    const info = bench.info();
    alive.push({ geometries: info.geometries, textures: info.textures });
    host.dispose();
    const left = bench.residual();
    residual.push({ geometries: left?.geometries ?? -1, textures: left?.textures ?? -1 });
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl || !gl.isContextLost()) released = false;

    await sleep(30); // let the browser breathe, as it would between route changes
    const mb = heapMb();
    if (mb !== null) heap.push(mb);
  }

  const steady = alive.every(
    (a) => a.geometries === alive[0]!.geometries && a.textures === alive[0]!.textures,
  );
  const clean = residual.every((r) => r.geometries === 0 && r.textures === 0);
  return {
    cycles,
    alive,
    residual,
    contextsReleased: released,
    heapMb: heap.length ? heap : null,
    heapGrowth: heap.length ? growth(heap) : null,
    coldFrameMs,
    warmedFrameMs,
    warmUpMs,
    leaked: !steady || !clean || !released,
  };
}
