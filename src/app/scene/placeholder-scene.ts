import { COLORS, type ColorToken } from '../core/design/tokens';
import { TIER_PROFILES, type TierProfile } from '../motion/tier';
import { FrameLoop, type FrameInfo, type FrameScheduler } from './frame-loop';
import type { RenderTier, SceneHost, SceneSnapshot, SceneStats } from './scene-host';

/**
 * PLACEHOLDER world: a 2D canvas network of drifting nodes that reacts to the journey state, so the state
 * machine, tiers, frame loop and HUD can be exercised before the real Three.js scene exists (Spike 0).
 * It implements the same SceneHost contract the 3D scene will, and is meant to be thrown away.
 */

interface Node {
  x: number; // 0..1
  y: number; // 0..1
  depth: number; // 0.2..1, parallax and size
  seed: number;
}

interface Look {
  /** Base node color token. */
  readonly color: ColorToken;
  /** Share of nodes drawn in the accent color. */
  readonly accent: ColorToken;
  /** Horizontal drift, in screens per second. */
  readonly speed: number;
  /** 0 = dots, 1 = long light streaks (travelling). */
  readonly streak: number;
}

const LOOKS: Readonly<Record<SceneSnapshot['phase'], Look>> = {
  boot: { color: 'blue', accent: 'emerald', speed: 0.01, streak: 0 },
  console: { color: 'blue', accent: 'emerald', speed: 0.02, streak: 0 },
  journey: { color: 'cyan', accent: 'gold', speed: 1.1, streak: 1 },
  room: { color: 'indigo', accent: 'violet', speed: 0.012, streak: 0 },
};

function rgb(token: ColorToken): [number, number, number] {
  const n = parseInt(COLORS[token].slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface PlaceholderOptions {
  scheduler?: FrameScheduler;
  random?: () => number;
}

export class PlaceholderSceneHost implements SceneHost {
  readonly engine = 'CANVAS-2D (PLACEHOLDER)';
  onFrameTime: ((ms: number) => void) | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly loop: FrameLoop;
  private readonly random: () => number;
  private nodes: Node[] = [];
  private profile: TierProfile = TIER_PROFILES.medium;
  private look: Look = LOOKS.boot;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private paused = false;
  private disposed = false;

  // Smoothed visual state (eased toward the current look every frame).
  private streak = 0;
  private speed = 0.01;
  private color = rgb('blue');
  private accent = rgb('emerald');

  // Stats (pulled, never pushed).
  private statFrames = 0;
  private statSince = 0;
  private fps = 0;
  private frameMs = 0;
  private drawCalls = 0;

  constructor(options: PlaceholderOptions = {}) {
    this.random = options.random ?? Math.random;
    this.loop = new FrameLoop((frame) => this.frame(frame), this.profile.maxFps, options.scheduler);
  }

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.populate();
    if (!this.paused) this.loop.start();
  }

  setSnapshot(snapshot: SceneSnapshot): void {
    this.look = LOOKS[snapshot.phase];
  }

  setTier(tier: RenderTier): void {
    this.profile = TIER_PROFILES[tier];
    this.loop.setMaxFps(this.profile.maxFps);
    this.populate();
    this.applySize();
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = devicePixelRatio;
    this.applySize();
  }

  pause(): void {
    this.paused = true;
    this.loop.stop();
  }

  resume(): void {
    this.paused = false;
    // Start a fresh stats window: the time spent paused must not count as frame time.
    this.statSince = 0;
    this.statFrames = 0;
    if (this.canvas && !this.disposed) this.loop.start();
  }

  stats(): SceneStats {
    return {
      engine: this.engine,
      fps: this.fps,
      frameMs: this.frameMs,
      drawCalls: this.drawCalls,
      triangles: 0,
    };
  }

  /** The eased visual state, exposed for tests. */
  get visual(): { streak: number; speed: number } {
    return { streak: this.streak, speed: this.speed };
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  dispose(): void {
    this.disposed = true;
    this.loop.stop();
    this.nodes = [];
    this.ctx = null;
    this.canvas = null;
    this.onFrameTime = null;
  }

  private populate(): void {
    const target = this.profile.particles;
    while (this.nodes.length < target) {
      this.nodes.push({
        x: this.random(),
        y: this.random(),
        depth: 0.2 + this.random() * 0.8,
        seed: this.random(),
      });
    }
    this.nodes.length = target;
  }

  private applySize(): void {
    if (!this.canvas) return;
    const ratio = Math.min(this.dpr, this.profile.maxDpr);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
  }

  private frame({ deltaMs, expectedMs, now }: FrameInfo): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const dt = Math.min(deltaMs, 100) / 1000;

    // Stats and the governor feed (frame time normalised to a 60 fps frame).
    this.statFrames++;
    if (this.statSince === 0) this.statSince = now;
    if (now - this.statSince >= 500) {
      this.fps = Math.round((this.statFrames * 1000) / (now - this.statSince));
      this.frameMs = Math.round((10 * (now - this.statSince)) / this.statFrames) / 10;
      this.statFrames = 0;
      this.statSince = now;
    }
    this.onFrameTime?.((deltaMs / expectedMs) * (1000 / 60));

    // Ease the look toward the current phase.
    const k = 1 - Math.exp(-dt * 2.5);
    this.streak = lerp(this.streak, this.look.streak, k);
    this.speed = lerp(this.speed, this.look.speed, k);
    const goal = rgb(this.look.color);
    const goalAccent = rgb(this.look.accent);
    for (let i = 0; i < 3; i++) {
      this.color[i] = lerp(this.color[i] ?? 0, goal[i] ?? 0, k);
      this.accent[i] = lerp(this.accent[i] ?? 0, goalAccent[i] ?? 0, k);
    }

    this.draw(ctx, dt, now);
  }

  private draw(ctx: CanvasRenderingContext2D, dt: number, now: number): void {
    const scale = Math.min(this.dpr, this.profile.maxDpr);
    const w = this.canvas?.width ?? 1;
    const h = this.canvas?.height ?? 1;
    let calls = 0;

    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, w, h);
    calls++;

    const [cr, cg, cb] = this.color.map(Math.round) as [number, number, number];
    const [ar, ag, ab] = this.accent.map(Math.round) as [number, number, number];

    for (const node of this.nodes) {
      node.x += this.speed * node.depth * dt;
      if (node.x > 1.05) node.x -= 1.1;
      node.y += Math.sin(now / 1600 + node.seed * 40) * 0.00006;

      const px = node.x * w;
      const py = (((node.y % 1) + 1) % 1) * h;
      const useAccent = node.seed > 0.88;
      const [r, g, b] = useAccent ? [ar, ag, ab] : [cr, cg, cb];
      const alpha = 0.25 + node.depth * 0.6;

      if (this.streak > 0.05) {
        const length = this.streak * node.depth * w * 0.16;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = Math.max(1, node.depth * 1.6 * scale);
        ctx.beginPath();
        ctx.moveTo(px - length, py);
        ctx.lineTo(px, py);
        ctx.stroke();
        calls++;
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        const size = (1 + node.depth * 2) * scale;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
        calls++;
      }
    }

    if (this.profile.links && this.streak < 0.4)
      calls += this.drawLinks(ctx, w, h, scale, [cr, cg, cb]);
    this.drawCalls = calls;
  }

  private drawLinks(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    rgbColor: number[],
  ): number {
    const [r, g, b] = rgbColor;
    const reach = (Math.min(w, h) * 0.12) ** 2;
    let calls = 0;
    ctx.lineWidth = scale;
    // Only compare each node with the next few, keeping this O(n) rather than O(n^2).
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < Math.min(i + 4, this.nodes.length); j++) {
        const c = this.nodes[j];
        if (!a || !c) continue;
        const dx = (a.x - c.x) * w;
        const dy = (a.y - c.y) * h;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 * (1 - d2 / reach)})`;
          ctx.beginPath();
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(c.x * w, c.y * h);
          ctx.stroke();
          calls++;
        }
      }
    }
    return calls;
  }
}
