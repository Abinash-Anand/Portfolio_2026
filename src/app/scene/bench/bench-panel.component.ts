import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MotionService } from '../../motion/motion.service';
import type { SceneHost, ScenePhase } from '../scene-host';
import { SceneRegistry } from '../scene-registry';
import { runCost, runLifecycle, runLive, runStressCurve, sleep } from './runner';

/** What `window.__spike` exposes, so measurements can be scripted and collected as JSON. */
export interface SpikeApi {
  cost(frames?: number, reference?: { width: number; height: number }): Promise<unknown>;
  stress(): Promise<unknown>;
  live(seconds?: number, contention?: { busyMs: number; everyMs: number }): Promise<unknown>;
  governor(seconds?: number, layers?: number): Promise<unknown>;
  lifecycle(cycles?: number): Promise<unknown>;
  /** Renders `seconds` of a phase and holds the last frame (for looking at it). */
  view(phase: ScenePhase, seconds?: number): Promise<void>;
  all(): Promise<unknown>;
  report(): unknown;
}

declare global {
  interface Window {
    __spike?: SpikeApi;
  }
}

/** The environment, so a pasted result says what it was measured on. */
function environment(): Record<string, unknown> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  const info = {
    userAgent: nav.userAgent,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory ?? null,
    dpr: window.devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
    gpu: debug ? String(gl?.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'hidden by the browser',
    webgl2: !!gl,
  };
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return info;
}

/**
 * Developer-only benchmark panel for Spike 0, shown on `/journey?bench`. Loaded lazily (`@defer`), so visitors
 * never download it. Results are JSON you can copy from the phone and paste back.
 */
@Component({
  selector: 'app-bench-panel',
  template: `
    <aside
      class="glass-panel fixed top-14 right-2 z-50 flex max-h-[80vh] w-[min(26rem,calc(100vw-1rem))] flex-col gap-2 overflow-hidden p-3 text-xs"
      aria-label="Benchmark"
    >
      <p class="hud-label">SPIKE 0 · BENCHMARK</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('cost')">
          Cost
        </button>
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('stress')">
          Stress curve
        </button>
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('live')">
          Live 10 s
        </button>
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('governor')">
          Governor
        </button>
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('lifecycle')">
          Lifecycle
        </button>
        <button type="button" class="hud-button" [disabled]="busy()" (click)="run('all')">
          Run all
        </button>
        <button type="button" class="hud-button" (click)="copy()">Copy JSON</button>
      </div>
      <p class="text-muted" aria-live="polite">{{ status() }}</p>
      <pre class="overflow-auto whitespace-pre-wrap" data-bench-output>{{ output() }}</pre>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenchPanel {
  private readonly registry = inject(SceneRegistry);
  private readonly motion = inject(MotionService);

  protected readonly busy = signal(false);
  protected readonly status = signal(
    'Open on the device you want to measure. Keep the tab visible.',
  );
  protected readonly output = signal('');

  private readonly results: Record<string, unknown> = { environment: environment() };

  constructor() {
    window.__spike = {
      cost: (frames, reference) => this.cost(frames, reference),
      stress: () => this.stress(),
      live: (seconds, contention) => this.live(seconds, contention),
      governor: (seconds, layers) => this.governor(seconds, layers),
      lifecycle: (cycles) => this.lifecycle(cycles),
      view: (phase, seconds) => this.view(phase, seconds),
      all: () => this.all(),
      report: () => this.results,
    };
    inject(DestroyRef).onDestroy(() => {
      delete window.__spike;
    });
  }

  protected async run(
    name: 'cost' | 'stress' | 'live' | 'governor' | 'lifecycle' | 'all',
  ): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.status.set(`Running ${name}…`);
    try {
      await this[name]();
      this.status.set(`Done: ${name}.`);
    } catch (error) {
      this.status.set(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.busy.set(false);
      this.output.set(JSON.stringify(this.results, null, 1));
    }
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.results, null, 1));
      this.status.set('Copied.');
    } catch {
      this.status.set('Copy blocked: select the text below instead.');
    }
  }

  private host(): SceneHost {
    const host = this.registry.host;
    if (!host?.bench) {
      throw new Error('No Three.js scene is running here (WebGL unavailable, or ?engine=2d).');
    }
    return host;
  }

  private size() {
    const canvas = document.querySelector('app-scene-canvas canvas');
    return {
      width: canvas?.clientWidth ?? window.innerWidth,
      height: canvas?.clientHeight ?? window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    };
  }

  async cost(
    frames = 120,
    reference: { width: number; height: number } = { width: 1920, height: 1080 },
  ): Promise<unknown> {
    const host = this.host();
    const back = this.size();
    // Lock the tier so the governor cannot change it under the measurement.
    this.motion.setChoice('high');
    await sleep(50);
    const rows = await runCost(host, { frames, restore: back, reference });
    this.motion.setChoice('auto');
    const key = reference.width === 1920 ? 'cost' : `cost@${reference.width}x${reference.height}`;
    return (this.results[key] = {
      reference: `${reference.width}x${reference.height} @ DPR 1`,
      frames,
      rows,
    });
  }

  async stress(): Promise<unknown> {
    const host = this.host();
    this.motion.setChoice('high');
    await sleep(50);
    host.resize(1920, 1080, 1);
    host.setSnapshot({ phase: 'room', endpoint: 'about' });
    const rows = await runStressCurve(host);
    const back = this.size();
    host.resize(back.width, back.height, back.dpr);
    this.motion.setChoice('auto');
    return (this.results['stress'] = { reference: '1920x1080 @ DPR 1, room, high', rows });
  }

  async live(seconds = 10, contention?: { busyMs: number; everyMs: number }): Promise<unknown> {
    const host = this.host();
    host.setSnapshot({ phase: 'room', endpoint: 'about' });
    const label = contention ? 'liveContended' : 'live';
    const result = await runLive(host, {
      seconds,
      contention,
      readTier: () => this.motion.tier(),
    });
    return (this.results[label] = { ...result, size: this.size() });
  }

  /** Overloads the GPU on purpose and watches the adaptive-quality governor step the tier down. */
  async governor(seconds = 20, layers = 24): Promise<unknown> {
    const host = this.host();
    this.motion.setChoice('auto');
    host.setSnapshot({ phase: 'room', endpoint: 'about' });
    host.bench!.setStress(layers);
    const tiers: { atSecond: number; tier: string }[] = [{ atSecond: 0, tier: this.motion.tier() }];
    const started = performance.now();
    const watcher = setInterval(() => {
      const tier = this.motion.tier();
      if (tier !== tiers[tiers.length - 1]!.tier) {
        tiers.push({ atSecond: Math.round((performance.now() - started) / 100) / 10, tier });
      }
    }, 100);
    const live = await runLive(host, { seconds, readTier: () => this.motion.tier() });
    clearInterval(watcher);
    host.bench!.setStress(0);
    return (this.results['governor'] = { seconds, stressLayers: layers, tierSteps: tiers, live });
  }

  async lifecycle(cycles = 12): Promise<unknown> {
    const result = await runLifecycle(
      () => import('../three/three-scene.host').then((m) => new m.ThreeSceneHost()),
      cycles,
    );
    return (this.results['lifecycle'] = result);
  }

  async view(phase: ScenePhase, seconds = 2): Promise<void> {
    const host = this.host();
    host.pause();
    host.setSnapshot({ phase, endpoint: phase === 'journey' || phase === 'room' ? 'about' : null });
    await host.bench!.renderCost(Math.round(seconds * 60));
  }

  async all(): Promise<unknown> {
    await this.cost();
    await this.stress();
    await this.live(10);
    await this.live(10, { busyMs: 40, everyMs: 250 });
    await this.governor();
    await this.lifecycle();
    return this.results;
  }
}
