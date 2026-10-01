import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { journeyMatcher } from '../../app.routes';
import { AnalyticsPort, type AnalyticsEvent } from '../../core/analytics/analytics.port';
import { MOTION } from '../../core/design/tokens';
import { ShellService } from '../../core/shell.service';
import { AUDIO_CONTEXT_FACTORY } from '../../motion/audio/audio.service';
import type { Capabilities } from '../../motion/capabilities';
import { RESUME } from '../../content/resume';
import { PortfolioStore } from '../../data/portfolio.store';
import { makeProject, provideFixturePortfolio } from '../../data/testing';
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
    setContent: vi.fn(),
    setIntent: vi.fn(),
    setFocus: vi.fn(),
    stats: () => ({ engine: 'FAKE', fps: 60, frameMs: 16.7, drawCalls: 1, triangles: 0 }),
  };
}

const PROJECTS = [
  makeProject({
    slug: 'SynthGraph',
    title: 'SynthGraph',
    summary: 'Data lineage.',
    featured: true,
  }),
  makeProject({
    slug: 'ParkRabbit',
    title: 'ParkRabbit',
    summary: 'Parking events.',
    featured: true,
  }),
];

/** Opens the page through the real router, so the address bar and Back/Forward behave as in the browser. */
async function setup(capabilities: Capabilities = strong, url = '/journey') {
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
        [
          { matcher: journeyMatcher, component: JourneyPage },
          ...['resume', 'about', 'education', 'skills', 'work', 'experience'].map((path) => ({
            path,
            children: [],
          })),
        ],
        withComponentInputBinding(),
      ),
      provideFixturePortfolio(PROJECTS),
      { provide: CAPABILITY_PROBE, useValue: () => capabilities },
      {
        provide: SCENE_HOST_FACTORY,
        useValue: () => Promise.resolve(host as unknown as SceneHost),
      },
      { provide: AUDIO_CONTEXT_FACTORY, useValue: () => null },
      { provide: AnalyticsPort, useValue: { track } },
    ],
  });
  await TestBed.inject(PortfolioStore).load();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, JourneyPage);
  const router = TestBed.inject(Router);
  const el = harness.routeNativeElement as HTMLElement;

  const settle = async () => {
    harness.detectChanges();
    if (vi.isFakeTimers()) {
      // With fake timers the router's own timers must be driven by hand, so "stable" cannot be awaited.
      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(0);
        harness.detectChanges();
      }
      return;
    }
    await harness.fixture.whenStable();
    harness.detectChanges();
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
  /** Moves the address bar, as the Back and Forward buttons would. */
  const goto = async (target: string) => {
    await harness.navigateByUrl(target);
    await settle();
  };
  const announcement = () => el.querySelector('[role="status"]')?.textContent?.trim();
  return { harness, router, el, host, track, settle, button, click, goto, announcement };
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
    const { goto } = await setup();
    expect(TestBed.inject(ShellService).immersive()).toBe(true);
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    await goto('/resume');
    expect(TestBed.inject(ShellService).immersive()).toBe(false);
  });

  it('flows boot -> console -> journey -> room, announcing each state for screen readers', async () => {
    const { el, click, settle, announcement, track } = await setup();
    vi.useFakeTimers();

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
    const { el, click, settle, track } = await setup();
    vi.useFakeTimers();
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
    const { el, click, settle } = await setup();
    vi.useFakeTimers();
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
    const { host, click, settle } = await setup();
    vi.useFakeTimers();
    await vi.waitFor(() => expect(host.mount).toHaveBeenCalled());
    await click('INITIALIZE NEURAL LINK');
    expect(host.setSnapshot).toHaveBeenLastCalledWith({ phase: 'console', endpoint: null });
    await click('[ GET /api/v1/projects ]');
    await settle();
    expect(host.setSnapshot).toHaveBeenLastCalledWith({ phase: 'journey', endpoint: 'projects' });
  });

  it('moves keyboard focus to the primary control of each state', async () => {
    const { el, click, settle } = await setup();
    vi.useFakeTimers();
    await settle();
    expect(document.activeElement).toBe(el.querySelector('[data-autofocus]'));
    await click('INITIALIZE NEURAL LINK');
    await settle();
    expect(document.activeElement?.textContent).toContain('[ GET /api/v1/about ]');
  });

  it('lands keyboard focus on the room heading, so a room is read from the top', async () => {
    const { el, settle } = await setup(strong, '/journey/skills');
    await settle();
    expect(document.activeElement).toBe(el.querySelector('#room-title'));
  });

  it('cycles graphics and toggles audio from the HUD', async () => {
    const { el, click } = await setup();
    expect(el.textContent).toContain('[ GRAPHICS: AUTO · HIGH ]');
    await click('GRAPHICS');
    expect(el.textContent).toContain('[ GRAPHICS: HIGH ]');
    await click('AUDIO: OFF');
    expect(el.textContent).toContain('[ AUDIO: ON ]');
  });

  describe('addresses and history', () => {
    it('writes the room to the address when the visitor arrives, and the console when they go back', async () => {
      const { router, click } = await setup();
      await click('INITIALIZE NEURAL LINK');
      expect(router.url).toBe('/journey'); // the console is the base address
      await click('[ GET /api/v1/skills ]');
      expect(router.url).toBe('/journey'); // travelling writes nothing: only settled places are addresses
      await click('Skip journey');
      expect(router.url).toBe('/journey/skills');

      await click('BACK TO CONSOLE');
      expect(router.url).toBe('/journey');
    });

    it('opens straight into a room from a link, with no journey', async () => {
      const { el, announcement, track } = await setup(strong, '/journey/education');
      expect(announcement()).toContain('Education reached');
      expect(el.querySelector('section[aria-labelledby="room-title"]')?.textContent).toContain(
        'GET /api/v1/education',
      );
      expect(el.textContent).not.toContain('Skip journey');
      expect(track).toHaveBeenCalledWith({
        name: 'room_arrive',
        endpoint: 'education',
        how: 'direct',
      });
    });

    it('follows Back and Forward: out of a room to the console, and back in again', async () => {
      const { el, goto, announcement } = await setup(strong, '/journey/skills');
      expect(announcement()).toContain('Skills reached');

      await goto('/journey'); // Back
      expect(announcement()).toContain('Console ready');
      expect(el.querySelector('app-endpoint-keys')).toBeTruthy();

      await goto('/journey/projects'); // Forward, or a different link
      expect(announcement()).toContain('Projects reached');
    });

    it('falls back to the console for a room that does not exist', async () => {
      const { router, announcement, settle } = await setup(strong, '/journey/nonsense');
      await settle();
      await settle();
      expect(router.url).toBe('/journey');
      expect(announcement()).toContain('Boot sequence');
    });

    it('keeps one page alive between rooms, so the 3D world is not rebuilt', async () => {
      const { host, goto } = await setup(strong, '/journey/about');
      await vi.waitFor(() => expect(host.mount).toHaveBeenCalledTimes(1));
      await goto('/journey/skills');
      await goto('/journey');
      await goto('/journey/experience');
      expect(host.mount).toHaveBeenCalledTimes(1);
      expect(host.dispose).not.toHaveBeenCalled();
    });

    it('records how the visitor reached a room: by journey, by skipping it, or directly', async () => {
      vi.useFakeTimers();
      const { click, settle, track } = await setup();
      await click('INITIALIZE NEURAL LINK');
      await click('[ GET /api/v1/about ]');
      vi.advanceTimersByTime(MOTION.journeyMs.first);
      await settle();
      expect(track).toHaveBeenCalledWith({
        name: 'room_arrive',
        endpoint: 'about',
        how: 'journey',
      });

      await click('BACK TO CONSOLE');
      await click('[ GET /api/v1/skills ]');
      await click('Skip journey');
      expect(track).toHaveBeenCalledWith({ name: 'room_arrive', endpoint: 'skills', how: 'skip' });
    });
  });

  describe('rooms', () => {
    it('hands the 3D world the content to build its rooms from', async () => {
      const { host } = await setup();
      await vi.waitFor(() => expect(host.mount).toHaveBeenCalled());
      expect(host.setContent).toHaveBeenCalled();
      const content = host.setContent.mock.calls[0]![0];
      expect(content.projects.map((p: { slug: string }) => p.slug)).toEqual([
        'SynthGraph',
        'ParkRabbit',
      ]);
      expect(content.experience).toHaveLength(RESUME.experience.length);
    });

    it('starts preparing the room of a key the visitor hovers or focuses', async () => {
      const { el, host, click } = await setup();
      await vi.waitFor(() => expect(host.mount).toHaveBeenCalled());
      await click('INITIALIZE NEURAL LINK');
      const key = [...el.querySelectorAll('app-endpoint-keys button')].find((b) =>
        b.textContent?.includes('/api/v1/skills'),
      )!;
      key.dispatchEvent(new MouseEvent('mouseenter'));
      expect(host.setIntent).toHaveBeenLastCalledWith('skills');
      (el.querySelectorAll('app-endpoint-keys button')[3] as HTMLElement).dispatchEvent(
        new FocusEvent('focus'),
      );
      expect(host.setIntent).toHaveBeenLastCalledWith('projects');
    });

    it.each([
      ['education', RESUME.education.map((e) => e.degree)],
      ['skills', RESUME.skills.flatMap((g) => [g.label, ...g.items])],
      ['projects', PROJECTS.map((p) => p.title)],
      ['experience', RESUME.experience.flatMap((e) => [e.role, ...e.highlights])],
    ] as const)(
      'says the same things as text in the %s room as the 2D page does',
      async (room, expected) => {
        const { el } = await setup(strong, `/journey/${room}`);
        const text = (
          el.querySelector('section[aria-labelledby="room-title"]')?.textContent ?? ''
        ).replace(/\s+/g, ' ');
        for (const fact of expected) expect(text).toContain(fact);
      },
    );

    it('lets the visitor fold the panel away to look at the room, and bring it back', async () => {
      const { el, click, announcement } = await setup(strong, '/journey/about');
      await vi.waitFor(() =>
        expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy(),
      );
      await click('Hide panel');
      expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeNull();
      expect(el.textContent).toContain('Show panel');
      expect(announcement()).toContain('About reached'); // still in the room

      await click('Show panel');
      expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy();
    });

    it('offers no panel folding when there is no 3D to look at', async () => {
      const { el } = await setup({ ...strong, reducedMotion: true }, '/journey/about');
      expect(el.querySelector('section[aria-labelledby="room-title"]')).toBeTruthy();
      expect(el.textContent).not.toContain('Hide panel');
    });
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
