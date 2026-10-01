import {
  AdditiveBlending,
  FogExp2,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { COLORS } from '../../core/design/tokens';
import { ENDPOINT_IDS, type EndpointId } from '../../core/experience';
import { FrameLoop, type FrameInfo, type FrameScheduler } from '../frame-loop';
import { PRIORITY, ReadinessScheduler, type TaskSteps } from '../readiness-scheduler';
import {
  EMPTY_CONTENT,
  type BenchApi,
  type FrameRecording,
  type RenderInfo,
  type RenderTier,
  type SceneContent,
  type SceneHost,
  type SceneHover,
  type ScenePhase,
  type SceneSnapshot,
  type SceneStats,
} from '../scene-host';
import { CameraRig, targetPose, type Pointer, type Pose } from './camera-rig';
import { GpuTimer, type TimerContext } from './gpu-timer';
import { THREE_PROFILES, type ThreeProfile } from './profiles';
import { ROOM_LOADERS, type Room, type RoomContext, type RoomLoader } from './room';
import { RoomManager } from './room-manager';
import { ConsoleRoom } from './world/console-room';
import { Headset } from './world/headset';
import type { WorldPart } from './world/part';
import { Tunnel } from './world/tunnel';

/** Seconds the console stays visible after a journey starts, so the cut is not abrupt. */
const CONSOLE_LINGER = 0.6;
/** Seconds the gold "response" stream keeps flying after arriving in a room. */
const RETURN_FLIGHT = 0.8;
/** Milliseconds of preparation work allowed per frame (ARCHITECTURE.md S7). */
const READINESS_BUDGET_MS = 4;
/** A room asked for at the start of a journey must be built by this long after, whatever the frame load. */
const JOURNEY_DEADLINE_MS = 2500;
const MAX_STRESS_LAYERS = 160;
const LABEL_FONT = '600 32px "JetBrains Mono Variable"';

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

/** Resolves when the HUD font is loaded, so label text is drawn in it. Never waits long: text may fall back. */
function loadLabelFont(): Promise<unknown> {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (!fonts?.load) return Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  return Promise.race([fonts.load(LABEL_FONT).catch(() => undefined), timeout]);
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
  /** Replaces how rooms are loaded (tests use fakes). Defaults to the lazy chunk per room. */
  loaders?: Readonly<Record<EndpointId, RoomLoader>>;
  /** Replaces the drawing surface for label text (tests have no canvas). */
  createCanvas?: RoomContext['createCanvas'];
}

/**
 * The Three.js world behind the SceneHost contract (ARCHITECTURE.md S2 to S12). One persistent canvas and scene
 * graph, one frame loop, unlit emissive materials with fog and additive glow (no lights, no shadows, no
 * post-processing), instancing for every repeated shape, and no allocations per frame. Framework-agnostic: this
 * file has no Angular imports.
 *
 * Shared pieces (headset, console, tunnel) live here; each destination is a Room, loaded as its own chunk when
 * the visitor shows intent (or starts the journey), built through the ReadinessScheduler so building never costs
 * a frame, and released when the visitor has moved on, so at most two rooms exist at once.
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
    prepareRoom: (endpoint) => this.prepareRoomNow(endpoint),
    roomBuildMs: () => Object.fromEntries(this.rooms?.buildMs ?? []),
  };

  private renderer: RendererPort | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 220);
  private readonly rig = new CameraRig();
  private readonly loop: FrameLoop;
  private readonly readiness = new ReadinessScheduler();
  private readonly options: ThreeHostOptions;
  private readonly random: () => number;
  private readonly createRenderer: NonNullable<ThreeHostOptions['createRenderer']>;

  private headset: Headset | null = null;
  private consoleRoom: ConsoleRoom | null = null;
  private tunnel: Tunnel | null = null;
  private rooms: RoomManager | null = null;
  private stress: InstancedMesh | null = null;
  private parts: WorldPart[] = [];

  private content: SceneContent = EMPTY_CONTENT;
  private profile: ThreeProfile = THREE_PROFILES.medium;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private pixelScale = 1;
  private phase: ScenePhase = 'boot';
  private endpoint: EndpointId | null = null;
  private focus: string | null = null;
  private clock = 0;
  private phaseStart = 0;
  private roomStart = 0;
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
  private readonly warmCamera = new PerspectiveCamera(60, 1, 0.1, 220);
  private readonly origin: Pointer = { x: 0, y: 0 };

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
    this.options = options;
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
    this.parts = [this.headset, this.consoleRoom, this.tunnel];
    for (const part of this.parts) this.scene.add(part.object);

    const fonts = loadLabelFont();
    this.rooms = new RoomManager({
      parent: this.scene,
      loaders: this.options.loaders ?? ROOM_LOADERS,
      scheduler: this.readiness,
      context: () => ({
        content: this.content,
        profile: this.profile,
        random: this.random,
        createCanvas: this.options.createCanvas,
      }),
      ready: () => fonts,
      onBuilt: (room) => this.onRoomBuilt(room),
    });

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
    const previousPhase = this.phase;
    const previousEndpoint = this.endpoint;
    this.endpoint = snapshot.endpoint;
    if (snapshot.phase !== previousPhase) {
      this.phase = snapshot.phase;
      this.phaseStart = this.clock;
      this.onPhaseChange(previousPhase, snapshot.phase, snapshot.endpoint);
    } else if (
      snapshot.phase === 'room' &&
      snapshot.endpoint &&
      snapshot.endpoint !== previousEndpoint
    ) {
      this.enterRoom(snapshot.endpoint);
    }
  }

  setContent(content: SceneContent): void {
    if (content === this.content) return;
    this.content = content;
    if (!this.rooms) return;
    // Rooms were built from the old content: drop them, and rebuild what the visitor needs right now.
    this.rooms.invalidate();
    if (this.phase === 'room' && this.endpoint) this.enterRoom(this.endpoint);
    else if (this.phase === 'console') this.prepareRoom('about', PRIORITY.prefetch);
  }

  setIntent(endpoint: EndpointId | null): void {
    if (endpoint) this.prepareRoom(endpoint, PRIORITY.intent);
  }

  setFocus(id: string | null): void {
    this.focus = id;
    this.rooms?.current?.setFocus(id);
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
    this.readiness.cancelAll();
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLostEvent);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.rooms?.dispose();
    for (const part of this.parts) part.dispose();
    this.stress?.geometry.dispose();
    (this.stress?.material as ShaderMaterial | undefined)?.dispose();
    this.stress?.dispose();
    this.parts = [];
    this.scene.clear();
    this.residualInfo = this.renderInfo(); // the renderer's own count of what is still alive
    this.gpu?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss(); // free the GPU context now, not whenever the garbage collector runs
    this.renderer = null;
    this.canvas = null;
    this.rooms = null;
    this.headset = this.consoleRoom = this.tunnel = this.stress = null;
    this.onFrameTime = null;
    this.onContextLost = null;
  }

  // --- readiness: compile, warm up, rooms -----------------------------------------------------------------------

  /**
   * Starts compiling every shader program now, in parallel and off the main thread where the browser allows,
   * instead of on the first frame that needs each one (a 10 to 30 ms hitch exactly when a phase changes).
   * Three.js collects the objects to compile synchronously, so visibility is restored before returning.
   */
  private precompile(): Promise<void> {
    const renderer = this.renderer;
    if (!renderer) return Promise.resolve();
    return this.compileVisible(this.parts.map((part) => part.object));
  }

  /** Compiles the shaders of these objects as if they were visible, restoring their visibility at once. */
  private compileVisible(objects: readonly { visible: boolean }[]): Promise<void> {
    const renderer = this.renderer;
    if (!renderer) return Promise.resolve();
    const visibility = objects.map((object) => object.visible);
    for (const object of objects) object.visible = true;
    const done = renderer.compileAsync(this.scene, this.camera).then(
      () => undefined,
      () => undefined, // a failed warm-up only costs the old first-frame hitch
    );
    objects.forEach((object, i) => (object.visible = visibility[i]!));
    return done;
  }

  /** The shared parts are drawn once, out of sight, one per frame, while the boot screen is up. */
  private queueWarmUp(): void {
    if (this.disposed || !this.consoleRoom || !this.tunnel) return;
    this.scheduleWarm('console', this.consoleRoom, () =>
      targetPose('console', 0, this.origin, this.camera.aspect),
    );
    this.scheduleWarm('journey', this.tunnel, () =>
      targetPose('journey', 0, this.origin, this.camera.aspect),
    );
  }

  private scheduleWarm(
    name: string,
    part: WorldPart,
    pose: () => Pose,
    priority: number = PRIORITY.prefetch,
  ): void {
    void this.readiness.schedule(`warm:${name}`, () => this.warmSteps(part, pose), { priority });
  }

  private *warmSteps(part: WorldPart, pose: () => Pose): TaskSteps {
    this.warmDraw(part, pose());
    yield; // the draw is one step; finishing is the next, so the scheduler can stop right after it
  }

  /**
   * Draws a part once, into a single pixel, from the camera that will later see it. On its first draw the GPU does
   * per-context work that shader pre-compilation cannot (Spike 0 measured 40 to 110 ms per phase), so it is paid
   * here, in the background, instead of at a phase change.
   */
  private warmDraw(part: WorldPart, pose: Pose): void {
    const renderer = this.renderer;
    if (!renderer || this.disposed) return;
    const camera = this.warmCamera;
    camera.aspect = this.camera.aspect;
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.position.set(pose.px, pose.py, pose.pz);
    camera.lookAt(pose.tx, pose.ty, pose.tz);

    const visible = part.object.visible;
    part.object.visible = true;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 1, 1);
    renderer.render(this.scene, camera);
    renderer.setScissorTest(false);
    part.object.visible = visible;
  }

  /** Benchmark: runs the whole warm-up now and reports the time each step took (ms). */
  private async warmUp(): Promise<number[]> {
    await this.compiled;
    const times: number[] = [];
    const gl = this.renderer?.getContext();
    const pixel = new Uint8Array(4);
    for (const id of this.readiness.pendingIds().filter((task) => task.startsWith('warm:'))) {
      const started = performance.now();
      this.readiness.flush(id);
      gl?.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); // wait for the GPU, so the time is real
      times.push(performance.now() - started);
    }
    return times;
  }

  private prepareRoom(endpoint: EndpointId, priority: number, deadlineMs?: number): void {
    const deadline = deadlineMs === undefined ? {} : { deadline: performance.now() + deadlineMs };
    void this.rooms?.prepare(endpoint, { priority, ...deadline });
  }

  private async prepareRoomNow(endpoint: EndpointId): Promise<number | null> {
    const rooms = this.rooms;
    if (!rooms) return null;
    const pending = rooms.prepare(endpoint, { priority: PRIORITY.urgent });

    // The frame loop is normally what runs the scheduler, but a benchmark pauses it: drive the scheduler by hand
    // until the room is built (and give up if its code never arrives).
    let settled = false;
    void pending.then(() => (settled = true));
    for (let waits = 0; !settled && waits < 2000; waits++) {
      await yieldToEventLoop();
      this.readiness.tick(Infinity);
    }
    const room = settled ? await pending : null;
    if (!room || this.disposed) return null;

    this.readiness.flush(`warm:room:${endpoint}`);
    await this.compiled;
    return rooms.buildMs.get(endpoint) ?? null;
  }

  /** A room was just built: apply the tier, compile its shaders, and queue its warm-up draw. */
  private onRoomBuilt(room: Room): void {
    if (this.disposed) return;
    room.setProfile(this.profile);
    room.setPixelScale(this.pixelScale);
    void this.compileVisible([room.object]);
    this.scheduleWarm(
      `room:${room.id}`,
      room,
      () => room.pose(0, this.origin, this.camera.aspect),
      PRIORITY.intent,
    );
  }

  // --- phases -------------------------------------------------------------------------------------------

  private onPhaseChange(from: ScenePhase, to: ScenePhase, endpoint: EndpointId | null): void {
    switch (to) {
      case 'boot':
        this.headset?.reset();
        this.consoleRoom?.press(-1);
        this.tunnel?.setFlying(false);
        this.rooms?.hide();
        break;
      case 'console':
        if (from === 'boot') this.headset?.fly();
        this.consoleRoom?.press(-1);
        this.tunnel?.setFlying(false);
        this.rooms?.hide();
        // The first stop is the likeliest, so it is prepared before the visitor chooses.
        this.prepareRoom('about', PRIORITY.prefetch);
        break;
      case 'journey':
        // The pressed key stays down while the packet leaves.
        if (endpoint) {
          this.consoleRoom?.press(ENDPOINT_IDS.indexOf(endpoint));
          this.prepareRoom(endpoint, PRIORITY.urgent, JOURNEY_DEADLINE_MS);
        }
        this.rooms?.hide();
        this.tunnel?.setReturning(false);
        this.tunnel?.setFlying(true);
        this.returnUntil = 0;
        break;
      case 'room':
        this.consoleRoom?.press(-1);
        // The gold response stream carries the visitor back for a moment.
        this.tunnel?.setReturning(true);
        this.tunnel?.setFlying(true);
        this.returnUntil = this.clock + RETURN_FLIGHT;
        if (endpoint) this.enterRoom(endpoint);
        break;
    }
  }

  /** Shows the room for an endpoint as soon as it is built (at once when it already is). */
  private enterRoom(endpoint: EndpointId): void {
    const rooms = this.rooms;
    if (!rooms) return;
    if (this.showRoom(endpoint)) return;
    void rooms.prepare(endpoint, { priority: PRIORITY.urgent }).then(() => {
      if (!this.disposed && this.phase === 'room' && this.endpoint === endpoint)
        this.showRoom(endpoint);
    });
  }

  private showRoom(endpoint: EndpointId): boolean {
    const room = this.rooms?.show(endpoint);
    if (!room) return false;
    room.setProfile(this.profile);
    room.setPixelScale(this.pixelScale);
    room.setFocus(this.focus);
    this.roomStart = this.clock;
    return true;
  }

  /** Which shared parts are visible, given the current phase and how long it has been going. */
  private applyPhaseVisibility(phaseTime: number): void {
    if (!this.headset || !this.consoleRoom) return;
    const phase = this.phase;
    this.consoleRoom.object.visible =
      phase === 'console' || (phase === 'journey' && phaseTime < CONSOLE_LINGER);
    if (phase === 'journey' || phase === 'room') this.headset.object.visible = false;
    // The response stream ends once its time is up AND the room is there to take over; never an empty void.
    if (
      this.returnUntil > 0 &&
      this.clock >= this.returnUntil &&
      (phase !== 'room' || this.rooms?.current)
    ) {
      this.tunnel?.setFlying(false);
      this.returnUntil = 0;
    }
  }

  // --- tiers, size ----------------------------------------------------------------------------------------

  private applyProfile(): void {
    this.tunnel?.setPointCount(this.profile.tunnelPoints);
    this.tunnel?.setRingCount(this.profile.rings);
    for (const id of this.rooms?.ids ?? []) this.rooms?.get(id)?.setProfile(this.profile);
  }

  private applySize(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(this.dpr, this.profile.maxDpr));
    renderer.setSize(this.width, this.height, false); // CSS owns the displayed size
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.pixelScale = renderer.domElement.height / 900;
    this.tunnel?.setPixelScale(this.pixelScale);
    for (const id of this.rooms?.ids ?? []) this.rooms?.get(id)?.setPixelScale(this.pixelScale);
  }

  // --- the frame ------------------------------------------------------------------------------------------

  private frame({ deltaMs, expectedMs, now }: FrameInfo): void {
    if (!this.renderer) return;
    const dt = Math.min(deltaMs, 100) / 1000;

    const t0 = performance.now();
    this.step(dt);
    this.render();
    const cpu = performance.now() - t0;
    this.readiness.tick(READINESS_BUDGET_MS); // what the visitor is about to need, in the background

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

    // A room owns its camera; until it is shown, the camera stays where the phase puts it.
    const room = this.phase === 'room' ? this.rooms?.current : null;
    const target = room
      ? room.pose(this.clock - this.roomStart, this.pointer, this.camera.aspect)
      : targetPose(this.phase, phaseTime, this.pointer, this.camera.aspect);
    const pose = this.rig.update(dt, target);
    this.camera.position.set(pose.px, pose.py, pose.pz);
    this.camera.lookAt(pose.tx, pose.ty, pose.tz);
    if (Math.abs(pose.fov - this.lastFov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
      this.lastFov = pose.fov;
    }

    this.applyPhaseVisibility(phaseTime);
    for (const part of this.parts) part.update(dt, this.clock);
    room?.update(dt, this.clock);
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
