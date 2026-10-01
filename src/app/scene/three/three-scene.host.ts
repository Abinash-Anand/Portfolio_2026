import {
  FogExp2,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  AdditiveBlending,
  WebGLRenderer,
} from 'three';
import { COLORS, type ColorToken } from '../../core/design/tokens';
import { ENDPOINT_IDS, type EndpointId } from '../../core/experience';
import { FrameLoop, type FrameInfo, type FrameScheduler } from '../frame-loop';
import type {
  BenchApi,
  FrameRecording,
  RenderInfo,
  RenderTier,
  SceneHost,
  SceneHover,
  SceneSnapshot,
  SceneStats,
  ScenePhase,
} from '../scene-host';
import { CameraRig, targetPose, type Pointer } from './camera-rig';
import { GpuTimer, type TimerContext } from './gpu-timer';
import { THREE_PROFILES, type ThreeProfile } from './profiles';
import { ConsoleRoom } from './world/console-room';
import { Headset } from './world/headset';
import type { WorldPart } from './world/part';
import { Tunnel } from './world/tunnel';
import { Vault } from './world/vault';

/** The vault is recolored per endpoint until Phase 3 builds a dedicated room for each. */
const ROOM_TINTS: Readonly<Record<EndpointId, readonly [ColorToken, ColorToken]>> = {
  about: ['indigo', 'violet'],
  education: ['blue', 'cyan'],
  skills: ['emerald', 'cyan'],
  projects: ['gold', 'yellow'],
  experience: ['blue', 'violet'],
};

/** Seconds the console stays visible after a journey starts, so the cut is not abrupt. */
const CONSOLE_LINGER = 0.6;
/** Seconds the gold "response" stream keeps flying after arriving in a room. */
const RETURN_FLIGHT = 0.8;
const MAX_STRESS_LAYERS = 160;

interface CostSample {
  cpuMs: number[];
  wallMs: number[];
  gpuMs: number[];
}

function defaultRenderer(canvas: HTMLCanvasElement, profile: ThreeProfile): RendererPort {
  return new WebGLRenderer({
    canvas,
    antialias: profile.antialias,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
}

/** Yields to the event loop with a message, which (unlike setTimeout) is not clamped in background tabs. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(0);
  });
}

/** A part drawn once, out of sight, and the camera phase that will later see it (see `warmNext`). */
interface WarmStep {
  readonly part: WorldPart;
  readonly phase: ScenePhase;
}

/** The slice of the WebGL renderer the host uses, so tests can substitute a fake (jsdom has no WebGL). */
export type RendererPort = Pick<
  WebGLRenderer,
  | 'domElement'
  | 'info'
  | 'setClearColor'
  | 'setPixelRatio'
  | 'setSize'
  | 'setScissor'
  | 'setScissorTest'
  | 'render'
  | 'compileAsync'
  | 'getContext'
  | 'dispose'
  | 'forceContextLoss'
>;

export interface ThreeHostOptions {
  scheduler?: FrameScheduler;
  random?: () => number;
  /** Replaces the real renderer. Defaults to a WebGL renderer drawing into the mounted canvas. */
  createRenderer?: (canvas: HTMLCanvasElement, profile: ThreeProfile) => RendererPort;
}

/**
 * The Three.js world behind the SceneHost contract (ARCHITECTURE.md S2 to S12). One persistent canvas and scene
 * graph, one frame loop, unlit emissive materials with fog and additive glow (no lights, no shadows, no
 * post-processing), instancing for every repeated shape, and no allocations per frame. Framework-agnostic: this
 * file has no Angular imports.
 */
export class ThreeSceneHost implements SceneHost {
  readonly engine = 'THREE.JS';
  onFrameTime: ((ms: number) => void) | null = null;
  onContextLost: (() => void) | null = null;

  readonly bench: BenchApi = {
    renderCost: (frames) => this.renderCost(frames),
    info: () => this.renderInfo(),
    startRecording: () => {
      this.recording = { delta: [], cpu: [], gpu: [] };
    },
    stopRecording: () => this.stopRecording(),
    setStress: (layers) => this.setStress(layers),
    enableGpuTiming: () => this.enableGpuTiming(),
    residual: () => this.residualInfo,
    whenCompiled: () => this.compiled,
    warmUp: () => this.warmUp(),
  };

  private renderer: RendererPort | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 220);
  private readonly rig = new CameraRig();
  private readonly loop: FrameLoop;
  private readonly random: () => number;
  private readonly createRenderer: NonNullable<ThreeHostOptions['createRenderer']>;

  private headset: Headset | null = null;
  private consoleRoom: ConsoleRoom | null = null;
  private tunnel: Tunnel | null = null;
  private vault: Vault | null = null;
  private stress: InstancedMesh | null = null;
  private parts: WorldPart[] = [];

  private profile: ThreeProfile = THREE_PROFILES.medium;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private phase: ScenePhase = 'boot';
  private endpoint: EndpointId | null = null;
  private clock = 0;
  private phaseStart = 0;
  private returnUntil = 0;
  private lastFov = 0;
  private readonly pointer: Pointer = { x: 0, y: 0 };
  private readonly pointerTarget: Pointer = { x: 0, y: 0 };
  private paused = false;
  private disposed = false;

  // Stats (pulled, never pushed).
  private statFrames = 0;
  private statSince = 0;
  private fps = 0;
  private frameMs = 0;
  private cpuAvg = 0;
  private gpuAvg: number | null = null;
  private gpu: GpuTimer | null = null;
  private recording: { delta: number[]; cpu: number[]; gpu: number[] } | null = null;
  private residualInfo: RenderInfo | null = null;
  private compiled: Promise<void> = Promise.resolve();
  private warmQueue: WarmStep[] = [];
  private readonly warmCamera = new PerspectiveCamera(60, 1, 0.1, 220);

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pointerTarget.x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    this.pointerTarget.y = 1 - (event.clientY / Math.max(1, window.innerHeight)) * 2;
  };

  private readonly onContextLostEvent = (event: Event): void => {
    event.preventDefault(); // allows the context to be restored; we fall back to 2D instead
    this.pause();
    this.onContextLost?.();
  };

  constructor(options: ThreeHostOptions = {}) {
    this.random = options.random ?? Math.random;
    this.createRenderer = options.createRenderer ?? defaultRenderer;
    this.loop = new FrameLoop((frame) => this.frame(frame), this.profile.maxFps, options.scheduler);
  }

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    // Throws when WebGL is unavailable; SceneCanvas turns that into the 2D fallback.
    this.renderer = this.createRenderer(canvas, this.profile);
    this.renderer.setClearColor(COLORS.void);
    this.scene.fog = new FogExp2(COLORS.void, 0.011);

    this.headset = new Headset();
    this.consoleRoom = new ConsoleRoom();
    this.tunnel = new Tunnel(this.random);
    this.vault = new Vault();
    this.parts = [this.headset, this.consoleRoom, this.tunnel, this.vault];
    for (const part of this.parts) this.scene.add(part.object);

    canvas.addEventListener('webglcontextlost', this.onContextLostEvent);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.applyProfile();
    this.applySize();
    this.compiled = this.precompile().then(() => this.queueWarmUp());
    // The snapshot may have arrived before the world existed: replay it, without the boot-to-console flight.
    if (this.phase !== 'boot') {
      this.headset.dismiss();
      this.onPhaseChange(this.phase, this.phase, this.endpoint);
      if (this.phase === 'room') {
        // Arriving directly in a room (for example back from the 2D page): no response flight.
        this.tunnel.setFlying(false);
        this.returnUntil = 0;
      }
    }
    this.applyPhaseVisibility(0);
    if (!this.paused) this.loop.start();
  }

  setSnapshot(snapshot: SceneSnapshot): void {
    const previous = this.phase;
    const phase = snapshot.phase;
    this.endpoint = snapshot.endpoint;
    if (phase !== previous) {
      this.phase = phase;
      this.phaseStart = this.clock;
      this.onPhaseChange(previous, phase, snapshot.endpoint);
    } else if (phase === 'room' && snapshot.endpoint) {
      this.tint(snapshot.endpoint);
    }
  }

  setTier(tier: RenderTier): void {
    this.profile = THREE_PROFILES[tier];
    this.loop.setMaxFps(this.profile.maxFps);
    if (this.renderer) {
      this.applyProfile();
      this.applySize();
    }
  }

  setHover(target: SceneHover): void {
    this.headset?.setHover(target === 'headset');
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = devicePixelRatio;
    if (this.renderer) this.applySize();
  }

  pause(): void {
    this.paused = true;
    this.loop.stop();
  }

  resume(): void {
    this.paused = false;
    // A fresh stats window: time spent paused must not count as frame time.
    this.statSince = 0;
    this.statFrames = 0;
    if (this.renderer && !this.disposed) this.loop.start();
  }

  stats(): SceneStats {
    const info = this.renderer?.info;
    return {
      engine: this.engine,
      fps: this.fps,
      frameMs: this.frameMs,
      drawCalls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      cpuMs: Math.round(this.cpuAvg * 100) / 100,
      gpuMs: this.gpuAvg === null ? null : Math.round(this.gpuAvg * 100) / 100,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLostEvent);
    window.removeEventListener('pointermove', this.onPointerMove);
    for (const part of this.parts) part.dispose();
    this.stress?.geometry.dispose();
    (this.stress?.material as ShaderMaterial | undefined)?.dispose();
    this.stress?.dispose();
    this.parts = [];
    this.warmQueue = [];
    this.scene.clear();
    this.residualInfo = this.renderInfo(); // the renderer's own count of what is still alive
    this.gpu?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss(); // free the GPU context now, not whenever the garbage collector runs
    this.renderer = null;
    this.canvas = null;
    this.headset = this.consoleRoom = this.tunnel = this.vault = this.stress = null;
    this.onFrameTime = null;
    this.onContextLost = null;
  }

  /**
   * Starts compiling every shader program now, in parallel and off the main thread where the browser allows,
   * instead of on the first frame that needs each one (a 10 to 30 ms hitch exactly when a phase changes).
   * Three.js collects the objects to compile synchronously, so visibility is restored before returning.
   */
  private precompile(): Promise<void> {
    const renderer = this.renderer;
    if (!renderer) return Promise.resolve();
    const visibility = this.parts.map((part) => part.object.visible);
    for (const part of this.parts) part.object.visible = true;
    const done = renderer.compileAsync(this.scene, this.camera).then(
      () => undefined,
      () => undefined, // a failed warm-up only costs the old first-frame hitch
    );
    this.parts.forEach((part, i) => (part.object.visible = visibility[i]!));
    return done;
  }

  private queueWarmUp(): void {
    if (this.disposed || !this.consoleRoom || !this.tunnel || !this.vault) return;
    this.warmQueue = [
      { part: this.consoleRoom, phase: 'console' },
      { part: this.tunnel, phase: 'journey' },
      { part: this.vault, phase: 'room' },
    ];
  }

  /**
   * Draws the next queued part once, into a single pixel, from the camera that will later see it. On its first
   * draw the GPU does per-context work that shader pre-compilation cannot (Spike 0 measured 40 to 110 ms per
   * phase), so it is paid here, one part per frame while the boot screen is up, instead of at a phase change.
   * Returns how long it took when `sync` makes the GPU finish, otherwise null.
   */
  private warmNext(sync = false): number | null {
    const renderer = this.renderer;
    const step = this.warmQueue.shift();
    if (!renderer || !step) return null;

    const started = performance.now();
    const pose = targetPose(step.phase, 0, { x: 0, y: 0 }, this.camera.aspect);
    const camera = this.warmCamera;
    camera.aspect = this.camera.aspect;
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.position.set(pose.px, pose.py, pose.pz);
    camera.lookAt(pose.tx, pose.ty, pose.tz);

    const visible = step.part.object.visible;
    step.part.object.visible = true;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 1, 1);
    renderer.render(this.scene, camera);
    renderer.setScissorTest(false);
    step.part.object.visible = visible;

    if (!sync) return null;
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return performance.now() - started;
  }

  /** Benchmark: runs the whole warm-up now and reports the time each part took (ms). */
  private async warmUp(): Promise<number[]> {
    await this.compiled;
    const times: number[] = [];
    for (let ms = this.warmNext(true); ms !== null; ms = this.warmNext(true)) times.push(ms);
    return times;
  }

  // --- phases -------------------------------------------------------------------------------------------

  private onPhaseChange(from: ScenePhase, to: ScenePhase, endpoint: EndpointId | null): void {
    switch (to) {
      case 'boot':
        this.headset?.reset();
        this.consoleRoom?.press(-1);
        this.tunnel?.setFlying(false);
        break;
      case 'console':
        if (from === 'boot') this.headset?.fly();
        this.consoleRoom?.press(-1);
        this.tunnel?.setFlying(false);
        break;
      case 'journey':
        // The pressed key stays down while the packet leaves.
        if (endpoint) this.consoleRoom?.press(ENDPOINT_IDS.indexOf(endpoint));
        this.tunnel?.setReturning(false);
        this.tunnel?.setFlying(true);
        this.returnUntil = 0;
        break;
      case 'room':
        this.consoleRoom?.press(-1);
        if (endpoint) this.tint(endpoint);
        // The gold response stream carries the visitor back for a moment.
        this.tunnel?.setReturning(true);
        this.tunnel?.setFlying(true);
        this.returnUntil = this.clock + RETURN_FLIGHT;
        break;
    }
  }

  private tint(endpoint: EndpointId): void {
    const [a, b] = ROOM_TINTS[endpoint];
    this.vault?.setTint(a, b);
  }

  /** Which parts are visible, given the current phase and how long it has been going. */
  private applyPhaseVisibility(phaseTime: number): void {
    if (!this.headset || !this.consoleRoom || !this.vault) return;
    const phase = this.phase;
    this.consoleRoom.object.visible =
      phase === 'console' || (phase === 'journey' && phaseTime < CONSOLE_LINGER);
    this.vault.object.visible = phase === 'room';
    if (phase === 'journey' || phase === 'room') this.headset.object.visible = false;
    if (this.returnUntil > 0 && this.clock >= this.returnUntil) {
      this.tunnel?.setFlying(false);
      this.returnUntil = 0;
    }
  }

  // --- tiers, size ----------------------------------------------------------------------------------------

  private applyProfile(): void {
    this.tunnel?.setPointCount(this.profile.tunnelPoints);
    this.tunnel?.setRingCount(this.profile.rings);
    this.vault?.setRackCount(this.profile.racksPerSide);
  }

  private applySize(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(this.dpr, this.profile.maxDpr));
    renderer.setSize(this.width, this.height, false); // CSS owns the displayed size
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.tunnel?.setPixelScale(renderer.domElement.height / 900);
  }

  // --- the frame ------------------------------------------------------------------------------------------

  private frame({ deltaMs, expectedMs, now }: FrameInfo): void {
    if (!this.renderer) return;
    const dt = Math.min(deltaMs, 100) / 1000;

    const t0 = performance.now();
    this.step(dt);
    this.render();
    const cpu = performance.now() - t0;
    this.warmNext(); // one queued part per frame during the first frames, then nothing

    this.recordFrame(deltaMs, cpu, now);
    this.onFrameTime?.((deltaMs / expectedMs) * (1000 / 60));
  }

  /** Advances the world by `dt` seconds (no drawing). */
  private step(dt: number): void {
    this.clock += dt;
    const phaseTime = this.clock - this.phaseStart;

    // Smooth the pointer so the camera drifts rather than jitters.
    const k = 1 - Math.exp(-6 * dt);
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * k;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * k;

    const pose = this.rig.update(dt, this.phase, phaseTime, this.pointer, this.camera.aspect);
    this.camera.position.set(pose.px, pose.py, pose.pz);
    this.camera.lookAt(pose.tx, pose.ty, pose.tz);
    if (Math.abs(pose.fov - this.lastFov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
      this.lastFov = pose.fov;
    }

    this.applyPhaseVisibility(phaseTime);
    for (const part of this.parts) part.update(dt, this.clock);
  }

  private render(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    this.gpu?.begin();
    renderer.render(this.scene, this.camera);
    this.gpu?.end();
  }

  private recordFrame(deltaMs: number, cpuMs: number, now: number): void {
    this.cpuAvg = this.cpuAvg === 0 ? cpuMs : this.cpuAvg * 0.95 + cpuMs * 0.05;
    const gpuDone = this.gpu?.poll() ?? [];
    for (const ms of gpuDone) {
      this.gpuAvg = this.gpuAvg === null ? ms : this.gpuAvg * 0.95 + ms * 0.05;
      this.recording?.gpu.push(ms);
    }
    if (this.recording) {
      this.recording.delta.push(deltaMs);
      this.recording.cpu.push(cpuMs);
    }

    this.statFrames++;
    if (this.statSince === 0) this.statSince = now;
    if (now - this.statSince >= 500) {
      this.fps = Math.round((this.statFrames * 1000) / (now - this.statSince));
      this.frameMs = Math.round((10 * (now - this.statSince)) / this.statFrames) / 10;
      this.statFrames = 0;
      this.statSince = now;
    }
  }

  // --- benchmark hooks -------------------------------------------------------------------------------------

  private async renderCost(frames: number): Promise<CostSample> {
    const gl = this.renderer?.getContext();
    const sample: CostSample = { cpuMs: [], wallMs: [], gpuMs: [] };
    if (!gl) return sample;
    const pixel = new Uint8Array(4);
    const collect = (): void => {
      for (const ms of this.gpu?.poll() ?? []) {
        sample.gpuMs.push(ms);
        this.gpuAvg = this.gpuAvg === null ? ms : this.gpuAvg * 0.9 + ms * 0.1;
      }
    };
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      this.step(1 / 60);
      this.render();
      const t1 = performance.now();
      // Reading one pixel back cannot return until the GPU has drawn the frame (unlike gl.finish(), which
      // browsers treat as a mere flush), so the wall time is the true cost: CPU submission plus GPU work.
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const t2 = performance.now();
      sample.cpuMs.push(t1 - t0);
      sample.wallMs.push(t2 - t0);
      // Timer-query results arrive through the event loop; yield without the timer clamping of hidden tabs.
      await yieldToEventLoop();
      collect();
    }
    for (let i = 0; i < 4; i++) {
      await yieldToEventLoop();
      collect();
    }
    return sample;
  }

  private renderInfo(): RenderInfo {
    const info = this.renderer?.info;
    return {
      calls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      points: info?.render.points ?? 0,
      lines: info?.render.lines ?? 0,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      programs: info?.programs?.length ?? 0,
    };
  }

  private stopRecording(): FrameRecording {
    const recording = this.recording ?? { delta: [], cpu: [], gpu: [] };
    this.recording = null;
    return { deltaMs: recording.delta, cpuMs: recording.cpu, gpuMs: recording.gpu };
  }

  private enableGpuTiming(): boolean {
    const gl = this.renderer?.getContext();
    if (!gl || this.gpu) return !!this.gpu;
    this.gpu = GpuTimer.create(gl as unknown as TimerContext);
    return !!this.gpu;
  }

  /** Full-screen additive layers: a tunable amount of pixel work, to push GPU time over budget. */
  private setStress(layers: number): void {
    if (!this.stress) {
      const material = new ShaderMaterial({
        vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'void main() { gl_FragColor = vec4(0.004, 0.006, 0.01, 1.0); }',
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      this.stress = new InstancedMesh(new PlaneGeometry(2, 2), material, MAX_STRESS_LAYERS);
      const identity = new Matrix4();
      for (let i = 0; i < MAX_STRESS_LAYERS; i++) this.stress.setMatrixAt(i, identity);
      this.stress.frustumCulled = false;
      this.stress.renderOrder = 1000;
      this.scene.add(this.stress);
    }
    this.stress.count = Math.min(layers, MAX_STRESS_LAYERS);
    this.stress.visible = layers > 0;
  }
}
