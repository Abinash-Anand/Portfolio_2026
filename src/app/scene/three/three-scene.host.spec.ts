import { InstancedMesh, Points, type PerspectiveCamera, type Scene } from 'three';
import type { SceneContent } from '../scene-host';
import { EMPTY_CONTENT } from '../scene-host';
import { FakeScheduler } from '../testing';
import { THREE_PROFILES } from './profiles';
import type { RoomManager } from './room-manager';
import { FakeRoom, fakeLoaders, macrotask } from './testing';
import { ThreeSceneHost, type RendererPort } from './three-scene.host';
import type { ConsoleRoom } from './world/console-room';
import type { Headset } from './world/headset';
import type { Tunnel } from './world/tunnel';

/** Stands in for WebGLRenderer: jsdom has no WebGL, and the host's logic does not need a real one. */
class FakeRenderer {
  readonly domElement = document.createElement('canvas');
  readonly info = {
    render: { calls: 21, triangles: 18_000, points: 30_000, lines: 400 },
    memory: { geometries: 24, textures: 2 },
    programs: [{}, {}, {}],
  };
  readonly setClearColor = vi.fn();
  readonly setPixelRatio = vi.fn();
  readonly setSize = vi.fn();
  readonly setScissor = vi.fn();
  readonly setScissorTest = vi.fn();
  readonly render = vi.fn();
  readonly compileAsync = vi.fn((): Promise<unknown> => Promise.resolve());
  readonly dispose = vi.fn();
  readonly forceContextLoss = vi.fn();
  readonly gl = {
    RGBA: 0,
    UNSIGNED_BYTE: 0,
    readPixels: vi.fn(),
    getExtension: vi.fn((): unknown => null),
  };
  getContext = (): unknown => this.gl;
}

/** The host's internals that tests need to look at. */
interface World {
  headset: Headset;
  consoleRoom: ConsoleRoom;
  tunnel: Tunnel;
  rooms: RoomManager;
  scene: Scene;
  camera: PerspectiveCamera;
}

let seed = 5;
const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

function setup(tier: 'high' | 'medium' | 'low' = 'high') {
  const scheduler = new FakeScheduler();
  const renderer = new FakeRenderer();
  const fakes = fakeLoaders();
  const createRenderer = vi.fn(() => renderer as unknown as RendererPort);
  const host = new ThreeSceneHost({
    scheduler,
    random,
    createRenderer,
    loaders: fakes.loaders,
    createCanvas: () => null,
  });
  const canvas = document.createElement('canvas');
  host.setTier(tier);
  const world = host as unknown as World;
  /** Runs `seconds` of display refreshes at 60 Hz. */
  let clock = 1000;
  const run = (seconds: number): void => {
    clock = scheduler.run(Math.round(seconds * 60), 1000 / 60, clock);
  };
  /** Lets rooms load and build in the background: frames run the scheduler, promises settle in between. */
  const settle = async (seconds = 0.2): Promise<void> => {
    await macrotask();
    run(seconds);
    await macrotask();
    run(seconds);
    await macrotask();
  };
  return { host, scheduler, renderer, createRenderer, canvas, world, run, settle, fakes };
}

const content = (label: string): SceneContent => ({
  ...EMPTY_CONTENT,
  records: [{ key: label, value: 'x' }],
});

describe('ThreeSceneHost', () => {
  describe('mounting', () => {
    it('creates the renderer for the current tier (multisampling only on high) and starts drawing', () => {
      const high = setup('high');
      high.host.mount(high.canvas);
      expect(high.createRenderer).toHaveBeenCalledWith(high.canvas, THREE_PROFILES.high);
      expect(high.scheduler.pending).toBe(true);

      const low = setup('low');
      low.host.mount(low.canvas);
      expect(low.createRenderer).toHaveBeenCalledWith(low.canvas, THREE_PROFILES.low);
    });

    it('lets the failure through when WebGL is unavailable, so the canvas can fall back to 2D', () => {
      const scheduler = new FakeScheduler();
      const host = new ThreeSceneHost({
        scheduler,
        createRenderer: () => {
          throw new Error('WebGL unavailable');
        },
      });
      expect(() => host.mount(document.createElement('canvas'))).toThrow('WebGL unavailable');
      expect(scheduler.pending).toBe(false);
    });

    it('compiles every shared shader up front, with the parts visible only for that instant', () => {
      const { host, renderer, canvas, world } = setup();
      let seen: boolean[] = [];
      renderer.compileAsync.mockImplementation(() => {
        seen = [world.headset, world.consoleRoom, world.tunnel].map((part) => part.object.visible);
        return Promise.resolve();
      });
      host.mount(canvas);

      expect(renderer.compileAsync).toHaveBeenCalledTimes(1);
      expect(seen).toEqual([true, true, true]);
      expect(world.consoleRoom.object.visible).toBe(false);
      expect(world.tunnel.object.visible).toBe(false);
    });

    it('then draws each hidden shared part once into a single pixel, one per frame, from the camera that will see it', async () => {
      const { host, canvas, renderer, world, run } = setup();
      host.mount(canvas);

      run(0.2); // compilation has not finished yet: no warm-up draws
      expect(renderer.setScissorTest).not.toHaveBeenCalled();

      await host.bench!.whenCompiled();
      const before = renderer.render.mock.calls.length;
      run(0.05);
      const calls = renderer.render.mock.calls.slice(before);
      const warmDraws = calls.filter(([, camera]) => camera !== world.camera);

      expect(warmDraws).toHaveLength(2); // console, tunnel
      expect(renderer.setScissor).toHaveBeenCalledWith(0, 0, 1, 1);
      expect(renderer.setScissorTest.mock.calls.filter(([on]) => on === true)).toHaveLength(2);
      expect(renderer.setScissorTest.mock.calls.at(-1)).toEqual([false]);

      run(1); // the queue is empty afterwards: only normal frames
      const later = renderer.render.mock.calls.slice(before + calls.length);
      expect(later.every(([, camera]) => camera === world.camera)).toBe(true);

      expect(world.consoleRoom.object.visible).toBe(false); // visibility is restored
    });

    it('can run the whole warm-up on demand and report each step', async () => {
      const { host, canvas, renderer } = setup();
      host.mount(canvas);
      const times = await host.bench!.warmUp();
      expect(times).toHaveLength(2);
      expect(renderer.gl.readPixels).toHaveBeenCalledTimes(2); // synced so the time is the real cost
      expect(await host.bench!.warmUp()).toEqual([]); // only once
    });

    it('survives a shader warm-up that fails', async () => {
      const { host, renderer, canvas } = setup();
      renderer.compileAsync.mockRejectedValue(new Error('no parallel compile'));
      host.mount(canvas);
      await expect(host.bench!.whenCompiled()).resolves.toBeUndefined();
    });

    it('replays a snapshot that arrived before the world existed, without a flight', async () => {
      const { host, canvas, world, fakes, settle } = setup();
      host.setSnapshot({ phase: 'room', endpoint: 'skills' });
      host.mount(canvas);
      await settle();
      expect(world.headset.gone).toBe(true);
      expect(world.rooms.current?.id).toBe('skills');
      expect(fakes.roomOf('skills')?.shown).toBe(true);
      expect(world.tunnel.object.visible).toBe(false); // arrived directly: no response stream
    });
  });

  describe('phases', () => {
    it('shows only the headset at boot', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      run(0.5);
      expect(world.headset.object.visible).toBe(true);
      expect(world.consoleRoom.object.visible).toBe(false);
      expect(world.tunnel.object.visible).toBe(false);
      expect(world.rooms.current).toBeNull();
    });

    it('flies the headset away and shows the console when the visitor enters', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'console', endpoint: null });
      run(0.3);
      expect(world.headset.object.visible).toBe(true); // mid-flight
      run(1);
      expect(world.headset.gone).toBe(true);
      expect(world.consoleRoom.object.visible).toBe(true);
    });

    it('presses the chosen key, streams the tunnel and lets the console linger briefly', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'console', endpoint: null });
      run(2);
      host.setSnapshot({ phase: 'journey', endpoint: 'skills' });
      run(0.2);
      expect(world.tunnel.object.visible).toBe(true);
      expect(world.consoleRoom.object.visible).toBe(true); // still there for a moment
      expect((world.consoleRoom as unknown as { pressed: number }).pressed).toBe(2);
      run(1);
      expect(world.consoleRoom.object.visible).toBe(false);
    });

    it('goes back to the headset when the experience is reset to boot', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'console', endpoint: null });
      run(2);
      host.setSnapshot({ phase: 'boot', endpoint: null });
      run(0.1);
      expect(world.headset.object.visible).toBe(true);
      expect(world.consoleRoom.object.visible).toBe(false);
    });
  });

  describe('rooms', () => {
    it('prepares the first stop while the console is shown, before anything is chosen', async () => {
      const { host, canvas, world, fakes, settle } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'console', endpoint: null });
      expect(fakes.loads).toEqual(['about']);
      await settle();

      expect(world.rooms.get('about')).toBeDefined();
      expect(world.rooms.current).toBeNull(); // built, but nobody is in it
      expect(fakes.roomOf('about')?.shown).toBe(false);
    });

    it('prepares the room a visitor shows intent for, and only that one', async () => {
      const { host, canvas, world, fakes, settle } = setup();
      host.mount(canvas);
      host.setIntent('skills');
      await settle();

      expect(fakes.loads).toEqual(['skills']);
      expect(world.rooms.get('skills')).toBeDefined();
      host.setIntent(null);
      expect(fakes.loads).toEqual(['skills']);
    });

    it('starts building the destination as the journey begins, and shows it on arrival', async () => {
      const { host, canvas, world, fakes, settle } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'projects' });
      expect(fakes.loads).toEqual(['projects']);
      await settle();

      host.setSnapshot({ phase: 'room', endpoint: 'projects' });
      await settle();
      expect(world.rooms.current?.id).toBe('projects');
      expect(fakes.roomOf('projects')?.shown).toBe(true);
    });

    it('answers in gold while arriving, then lets the stream settle once the room has taken over', async () => {
      const { host, canvas, world, settle, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'projects' });
      await settle();
      host.setSnapshot({ phase: 'room', endpoint: 'projects' });
      run(0.3);
      expect(world.headset.gone).toBe(true);
      expect(world.tunnel.object.visible).toBe(true); // the response is still flying
      await settle();
      run(5);
      expect(world.tunnel.object.visible).toBe(false);
    });

    it('follows the shown room for its camera, and updates only that room', async () => {
      const { host, canvas, world, fakes, settle, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'education' });
      await settle();
      const room = fakes.roomOf('education')!;
      room.target = { px: 2, py: 3, pz: -40, tx: 0, ty: 3, tz: -50, fov: 55 };
      const idle = fakes.rooms.filter((r) => r !== room);

      host.setSnapshot({ phase: 'room', endpoint: 'education' });
      await settle();
      run(4);

      expect(world.camera.position.z).toBeCloseTo(-40, 0);
      expect(world.camera.position.x).toBeCloseTo(2, 0);
      expect(room.updates).toBeGreaterThan(100);
      expect(idle.every((r) => r.updates === 0)).toBe(true);
    });

    it('keeps the camera in the tunnel, and the stream flying, while a late room is still loading', async () => {
      const { host, canvas, world, fakes, run, settle } = setup();
      let release: () => void = () => undefined;
      const late = new Promise<void>((resolve) => (release = resolve));
      fakes.override('skills', async () => {
        await late;
        return () => new FakeRoom('skills');
      });
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'skills' });
      await settle();
      host.setSnapshot({ phase: 'room', endpoint: 'skills' });
      run(3);

      expect(world.rooms.current).toBeNull();
      expect(world.tunnel.object.visible).toBe(true); // never an empty void
      release();
    });

    it('leaves the tunnel up, without throwing, when a room cannot be loaded', async () => {
      const { host, canvas, world, fakes, run, settle } = setup();
      fakes.override('skills', () => Promise.reject(new Error('offline')));
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'skills' });
      await settle();
      host.setSnapshot({ phase: 'room', endpoint: 'skills' });
      await settle();
      expect(() => run(3)).not.toThrow();
      expect(world.rooms.current).toBeNull();
      expect(world.rooms.failed.has('skills')).toBe(true);
    });

    it('hands the tier, the screen scale and the focus to a room when it is shown', async () => {
      const { host, canvas, fakes, settle } = setup('medium');
      host.mount(canvas);
      host.resize(1000, 900, 1);
      host.setFocus('some-commit');
      host.setSnapshot({ phase: 'journey', endpoint: 'experience' });
      await settle();
      host.setSnapshot({ phase: 'room', endpoint: 'experience' });
      await settle();

      const room = fakes.roomOf('experience')!;
      expect(room.profile).toBe(THREE_PROFILES.medium);
      expect(room.pixelScale).toBeGreaterThan(0);
      expect(room.focus).toBe('some-commit');
    });

    it('forwards focus changes to the room the visitor is in', async () => {
      const { host, canvas, fakes, settle } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'room', endpoint: 'projects' });
      await settle();
      host.setFocus('SynthGraph');
      expect(fakes.roomOf('projects')?.focus).toBe('SynthGraph');
      host.setFocus(null);
      expect(fakes.roomOf('projects')?.focus).toBeNull();
    });

    it('applies a tier change to rooms that are already built', async () => {
      const { host, canvas, fakes, settle } = setup('high');
      host.mount(canvas);
      host.setIntent('skills');
      await settle();
      host.setTier('low');
      expect(fakes.roomOf('skills')?.profile).toBe(THREE_PROFILES.low);
    });

    it('rebuilds rooms from new content, including the one the visitor is in', async () => {
      const { host, canvas, world, fakes, settle } = setup();
      host.mount(canvas);
      host.setContent(content('first'));
      host.setSnapshot({ phase: 'room', endpoint: 'about' });
      await settle();
      const first = fakes.roomOf('about')!;
      expect(first.shown).toBe(true);

      host.setContent(content('second'));
      expect(first.disposed).toBe(1);
      await settle();
      const second = fakes.roomOf('about')!;
      expect(second).not.toBe(first);
      expect(world.rooms.current?.id).toBe('about');
      expect(second.shown).toBe(true);
    });

    it('ignores the same content handed over twice', async () => {
      const { host, canvas, fakes, settle } = setup();
      host.mount(canvas);
      const same = content('same');
      host.setContent(same);
      host.setSnapshot({ phase: 'room', endpoint: 'about' });
      await settle();
      const room = fakes.roomOf('about')!;
      host.setContent(same);
      expect(room.disposed).toBe(0);
    });

    it('compiles and warms each room as it is built, so entering it does not hitch', async () => {
      const { host, canvas, renderer, world, settle } = setup();
      host.mount(canvas);
      await settle(); // shared warm-up first
      const compiles = renderer.compileAsync.mock.calls.length;
      const before = renderer.render.mock.calls.length;

      host.setIntent('skills');
      await settle();

      expect(renderer.compileAsync.mock.calls.length).toBe(compiles + 1);
      const warm = renderer.render.mock.calls
        .slice(before)
        .filter(([, camera]) => camera !== world.camera);
      expect(warm).toHaveLength(1);
      expect(world.rooms.get('skills')?.object.visible).toBe(false); // visibility restored
    });

    it('releases every room with the host', async () => {
      const { host, canvas, fakes, settle } = setup();
      host.mount(canvas);
      host.setIntent('skills');
      host.setIntent('education');
      await settle();
      host.dispose();
      expect(fakes.rooms.length).toBeGreaterThan(0);
      expect(fakes.rooms.every((room) => room.disposed === 1)).toBe(true);
    });

    it('reports how long a room took to build, and can build one on demand', async () => {
      const { host, canvas, fakes, run } = setup();
      host.mount(canvas);
      const pending = host.bench!.prepareRoom('skills');
      await macrotask();
      run(0.2);
      const ms = await pending;

      expect(ms).not.toBeNull();
      expect(host.bench!.roomBuildMs()).toHaveProperty('skills');
      expect(fakes.loads).toEqual(['skills']);
    });
  });

  describe('quality tiers and size', () => {
    it('trims the tunnel by tier without rebuilding anything', () => {
      const { host, canvas, world } = setup('high');
      host.mount(canvas);
      const points = world.tunnel.object.children.find((c) => c instanceof Points) as Points;
      const rings = world.tunnel.object.children.find(
        (c) => c instanceof InstancedMesh,
      ) as InstancedMesh;
      const geometryBefore = points.geometry;

      host.setTier('low');
      expect(points.geometry.drawRange.count).toBe(THREE_PROFILES.low.tunnelPoints);
      expect(rings.count).toBe(THREE_PROFILES.low.rings);
      expect(points.geometry).toBe(geometryBefore);

      host.setTier('high');
      expect(points.geometry.drawRange.count).toBe(THREE_PROFILES.high.tunnelPoints);
    });

    it('caps the pixel ratio by tier and keeps the camera aspect in step with the canvas', () => {
      const { host, canvas, renderer, world } = setup('high');
      host.mount(canvas);
      host.resize(1000, 500, 3);
      expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(THREE_PROFILES.high.maxDpr);
      expect(renderer.setSize).toHaveBeenLastCalledWith(1000, 500, false); // CSS owns the displayed size
      expect(world.camera.aspect).toBe(2);

      host.setTier('low');
      expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(THREE_PROFILES.low.maxDpr);
    });

    it('draws fewer frames on the low tier, which is capped at 30 fps', () => {
      const high = setup('high');
      high.host.mount(high.canvas);
      high.run(2);
      const low = setup('low');
      low.host.mount(low.canvas);
      low.run(2);
      expect(low.renderer.render.mock.calls.length).toBeLessThan(
        high.renderer.render.mock.calls.length * 0.7,
      );
    });
  });

  describe('frames and stats', () => {
    it('draws one frame per refresh at 60 fps and feeds the governor 60 fps-normalised times', () => {
      const { host, canvas, renderer, run } = setup('high');
      const times: number[] = [];
      host.onFrameTime = (ms) => times.push(ms);
      host.mount(canvas);
      run(1);
      expect(renderer.render.mock.calls.length).toBeGreaterThanOrEqual(58);
      expect(times.length).toBeGreaterThan(50);
      for (const ms of times.slice(2)) expect(ms).toBeCloseTo(16.7, 0);
    });

    it('reports engine, fps and renderer counters, with cpu time but no gpu time by default', () => {
      const { host, canvas, run } = setup('high');
      host.mount(canvas);
      run(1.5);
      const stats = host.stats();
      expect(stats.engine).toBe('THREE.JS');
      expect(stats.fps).toBeGreaterThan(50);
      expect(stats.drawCalls).toBe(21);
      expect(stats.triangles).toBe(18_000);
      expect(stats.geometries).toBe(24);
      expect(stats.gpuMs).toBeNull();
    });

    it('stops drawing while paused and starts a fresh stats window on resume', () => {
      const { host, scheduler, canvas, renderer, run } = setup('high');
      host.mount(canvas);
      run(0.5);
      host.pause();
      expect(scheduler.pending).toBe(false);
      const drawn = renderer.render.mock.calls.length;
      run(0.5);
      expect(renderer.render.mock.calls.length).toBe(drawn);

      host.resume();
      expect(scheduler.pending).toBe(true);
    });

    it('makes the headset glow when told its DOM twin is hovered', () => {
      const { host, canvas, world, run } = setup('high');
      host.mount(canvas);
      run(1);
      const edge = (
        world.headset.object.children[1] as unknown as { material: { opacity: number } }
      ).material;
      const resting = edge.opacity;
      host.setHover('headset');
      run(1);
      expect(edge.opacity).toBeGreaterThan(resting);
    });
  });

  describe('losing and releasing the GPU', () => {
    it('stops drawing and tells the app when the browser takes the context away', () => {
      const { host, scheduler, canvas, renderer } = setup('high');
      const lost = vi.fn();
      host.onContextLost = lost;
      host.mount(canvas);

      const event = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(event);

      expect(lost).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
      expect(scheduler.pending).toBe(false);
      expect(renderer.render).not.toHaveBeenCalled();
    });

    it('releases everything on dispose, once, and counts what the renderer still held', () => {
      const { host, scheduler, canvas, renderer, world } = setup('high');
      const removeListener = vi.spyOn(window, 'removeEventListener');
      host.mount(canvas);
      expect(host.bench!.residual()).toBeNull();

      host.dispose();
      host.dispose(); // safe to repeat

      expect(renderer.dispose).toHaveBeenCalledTimes(1);
      expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
      expect(scheduler.pending).toBe(false);
      expect(world.scene.children).toHaveLength(0);
      expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(host.bench!.residual()).toMatchObject({ geometries: 24, textures: 2 });
      expect(host.stats().drawCalls).toBe(0);
    });

    it('ignores tier, size, content and snapshot calls after disposal', () => {
      const { host, canvas } = setup('high');
      host.mount(canvas);
      host.dispose();
      expect(() => {
        host.setTier('low');
        host.resize(10, 10, 1);
        host.setContent(content('late'));
        host.setIntent('skills');
        host.setFocus('x');
        host.setSnapshot({ phase: 'room', endpoint: 'about' });
        host.resume();
      }).not.toThrow();
    });

    it('does not build a room that was still loading when the host was disposed', async () => {
      const { host, canvas, fakes } = setup('high');
      host.mount(canvas);
      host.setIntent('skills');
      host.dispose();
      await macrotask();
      await macrotask();
      expect(fakes.rooms).toHaveLength(0);
    });
  });

  describe('benchmark hooks', () => {
    it('renders back to back, once per requested frame, and measures each', async () => {
      const { host, canvas, renderer } = setup('high');
      host.mount(canvas);
      const before = renderer.render.mock.calls.length;
      const sample = await host.bench!.renderCost(7);
      expect(renderer.render.mock.calls.length - before).toBe(7);
      expect(sample.cpuMs).toHaveLength(7);
      expect(sample.wallMs).toHaveLength(7);
      expect(renderer.gl.readPixels).toHaveBeenCalledTimes(7); // one pixel back each frame forces the GPU
      for (const ms of sample.wallMs) expect(ms).toBeGreaterThanOrEqual(0);
    });

    it('records frames for a window and hands the recording back', () => {
      const { host, canvas, run } = setup('high');
      host.mount(canvas);
      run(0.5);
      host.bench!.startRecording();
      run(1);
      const recording = host.bench!.stopRecording();
      expect(recording.deltaMs.length).toBeGreaterThan(50);
      expect(recording.cpuMs).toHaveLength(recording.deltaMs.length);
      expect(host.bench!.stopRecording().deltaMs).toHaveLength(0); // the window is closed
    });

    it('reports renderer counters and whether GPU timing is available', () => {
      const { host, canvas, renderer } = setup('high');
      host.mount(canvas);
      expect(host.bench!.info()).toMatchObject({
        calls: 21,
        geometries: 24,
        textures: 2,
        programs: 3,
      });
      expect(host.bench!.enableGpuTiming()).toBe(false);
      expect(renderer.gl.getExtension).toHaveBeenCalledWith('EXT_disjoint_timer_query_webgl2');
    });

    it('adds and removes full-screen overdraw on demand, and frees it with the scene', () => {
      const { host, canvas, world } = setup('high');
      host.mount(canvas);
      host.bench!.setStress(12);
      const layers = world.scene.children.find(
        (c): c is InstancedMesh => c instanceof InstancedMesh && c.renderOrder === 1000,
      )!;
      expect(layers.count).toBe(12);
      expect(layers.visible).toBe(true);
      host.bench!.setStress(0);
      expect(layers.visible).toBe(false);
      host.bench!.setStress(100_000);
      expect(layers.count).toBeLessThanOrEqual(160); // capped
    });
  });
});
