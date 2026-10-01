import { TestBed } from '@angular/core/testing';
import { AnalyticsPort, type AnalyticsEvent } from '../core/analytics/analytics.port';
import { MOTION } from '../core/design/tokens';
import { AudioService } from '../motion/audio/audio.service';
import { MotionService } from '../motion/motion.service';
import { JourneyService } from './journey.service';

function setup(reducedMotion = false, tier: 'high' | 'static' = 'high') {
  const track = vi.fn<(event: AnalyticsEvent) => void>();
  const audio = { unlock: vi.fn(), startHum: vi.fn(), play: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AnalyticsPort, useValue: { track } },
      { provide: AudioService, useValue: audio },
      {
        provide: MotionService,
        useValue: { reducedMotion: () => reducedMotion, tier: () => tier },
      },
    ],
  });
  return { service: TestBed.inject(JourneyService), track, audio };
}

describe('JourneyService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts at boot and enters the console on the headset click, unlocking audio from that gesture', () => {
    const { service, audio, track } = setup();
    expect(service.kind()).toBe('boot');
    service.enter();
    expect(service.kind()).toBe('console');
    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(audio.startHum).toHaveBeenCalledOnce();
    expect(audio.play).toHaveBeenCalledWith('lensLock');
    expect(track).toHaveBeenCalledWith({ name: 'journey_start' });
  });

  it('travels for the first-visit duration, then arrives on its own', () => {
    const { service, track } = setup();
    service.enter();
    service.select('about');
    expect(service.kind()).toBe('journey');
    expect(service.endpoint()).toBe('about');
    expect(track).toHaveBeenCalledWith({ name: 'endpoint_select', endpoint: 'about' });

    vi.advanceTimersByTime(MOTION.journeyMs.first - 1);
    expect(service.kind()).toBe('journey');
    vi.advanceTimersByTime(1);
    expect(service.kind()).toBe('room');
  });

  it('is shorter on a repeat journey', () => {
    const { service } = setup();
    service.enter();
    service.select('about');
    vi.advanceTimersByTime(MOTION.journeyMs.first);
    service.rerun();
    vi.advanceTimersByTime(MOTION.journeyMs.repeat);
    expect(service.kind()).toBe('room');
  });

  it('skips on demand and cancels the pending timer', () => {
    const { service, track } = setup();
    service.enter();
    service.select('skills');
    service.skip();
    expect(service.kind()).toBe('room');
    expect(track).toHaveBeenCalledWith({ name: 'journey_skip' });
    service.toConsole();
    vi.advanceTimersByTime(MOTION.journeyMs.first * 2); // the old timer must not fire
    expect(service.kind()).toBe('console');
  });

  it('has no journey under reduced motion: it lands in the room immediately', () => {
    const { service } = setup(true);
    service.enter();
    service.select('projects');
    expect(service.kind()).toBe('room');
    service.routeToNext();
    expect(service.endpoint()).toBe('experience');
    expect(service.kind()).toBe('room');
  });

  it('also skips travelling on the static tier (no WebGL: nothing to travel through)', () => {
    const { service } = setup(false, 'static');
    service.enter();
    service.select('about');
    expect(service.kind()).toBe('room');
  });

  it('exposes the next endpoint only while in a room', () => {
    const { service } = setup(true);
    service.enter();
    expect(service.next()).toBeNull();
    service.select('about');
    expect(service.next()?.id).toBe('education');
  });

  it('toggling the 2D resume mid-journey cancels travel and returns to the console', () => {
    const { service, track } = setup();
    service.enter();
    service.select('about');
    service.toggle2d();
    expect(service.kind()).toBe('standard2d');
    expect(track).toHaveBeenCalledWith({ name: 'resume_2d_toggle' });
    vi.advanceTimersByTime(MOTION.journeyMs.first * 2);
    expect(service.kind()).toBe('standard2d');
    service.toggle2d();
    expect(service.kind()).toBe('console');
  });

  it('has no side effects for events that do nothing', () => {
    const { service, track, audio } = setup();
    service.skip();
    service.rerun();
    service.routeToNext();
    expect(service.kind()).toBe('boot');
    expect(track).not.toHaveBeenCalled();
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('plays the cues for select and journey', () => {
    const { service, audio } = setup();
    service.enter();
    audio.play.mockClear();
    service.select('about');
    expect(audio.play).toHaveBeenCalledWith('pneumatic');
    expect(audio.play).toHaveBeenCalledWith('whoosh');
    vi.advanceTimersByTime(MOTION.journeyMs.first);
    expect(audio.play).toHaveBeenCalledWith('arrive');
  });

  it('reset() returns to boot and clears timers', () => {
    const { service } = setup();
    service.enter();
    service.select('about');
    service.reset();
    vi.advanceTimersByTime(MOTION.journeyMs.first * 2);
    expect(service.kind()).toBe('boot');
    expect(service.visited()).toEqual([]);
  });
});
