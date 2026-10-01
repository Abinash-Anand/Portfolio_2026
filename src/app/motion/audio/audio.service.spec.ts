import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY, AudioService } from './audio.service';
import { HUM, SOUNDS, type SoundId } from './sounds';

/** A recording stand-in for the Web Audio API: just enough surface for AudioService. */
function fakeAudioContext() {
  const created = {
    oscillators: [] as { started: boolean; stopped: boolean }[],
    bufferSources: 0,
    filters: 0,
    gains: 0,
  };
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: vi.fn() });
  const context = {
    currentTime: 0,
    sampleRate: 100,
    destination: node(),
    resume: vi.fn(() => Promise.resolve()),
    createGain: () => {
      created.gains++;
      return { ...node(), gain: param() };
    },
    createOscillator: () => {
      const record = { started: false, stopped: false };
      created.oscillators.push(record);
      return {
        ...node(),
        type: 'sine',
        frequency: param(),
        start: () => (record.started = true),
        stop: () => (record.stopped = true),
      };
    },
    createBufferSource: () => {
      created.bufferSources++;
      return { ...node(), buffer: null, loop: false, start: vi.fn(), stop: vi.fn() };
    },
    createBiquadFilter: () => {
      created.filters++;
      return { ...node(), type: 'bandpass', Q: { value: 1 }, frequency: param() };
    },
    createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
  };
  return { context: context as unknown as AudioContext, raw: context, created };
}

function setup(factory?: () => AudioContext | null) {
  const fake = fakeAudioContext();
  TestBed.configureTestingModule({
    providers: [{ provide: AUDIO_CONTEXT_FACTORY, useValue: factory ?? (() => fake.context) }],
  });
  return { service: TestBed.inject(AudioService), fake };
}

describe('AudioService', () => {
  it('is muted and locked by default, and plays nothing', () => {
    const { service, fake } = setup();
    expect(service.muted()).toBe(true);
    expect(service.unlocked()).toBe(false);
    service.play('lensLock');
    expect(fake.created.oscillators).toHaveLength(0);
    expect(fake.created.bufferSources).toBe(0);
  });

  it('stays silent after unlocking until the user unmutes (sound is opt-in)', () => {
    const { service, fake } = setup();
    service.unlock();
    expect(service.unlocked()).toBe(true);
    expect(fake.raw.resume).toHaveBeenCalled();
    service.play('lensLock');
    expect(fake.created.oscillators).toHaveLength(0);
  });

  it('toggle() unlocks and unmutes, and labels the button for the next action', () => {
    const { service } = setup();
    expect(service.label()).toBe('AUDIO: OFF');
    service.toggle();
    expect(service.unlocked()).toBe(true);
    expect(service.muted()).toBe(false);
    expect(service.label()).toBe('AUDIO: ON');
    service.toggle();
    expect(service.muted()).toBe(true);
  });

  it.each(Object.keys(SOUNDS) as SoundId[])(
    'plays "%s" by building one graph per layer and starting it',
    (id) => {
      const { service, fake } = setup();
      service.toggle(); // unlock + unmute
      const before = fake.created.gains;
      service.play(id);
      const layers = SOUNDS[id].layers;
      expect(fake.created.gains - before).toBe(layers.length);
      expect(fake.created.oscillators.filter((o) => o.started)).toHaveLength(
        layers.filter((l) => l.source === 'osc').length,
      );
      expect(fake.created.bufferSources).toBe(layers.filter((l) => l.source === 'noise').length);
    },
  );

  it('throttles a sound that is triggered faster than its minimum interval', () => {
    const { service, fake } = setup();
    service.toggle();
    service.play('hover');
    const count = fake.created.oscillators.length;
    service.play('hover'); // immediately again
    expect(fake.created.oscillators).toHaveLength(count);
  });

  it('runs the hum only while unmuted, and fades it out when muted or stopped', () => {
    const { service, fake } = setup();
    service.toggle(); // unlocked, unmuted
    service.startHum();
    expect(fake.created.oscillators.filter((o) => o.started)).toHaveLength(HUM.frequencies.length);

    service.setMuted(true);
    expect(fake.created.oscillators.every((o) => o.stopped)).toBe(true);

    // unmuting resumes a hum that is still wanted
    service.setMuted(false);
    expect(fake.created.oscillators).toHaveLength(HUM.frequencies.length * 2);

    service.stopHum();
    expect(fake.created.oscillators.every((o) => o.stopped)).toBe(true);
  });

  it('does not start a hum while muted, but remembers that it is wanted', () => {
    const { service, fake } = setup();
    service.unlock();
    service.startHum();
    expect(fake.created.oscillators).toHaveLength(0);
    service.setMuted(false);
    expect(fake.created.oscillators).toHaveLength(HUM.frequencies.length);
  });

  it('degrades silently where Web Audio is unavailable', () => {
    const { service } = setup(() => null);
    expect(() => {
      service.toggle();
      service.play('whoosh');
      service.startHum();
    }).not.toThrow();
    expect(service.unlocked()).toBe(false);
  });
});

describe('sound recipes', () => {
  it.each(Object.entries(SOUNDS))('"%s" is short, quiet and well-formed', (_id, recipe) => {
    expect(recipe.layers.length).toBeGreaterThan(0);
    for (const layer of recipe.layers) {
      expect(layer.gain).toBeGreaterThan(0);
      expect(layer.gain).toBeLessThanOrEqual(0.25); // headroom: layers sum below clipping
      expect(layer.attackMs).toBeLessThan(layer.durationMs);
      expect(layer.durationMs).toBeLessThanOrEqual(1000);
      expect(layer.from).toBeGreaterThan(0);
      expect(layer.to).toBeGreaterThan(0); // exponential ramps cannot reach 0
    }
  });
});
