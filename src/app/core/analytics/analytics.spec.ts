import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AnalyticsPort, type AnalyticsEvent } from './analytics.port';
import { newDepths, ScrollDepthTracker, type Depth } from './scroll-depth';
import {
  eventPayload,
  optedOut,
  VercelAnalytics,
  type AnalyticsWindow,
} from './vercel-analytics.adapter';

function fakeWindow(
  overrides: Partial<AnalyticsWindow['navigator']> = {},
  doNotTrack: string | null = null,
) {
  const timers: (() => void)[] = [];
  const win: AnalyticsWindow = {
    doNotTrack,
    navigator: { ...overrides },
    setTimeout: (callback) => timers.push(callback),
  };
  return { win, runTimers: () => timers.splice(0).forEach((callback) => callback()) };
}

describe('optedOut', () => {
  it('honours Do Not Track in all the places browsers put it, and Global Privacy Control', () => {
    expect(optedOut(fakeWindow({ doNotTrack: '1' }).win)).toBe(true);
    expect(optedOut(fakeWindow({ doNotTrack: 'yes' }).win)).toBe(true);
    expect(optedOut(fakeWindow({ msDoNotTrack: '1' }).win)).toBe(true);
    expect(optedOut(fakeWindow({}, '1').win)).toBe(true);
    expect(optedOut(fakeWindow({ globalPrivacyControl: true }).win)).toBe(true);
  });

  it('does not opt out when the signals are absent or say "allowed"', () => {
    expect(optedOut(fakeWindow().win)).toBe(false);
    expect(optedOut(fakeWindow({ doNotTrack: '0', globalPrivacyControl: false }).win)).toBe(false);
    expect(optedOut(fakeWindow({ doNotTrack: 'unspecified' }).win)).toBe(false);
  });
});

describe('eventPayload: what leaves the browser', () => {
  const cases: [AnalyticsEvent, ReturnType<typeof eventPayload>][] = [
    [{ name: 'cv_download' }, { name: 'cv_download' }],
    [
      { name: 'project_open', slug: 'ParkRabbit' },
      { name: 'project_open', data: { slug: 'ParkRabbit' } },
    ],
    [
      { name: 'contact_click', channel: 'email' },
      { name: 'contact_click', data: { channel: 'email' } },
    ],
    [
      { name: 'scroll_depth', depth: 75 },
      { name: 'scroll_depth', data: { depth: 75 } },
    ],
    [{ name: 'app_error' }, { name: 'app_error' }],
  ];

  it.each(cases)('%j', (event, payload) => {
    expect(eventPayload(event)).toEqual(payload);
  });

  it('only ever sends strings, numbers and booleans', () => {
    for (const [event] of cases) {
      for (const value of Object.values(eventPayload(event).data ?? {})) {
        expect(['string', 'number', 'boolean']).toContain(typeof value);
      }
    }
  });
});

describe('VercelAnalytics', () => {
  const setup = (overrides: Partial<AnalyticsWindow['navigator']> = {}) => {
    const { win, runTimers } = fakeWindow(overrides);
    const adapter = new VercelAnalytics(win, document);
    return { win, adapter, runTimers };
  };
  const scripts = () => [...document.head.querySelectorAll('script[src^="/_vercel/"]')];

  afterEach(() => scripts().forEach((script) => script.remove()));

  it('queues events from the very start, so nothing sent before the script loads is lost', () => {
    const { win, adapter } = setup();
    adapter.track({ name: 'cv_download' });
    adapter.track({ name: 'project_open', slug: 'x' });
    expect(win.vaq).toEqual([
      ['event', { name: 'cv_download' }],
      ['event', { name: 'project_open', data: { slug: 'x' } }],
    ]);
  });

  it('loads the analytics and speed-insights scripts from this site, once, when the browser is idle', () => {
    const { adapter, runTimers } = setup();
    adapter.start();
    expect(scripts()).toHaveLength(0); // not yet: the first paint comes first

    runTimers();
    expect(scripts().map((s) => s.getAttribute('src'))).toEqual([
      '/_vercel/insights/script.js',
      '/_vercel/speed-insights/script.js',
    ]);
    expect(scripts().every((s) => (s as HTMLScriptElement).defer)).toBe(true);

    adapter.start();
    runTimers();
    expect(scripts()).toHaveLength(2); // never added twice
  });

  it('prefers requestIdleCallback when the browser has it', () => {
    const { win, adapter } = setup();
    const idle = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    win.requestIdleCallback = idle;
    adapter.start();
    expect(idle).toHaveBeenCalledOnce();
    expect(scripts()).toHaveLength(2);
  });

  it('does nothing at all for a visitor who sent Do Not Track or Global Privacy Control', () => {
    const { win, adapter, runTimers } = setup({ doNotTrack: '1' });
    adapter.start();
    runTimers();
    adapter.track({ name: 'cv_download' });
    expect(scripts()).toHaveLength(0);
    expect(win.vaq).toBeUndefined();

    const gpc = setup({ globalPrivacyControl: true });
    gpc.adapter.track({ name: 'cv_download' });
    expect(gpc.win.vaq).toBeUndefined();
  });
});

describe('newDepths', () => {
  const none = new Set<Depth>();

  it('reports each threshold as the bottom of the viewport reaches it', () => {
    // A 4000 px page seen through an 800 px window: the bottom edge is at 800 + scrollTop.
    expect(newDepths(0, 800, 4000, none)).toEqual([]); // 20 percent
    expect(newDepths(300, 800, 4000, none)).toEqual([25]);
    expect(newDepths(1200, 800, 4000, none)).toEqual([25, 50]);
    expect(newDepths(3200, 800, 4000, none)).toEqual([25, 50, 75, 100]);
  });

  it('does not report a threshold twice', () => {
    expect(newDepths(1200, 800, 4000, new Set<Depth>([25]))).toEqual([50]);
    expect(newDepths(3200, 800, 4000, new Set<Depth>([25, 50, 75, 100]))).toEqual([]);
  });

  it('ignores pages that barely scroll, and an unusable viewport', () => {
    expect(newDepths(0, 800, 800, none)).toEqual([]);
    expect(newDepths(0, 800, 900, none)).toEqual([]);
    expect(newDepths(0, 0, 4000, none)).toEqual([]);
  });
});

describe('ScrollDepthTracker', () => {
  const setup = () => {
    const track = vi.fn<(event: AnalyticsEvent) => void>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AnalyticsPort, useValue: { track } },
      ],
    });
    const tracker = TestBed.inject(ScrollDepthTracker);
    tracker.start();
    return { tracker, track };
  };

  let scroll = { y: 0, inner: 800, page: 4000 };
  beforeEach(() => {
    scroll = { y: 0, inner: 800, page: 4000 };
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scroll.y });
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => scroll.inner });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => scroll.page,
    });
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      callback();
      return 1;
    });
    window.requestAnimationFrame = globalThis.requestAnimationFrame;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reports depths as the visitor scrolls, once each, and again on the next page', async () => {
    const { track } = setup();
    scroll.y = 300;
    window.dispatchEvent(new Event('scroll'));
    scroll.y = 1300;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll')); // no change: nothing new
    expect(track.mock.calls.map(([event]) => event)).toEqual([
      { name: 'scroll_depth', depth: 25 },
      { name: 'scroll_depth', depth: 50 },
    ]);

    track.mockClear();
    await TestBed.inject(Router).navigateByUrl('/another-page');
    window.dispatchEvent(new Event('scroll'));
    expect(track.mock.calls.map(([event]) => event)).toEqual([
      { name: 'scroll_depth', depth: 25 },
      { name: 'scroll_depth', depth: 50 },
    ]);
  });
});
