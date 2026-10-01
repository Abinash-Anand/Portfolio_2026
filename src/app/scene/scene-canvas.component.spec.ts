import { TestBed } from '@angular/core/testing';
import type { Capabilities } from '../motion/capabilities';
import { CAPABILITY_PROBE, MotionService } from '../motion/motion.service';
import { SceneCanvas } from './scene-canvas.component';
import {
  EMPTY_CONTENT,
  SCENE_HOST_FACTORY,
  type SceneHost,
  type SceneSnapshot,
  type SceneStats,
} from './scene-host';
import { SceneRegistry } from './scene-registry';

const strong: Capabilities = {
  reducedMotion: false,
  webgl2: true,
  hardwareConcurrency: 12,
  deviceMemoryGb: 16,
  coarsePointer: false,
  saveData: false,
};

class FakeHost implements SceneHost {
  readonly engine = 'FAKE';
  onFrameTime: ((ms: number) => void) | null = null;
  mount = vi.fn();
  setSnapshot = vi.fn();
  setTier = vi.fn();
  resize = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  dispose = vi.fn();
  setContent = vi.fn();
  stats = vi.fn((): SceneStats => ({
    engine: 'FAKE',
    fps: 60,
    frameMs: 16.7,
    drawCalls: 3,
    triangles: 0,
  }));
}

const boot: SceneSnapshot = { phase: 'boot', endpoint: null };

function setup(options: { deferred?: boolean } = {}) {
  const host = new FakeHost();
  let release: (host: SceneHost) => void = () => undefined;
  const factory = vi.fn(() =>
    options.deferred
      ? new Promise<SceneHost>((resolve) => (release = resolve))
      : Promise.resolve<SceneHost>(host),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  TestBed.configureTestingModule({
    providers: [
      { provide: SCENE_HOST_FACTORY, useValue: factory },
      { provide: CAPABILITY_PROBE, useValue: () => strong },
    ],
  });
  const fixture = TestBed.createComponent(SceneCanvas);
  fixture.componentRef.setInput('snapshot', boot);
  fixture.componentRef.setInput('tier', 'high');
  fixture.detectChanges();
  return { fixture, host, factory, release: (h: SceneHost) => release(h) };
}

async function mounted(host: FakeHost): Promise<void> {
  await vi.waitFor(() => expect(host.mount).toHaveBeenCalled());
}

describe('SceneCanvas', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates the host, applies the initial tier and snapshot, mounts on the canvas and registers it', async () => {
    const { host, fixture } = setup();
    await mounted(host);
    expect(host.setTier).toHaveBeenCalledWith('high');
    expect(host.setSnapshot).toHaveBeenCalledWith(boot);
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas');
    expect(host.mount).toHaveBeenCalledWith(canvas);
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(host.resize).toHaveBeenCalled();
    expect(TestBed.inject(SceneRegistry).stats()?.engine).toBe('FAKE');
  });

  it('pushes snapshot and tier changes into the host (coarse inputs only)', async () => {
    const { host, fixture } = setup();
    await mounted(host);

    fixture.componentRef.setInput('snapshot', { phase: 'journey', endpoint: 'about' });
    fixture.componentRef.setInput('tier', 'low');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.setSnapshot).toHaveBeenLastCalledWith({ phase: 'journey', endpoint: 'about' });
    expect(host.setTier).toHaveBeenLastCalledWith('low');
  });

  it('hands the host its content before it mounts, and again whenever the content changes', async () => {
    const { host, fixture } = setup();
    await mounted(host);
    expect(host.setContent).toHaveBeenCalledWith(EMPTY_CONTENT); // nothing supplied: the empty content
    expect(host.setContent.mock.invocationCallOrder[0]!).toBeLessThan(
      host.mount.mock.invocationCallOrder[0]!,
    );

    const content = { ...EMPTY_CONTENT, records: [{ key: 'NAME', value: 'x' }] };
    fixture.componentRef.setInput('content', content);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.setContent).toHaveBeenLastCalledWith(content);
  });

  it('works with a host that has no rooms to build (the optional content hook is absent)', async () => {
    const { host } = setup();
    (host as { setContent?: unknown }).setContent = undefined;
    await mounted(host);
    expect(host.mount).toHaveBeenCalled();
  });

  it('pauses when the tab is hidden and resumes when it is visible again', async () => {
    const { host } = setup();
    await mounted(host);
    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.pause).toHaveBeenCalledOnce();
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.resume).toHaveBeenCalledOnce();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('disposes the host and unregisters it when destroyed', async () => {
    const { host, fixture } = setup();
    await mounted(host);
    fixture.destroy();
    expect(host.dispose).toHaveBeenCalledOnce();
    expect(TestBed.inject(SceneRegistry).active()).toBe(false);
  });

  it('disposes a host that finishes loading AFTER the page was left (no leak, no mount)', async () => {
    const { host, fixture, release, factory } = setup({ deferred: true });
    await vi.waitFor(() => expect(factory).toHaveBeenCalled());
    fixture.destroy();
    release(host);
    await vi.waitFor(() => expect(host.dispose).toHaveBeenCalledOnce());
    expect(host.mount).not.toHaveBeenCalled();
  });

  it('lets the governor lower the tier when frames are slow, in auto mode', async () => {
    const { host } = setup();
    await mounted(host);
    const motion = TestBed.inject(MotionService);
    expect(motion.tier()).toBe('high');
    // Two full windows (90 frames each) of 40 ms frames.
    for (let i = 0; i < 180; i++) host.onFrameTime?.(40);
    expect(motion.tier()).toBe('medium');
  });

  it('does not override a tier the user forced', async () => {
    const { host } = setup();
    await mounted(host);
    const motion = TestBed.inject(MotionService);
    motion.setChoice('high');
    for (let i = 0; i < 400; i++) host.onFrameTime?.(40);
    expect(motion.tier()).toBe('high');
  });
});
