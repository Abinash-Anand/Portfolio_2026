import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AnalyticsPort, type AnalyticsEvent } from '../../core/analytics/analytics.port';
import { MOTION } from '../../core/design/tokens';
import { ShellService } from '../../core/shell.service';
import { AUDIO_CONTEXT_FACTORY } from '../../motion/audio/audio.service';
import type { Capabilities } from '../../motion/capabilities';
import { CAPABILITY_PROBE } from '../../motion/motion.service';
import { SCENE_HOST_FACTORY, type SceneHost } from '../../scene/scene-host';
import { JourneyPage } from './journey.page';

const strong: Capabilities = {
  reducedMotion: false,
  webgl2: true,
  hardwareConcurrency: 12,
  deviceMemoryGb: 16,
  coarsePointer: false,
  saveData: false,
};

function fakeHost() {
  return {
    engine: 'FAKE',
    onFrameTime: null,
    mount: vi.fn(),
    setSnapshot: vi.fn(),
    setTier: vi.fn(),
    resize: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    dispose: vi.fn(),
    stats: () => ({ engine: 'FAKE', fps: 60, frameMs: 16.7, drawCalls: 1, triangles: 0 }),
  };
}

async function setup(capabilities: Capabilities = strong) {
  const host = fakeHost();
  const track = vi.fn<(event: AnalyticsEvent) => void>();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        ['resume', 'about', 'education', 'skills', 'work', 'experience'].map((path) => ({
          path,
          children: [],
        })),
      ),
      { provide: CAPABILITY_PROBE, useValue: () => capabilities },
      {
        provide: SCENE_HOST_FACTORY,
        useValue: () => Promise.resolve(host as unknown as SceneHost),
      },
      { provide: AUDIO_CONTEXT_FACTORY, useValue: () => null },
      { provide: AnalyticsPort, useValue: { track } },
    ],
  });
  const fixture = TestBed.createComponent(JourneyPage);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const button = (label: string): HTMLButtonElement => {
    const found = [...el.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').replace(/\s+/g, ' ').includes(label),
    );
    if (!found) throw new Error(`No button containing "${label}"`);
    return found;
  };
  const click = async (label: string) => {
    button(label).click();
    await settle();
  };
  const announcement = () => el.querySelector('[role="status"]')?.textContent?.trim();
  return { fixture, el, host, track, settle, button, click, announcement };
}

describe('JourneyPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens on the boot screen with the verbatim terminal prompt and the 2D resume one click away', async () => {
    const { el, announcement } = await setup();
    const text = el.textContent ?? '';
    expect(text).toContain('SYSTEM STATUS: ONLINE');
    expect(text).toContain('ACTION REQUIRED: INITIALIZE NEURAL LINK TO ENTER DIGITAL SUBSTRATUM');
    expect(el.querySelector('h1')?.textContent).toContain("Packet's Journey");
    expect(el.querySelector('a[href="/resume"]')).toBeTruthy(); // from the first frame (CONCEPT A1)
    expect(announcement()).toContain('Boot sequence');
  });

  it('takes over the viewport (site chrome hides), is not indexable, and gives it back on leave', async () => {
    const { fixture } = await setup();
    expect(TestBed.inject(ShellService).immersive()).toBe(true);
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    fixture.destroy();
    expect(TestBed.inject(ShellService).immersive()).toBe(false);
  });

  it('flows boot -> console -> journey -> room, announcing each state for screen readers', async () => {
    vi.useFakeTimers();
    const { el, click, settle, announcement, track } = await setup();

    await click('INITIALIZE NEURAL LINK');
    expect(announcement()).toContain('Console ready');
    expect(el.querySelectorAll('app-endpoint-keys button')).toHaveLength(5);
    expect(track).toHaveBeenCalledWith({ name: 'journey_start' });

    await click('[ GET /api/v1/about ]');
    expect(announcement()).toContain('Travelling to About');
    expect(el.textContent).toContain('>>> TARGET: api.abinash.dev/v1/about');
    expect(el.textContent).toContain('SIMULATED');
    expect(track).toHaveBeenCalledWith({ name: 'endpoint_select', endpoint: 'about' });

    vi.advanceTimersByTime(MOTION.journeyMs.first);
    await settle();
    expect(announcement()).toContain('About reached');
    const room = el.querySelector('section[aria-labelledby="room-title"]');
    expect(room?.textContent).toContain('ABINASH ANAND // FULL-STACK SOFTWARE ENGINEER');
    expect(room?.textContent).toContain('STATUS 200 OK | PAYLOAD SIZE: 2.4KB | TIME: 24ms');
    expect(room?.textContent).toContain('SIMULATED');
  });

  it('lets the visitor skip a journey with the button and with Escape', async () => {
    vi.useFakeTimers();
    const { el, click, settle, track } = await setup();
    await click('INITIALIZE NEURAL LINK');
    await click('[ GET /api/v1/skills ]');
    await click('Skip journey');
    expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy();
    expect(track).toHaveBeenCalledWith({ name: 'journey_skip' });

    await click('RE-RUN PACKET JOURNEY');
    expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy();
  });

  it('routes to the next endpoint and offers the plain 2D page for it (parity)', async () => {
    vi.useFakeTimers();
    const { el, click, settle } = await setup();
    await click('INITIALIZE NEURAL LINK');
    await click('[ GET /api/v1/about ]');
    await click('Skip journey');

    await click('ROUTE TO NEXT ENDPOINT: EDUCATION');
    vi.advanceTimersByTime(MOTION.journeyMs.first);
    await settle();
    const room = el.querySelector('section[aria-labelledby="room-title"]');
    expect(room?.textContent).toContain('GET /api/v1/education');
    expect(room?.querySelector('a[href="/education"]')).toBeTruthy();
  });

  it('sends the scene coarse state only: the phase and endpoint', async () => {
    vi.useFakeTimers();
    const { host, click, settle } = await setup();
    await vi.waitFor(() => expect(host.mount).toHaveBeenCalled());
    await click('INITIALIZE NEURAL LINK');
    expect(host.setSnapshot).toHaveBeenLastCalledWith({ phase: 'console', endpoint: null });
    await click('[ GET /api/v1/projects ]');
    await settle();
    expect(host.setSnapshot).toHaveBeenLastCalledWith({ phase: 'journey', endpoint: 'projects' });
  });

  it('moves keyboard focus to the primary control of each state', async () => {
    vi.useFakeTimers();
    const { el, click, settle } = await setup();
    await settle();
    expect(document.activeElement).toBe(el.querySelector('[data-autofocus]'));
    await click('INITIALIZE NEURAL LINK');
    await settle();
    expect(document.activeElement?.textContent).toContain('[ GET /api/v1/about ]');
  });

  it('cycles graphics and toggles audio from the HUD', async () => {
    const { el, click } = await setup();
    expect(el.textContent).toContain('[ GRAPHICS: AUTO · HIGH ]');
    await click('GRAPHICS');
    expect(el.textContent).toContain('[ GRAPHICS: HIGH ]');
    await click('AUDIO: OFF');
    expect(el.textContent).toContain('[ AUDIO: ON ]');
  });

  describe('reduced motion', () => {
    const reduced: Capabilities = { ...strong, reducedMotion: true };

    it('draws no 3D canvas, types nothing out, and lands in the room with no journey', async () => {
      const { el, click, announcement, track } = await setup(reduced);
      expect(el.querySelector('app-scene-canvas')).toBeNull();
      expect(el.textContent).toContain('SYSTEM STATUS: ONLINE'); // instantly visible

      await click('INITIALIZE NEURAL LINK');
      await click('[ GET /api/v1/skills ]');
      expect(announcement()).toContain('Skills reached');
      expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy();
      expect(el.textContent).not.toContain('Skip journey');
      expect(track).toHaveBeenCalledWith({ name: 'endpoint_select', endpoint: 'skills' });
    });

    it('still lets the visitor opt back in to graphics explicitly', async () => {
      const { el, click } = await setup(reduced);
      await click('GRAPHICS'); // auto -> high
      expect(el.querySelector('app-scene-canvas')).toBeTruthy();
    });
  });
});
