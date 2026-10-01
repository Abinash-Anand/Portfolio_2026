import { InstancedMesh, Points, ShaderMaterial, type PerspectiveCamera, type Scene } from 'three';
import { FakeScheduler } from '../testing';
import { THREE_PROFILES } from './profiles';
import { ThreeSceneHost, type RendererPort } from './three-scene.host';
import type { ConsoleRoom } from './world/console-room';
import type { Headset } from './world/headset';
import type { Tunnel } from './world/tunnel';
import type { Vault } from './world/vault';

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
  vault: Vault;
  scene: Scene;
  camera: PerspectiveCamera;
}

let seed = 5;
const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

function setup(tier: 'high' | 'medium' | 'low' = 'high') {
  const scheduler = new FakeScheduler();
  const renderer = new FakeRenderer();
  const createRenderer = vi.fn(() => renderer as unknown as RendererPort);
  const host = new ThreeSceneHost({ scheduler, random, createRenderer });
  const canvas = document.createElement('canvas');
  host.setTier(tier);
  const world = host as unknown as World;
  /** Runs `seconds` of display refreshes at 60 Hz. */
  let clock = 1000;
  const run = (seconds: number): void => {
    clock = scheduler.run(Math.round(seconds * 60), 1000 / 60, clock);
  };
  return { host, scheduler, renderer, createRenderer, canvas, world, run };
}

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

    it('compiles every shader up front, with all parts visible only for that instant', () => {
      const { host, renderer, canvas, world } = setup();
      let seen: boolean[] = [];
      renderer.compileAsync.mockImplementation(() => {
        seen = [world.headset, world.consoleRoom, world.tunnel, world.vault].map(
          (part) => part.object.visible,
        );
        return Promise.resolve();
      });
      host.mount(canvas);

      expect(renderer.compileAsync).toHaveBeenCalledTimes(1);
      expect(seen).toEqual([true, true, true, true]);
      expect(world.consoleRoom.object.visible).toBe(false);
      expect(world.vault.object.visible).toBe(false);
      expect(world.tunnel.object.visible).toBe(false);
    });

    it('then draws each hidden part once into a single pixel, one per frame, from the camera that will see it', async () => {
      const { host, canvas, renderer, world, run } = setup();
      host.mount(canvas);

      run(0.2); // compilation has not finished yet: no warm-up draws
      expect(renderer.setScissorTest).not.toHaveBeenCalled();

      await host.bench!.whenCompiled();
      const before = renderer.render.mock.calls.length;
      run(0.05); // three frames
      const calls = renderer.render.mock.calls.slice(before);
      const warmDraws = calls.filter(([, camera]) => camera !== world.camera);

      expect(warmDraws).toHaveLength(3); // console, tunnel, vault
      expect(renderer.setScissor).toHaveBeenCalledWith(0, 0, 1, 1);
      expect(renderer.setScissorTest.mock.calls.filter(([on]) => on === true)).toHaveLength(3);
      expect(renderer.setScissorTest.mock.calls.at(-1)).toEqual([false]);

      run(1); // the queue is empty afterwards: only normal frames
      const later = renderer.render.mock.calls.slice(before + calls.length);
      expect(later.every(([, camera]) => camera === world.camera)).toBe(true);

      expect(world.consoleRoom.object.visible).toBe(false); // visibility is restored
      expect(world.vault.object.visible).toBe(false);
    });

    it('can run the whole warm-up on demand and report each step', async () => {
      const { host, canvas, renderer } = setup();
      host.mount(canvas);
      const times = await host.bench!.warmUp();
      expect(times).toHaveLength(3);
      expect(renderer.gl.readPixels).toHaveBeenCalledTimes(3); // synced so the time is the real cost
      expect(await host.bench!.warmUp()).toEqual([]); // only once
    });

    it('survives a shader warm-up that fails', async () => {
      const { host, renderer, canvas } = setup();
      renderer.compileAsync.mockRejectedValue(new Error('no parallel compile'));
      host.mount(canvas);
      await expect(host.bench!.whenCompiled()).resolves.toBeUndefined();
    });

    it('replays a snapshot that arrived before the world existed, without a flight', () => {
      const { host, canvas, world, run } = setup();
      host.setSnapshot({ phase: 'room', endpoint: 'skills' });
      host.mount(canvas);
      run(0.2);
      expect(world.headset.gone).toBe(true);
      expect(world.vault.object.visible).toBe(true);
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
      expect(world.vault.object.visible).toBe(false);
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

    it('arrives in a room tinted for the endpoint, answers in gold, then settles', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'journey', endpoint: 'projects' });
      run(1);
      host.setSnapshot({ phase: 'room', endpoint: 'projects' });
      run(0.3);
      expect(world.vault.object.visible).toBe(true);
      expect(world.headset.gone).toBe(true);
      expect(world.tunnel.object.visible).toBe(true); // the response is still flying
      run(5);
      expect(world.tunnel.object.visible).toBe(false);
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

    it('retints the vault when only the endpoint changes inside a room', () => {
      const { host, canvas, world, run } = setup();
      host.mount(canvas);
      host.setSnapshot({ phase: 'room', endpoint: 'about' });
      run(0.1);
      const leds = world.vault.object.children.find(
        (c): c is InstancedMesh =>
          c instanceof InstancedMesh && c.material instanceof ShaderMaterial,
      )!;
      const material = leds.material as ShaderMaterial;
      const before = material.uniforms['uColorA']!.value.getHex();
      host.setSnapshot({ phase: 'room', endpoint: 'skills' });
      expect(material.uniforms['uColorA']!.value.getHex()).not.toBe(before);
    });
  });

  describe('quality tiers and size', () => {
    it('trims points, rings and racks by tier without rebuilding anything', () => {
      const { host, canvas, world } = setup('high');
      host.mount(canvas);
      const points = world.tunnel.object.children.find((c) => c instanceof Points) as Points;
      const racks = world.vault.object.children.find(
        (c) => c instanceof InstancedMesh,
      ) as InstancedMesh;
      const geometryBefore = points.geometry;

      host.setTier('low');
      expect(points.geometry.drawRange.count).toBe(THREE_PROFILES.low.tunnelPoints);
      expect(racks.count).toBe(THREE_PROFILES.low.racksPerSide * 2);
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
      expect(world.scene).toBeDefined();
      expect(world.scene.children).toHaveLength(0);
      expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(host.bench!.residual()).toMatchObject({ geometries: 24, textures: 2 });
      expect(host.stats().drawCalls).toBe(0);
    });

    it('ignores tier, size and snapshot calls after disposal', () => {
      const { host, canvas } = setup('high');
      host.mount(canvas);
      host.dispose();
      expect(() => {
        host.setTier('low');
        host.resize(10, 10, 1);
        host.setSnapshot({ phase: 'room', endpoint: 'about' });
        host.resume();
      }).not.toThrow();
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
