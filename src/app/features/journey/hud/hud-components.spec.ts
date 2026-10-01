import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ENDPOINTS } from '../../../journey/endpoints';
import { SceneRegistry } from '../../../scene/scene-registry';
import type { SceneHost } from '../../../scene/scene-host';
import { EndpointKeys } from './endpoint-keys.component';
import { Hud } from './hud.component';
import { TelemetryMonitor } from './telemetry-monitor.component';
import { Typewriter } from './typewriter.component';

const text = (el: Element): string => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('Typewriter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(Typewriter);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    // Subscribe BEFORE the first change detection, exactly as an `(finished)` template binding does.
    const finished = vi.fn();
    fixture.componentInstance.finished.subscribe(finished);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, finished };
  }
  const visible = (el: HTMLElement): string => el.querySelector('pre')?.textContent ?? '';

  it('types the text out character by character', () => {
    const { fixture, el, finished } = render({ lines: ['AB', 'C'], speedMs: 10 });
    expect(visible(el)).toBe('');
    vi.advanceTimersByTime(20);
    fixture.detectChanges();
    expect(visible(el)).toBe('AB');
    vi.advanceTimersByTime(20);
    fixture.detectChanges();
    expect(visible(el)).toBe('AB\nC');
    expect(fixture.componentInstance.done()).toBe(true);
    expect(finished).toHaveBeenCalledOnce();
  });

  it('keeps the FULL text in the DOM for screen readers and hides the animated copy from them', () => {
    const { el } = render({ lines: ['SYSTEM STATUS: ONLINE'], speedMs: 10 });
    expect(el.querySelector('p.sr-only')?.textContent).toBe('SYSTEM STATUS: ONLINE');
    expect(el.querySelector('pre')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows everything at once when instant (reduced motion), without waiting', () => {
    const { fixture, el, finished } = render({ lines: ['one', 'two'], instant: true });
    fixture.detectChanges();
    expect(visible(el)).toBe('one\ntwo');
    expect(finished).toHaveBeenCalledOnce();
  });

  it('can be completed early (skip)', () => {
    const { fixture, el } = render({ lines: ['hello world'], speedMs: 100 });
    fixture.componentInstance.complete();
    fixture.detectChanges();
    expect(visible(el)).toBe('hello world');
  });

  it('stops its timer when destroyed', () => {
    const { fixture } = render({ lines: ['abcdef'], speedMs: 10 });
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('EndpointKeys', () => {
  function render(disabled = false) {
    const fixture = TestBed.createComponent(EndpointKeys);
    fixture.componentRef.setInput('endpoints', ENDPOINTS);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    const selected = vi.fn();
    const hovered = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    fixture.componentInstance.hovered.subscribe(hovered);
    return { el: fixture.nativeElement as HTMLElement, selected, hovered };
  }

  it('renders the five keycaps as real buttons with the exact labels', () => {
    const { el } = render();
    const buttons = [...el.querySelectorAll('button')];
    expect(buttons).toHaveLength(5);
    expect(text(buttons[0]!)).toContain('[ GET /api/v1/about ]');
    expect(text(buttons[0]!)).toContain('Origin & Core Identity');
    expect(text(buttons[4]!)).toContain('[ GET /api/v1/experience ]');
    expect(buttons.every((b) => b.getAttribute('type') === 'button')).toBe(true);
  });

  it('emits the endpoint on click, and which key is looked at on hover', () => {
    const { el, selected, hovered } = render();
    const skills = el.querySelectorAll('button')[2] as HTMLButtonElement;
    skills.dispatchEvent(new Event('mouseenter'));
    skills.click();
    expect(hovered).toHaveBeenCalledExactlyOnceWith('skills');
    expect(selected).toHaveBeenCalledExactlyOnceWith('skills');
  });

  it('reports a key that gets keyboard focus the same way, so tabbing prepares its room', () => {
    const { el, hovered } = render();
    (el.querySelectorAll('button')[3] as HTMLButtonElement).dispatchEvent(new Event('focus'));
    expect(hovered).toHaveBeenCalledExactlyOnceWith('projects');
  });

  it('marks only the first key for autofocus and can be disabled', () => {
    const { el } = render(true);
    const buttons = [...el.querySelectorAll('button')];
    expect(buttons.filter((b) => b.hasAttribute('data-autofocus'))).toHaveLength(1);
    expect(buttons[0]?.hasAttribute('data-autofocus')).toBe(true);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});

describe('TelemetryMonitor', () => {
  it('shows the request lines for its endpoint and labels them SIMULATED', () => {
    const fixture = TestBed.createComponent(TelemetryMonitor);
    fixture.componentRef.setInput('endpoint', 'skills');
    fixture.componentRef.setInput('instant', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(text(el)).toContain('SIMULATED');
    expect(text(el)).toContain('>>> TARGET: api.abinash.dev/v1/skills');
    expect(el.querySelector('section')?.getAttribute('aria-label')).toContain('simulated');
  });
});

describe('Hud', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render() {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'resume', children: [] }])],
    });
    const fixture = TestBed.createComponent(Hud);
    fixture.componentRef.setInput('audioLabel', 'AUDIO: OFF');
    fixture.componentRef.setInput('audioOn', false);
    fixture.componentRef.setInput('graphicsLabel', 'AUTO · HIGH');
    fixture.detectChanges();
    const outputs = {
      audio: vi.fn(),
      graphics: vi.fn(),
      resume: vi.fn(),
      cue: vi.fn(),
    };
    fixture.componentInstance.audioToggle.subscribe(outputs.audio);
    fixture.componentInstance.graphicsCycle.subscribe(outputs.graphics);
    fixture.componentInstance.resume2d.subscribe(outputs.resume);
    fixture.componentInstance.cue.subscribe(outputs.cue);
    return { fixture, el: fixture.nativeElement as HTMLElement, outputs };
  }

  it('always offers the standard 2D resume as a real link to /resume (from the first frame)', () => {
    const { el, outputs } = render();
    const link = el.querySelector('a[href="/resume"]') as HTMLAnchorElement;
    expect(text(link)).toContain('Standard 2D resume');
    link.click();
    expect(outputs.resume).toHaveBeenCalledOnce();
  });

  it('exposes audio and graphics as labelled buttons with a pressed state', () => {
    const { el, outputs } = render();
    const [audio, graphics] = [...el.querySelectorAll('button')];
    expect(text(audio!)).toBe('[ AUDIO: OFF ]');
    expect(audio?.getAttribute('aria-pressed')).toBe('false');
    expect(text(graphics!)).toBe('[ GRAPHICS: AUTO · HIGH ]');
    audio?.click();
    graphics?.click();
    expect(outputs.audio).toHaveBeenCalledOnce();
    expect(outputs.graphics).toHaveBeenCalledOnce();
  });

  it('shows the identity line as fixed theatre and hides decorative readouts from assistive tech', () => {
    const { el } = render();
    expect(text(el)).toContain('IP: 127.0.0.1 | LOCATION: STUTTGART, GERMANY');
    expect(
      el.querySelector('[aria-hidden="true"].hud-label, div[aria-hidden="true"]'),
    ).toBeTruthy();
  });

  it('PULLS live FPS and engine from the scene twice a second, and shows placeholders without one', () => {
    const { fixture, el } = render();
    expect(text(el)).toContain('FPS: -- | LATENCY: SIM | ENGINE: NONE');

    const host = {
      stats: () => ({ engine: 'CANVAS-2D', fps: 72, frameMs: 13.9, drawCalls: 5, triangles: 0 }),
    } as unknown as SceneHost;
    TestBed.inject(SceneRegistry).register(host);
    vi.advanceTimersByTime(500);
    fixture.detectChanges();
    expect(text(el)).toContain('FPS: 72 | LATENCY: SIM | ENGINE: CANVAS-2D');
  });

  it('stops polling when destroyed', () => {
    const { fixture } = render();
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
