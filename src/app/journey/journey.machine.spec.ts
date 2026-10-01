import { ENDPOINT_IDS, type EndpointId } from '../core/experience';
import { MOTION } from '../core/design/tokens';
import {
  endpointOf,
  INITIAL_CONTEXT,
  journeyDurationMs,
  reduce,
  type JourneyContext,
  type JourneyEvent,
} from './journey.machine';

const run = (events: JourneyEvent[], from: JourneyContext = INITIAL_CONTEXT): JourneyContext =>
  events.reduce(reduce, from);

const inConsole = run([{ type: 'enter' }]);

describe('journey machine', () => {
  it('starts at boot, and the headset click enters the console', () => {
    expect(INITIAL_CONTEXT.state.kind).toBe('boot');
    expect(reduce(INITIAL_CONTEXT, { type: 'enter' }).state.kind).toBe('console');
  });

  it('travels from the console to an endpoint, arriving in its room', () => {
    const travelling = reduce(inConsole, { type: 'select', endpoint: 'skills' });
    expect(travelling.state).toEqual({ kind: 'journey', endpoint: 'skills', fast: false });

    const arrived = reduce(travelling, { type: 'arrive' });
    expect(arrived.state).toEqual({ kind: 'room', endpoint: 'skills' });
    expect(arrived.visited).toEqual(['skills']);
  });

  it('skipping a journey lands in the same room as arriving', () => {
    const travelling = reduce(inConsole, { type: 'select', endpoint: 'about' });
    expect(reduce(travelling, { type: 'skip' }).state).toEqual(
      reduce(travelling, { type: 'arrive' }).state,
    );
  });

  it('makes repeat journeys fast (CONCEPT.md A2)', () => {
    const first = run([{ type: 'select', endpoint: 'about' }, { type: 'arrive' }], inConsole);
    const again = reduce(first, { type: 'rerun' });
    expect(again.state).toEqual({ kind: 'journey', endpoint: 'about', fast: true });

    const back = run([{ type: 'console' }, { type: 'select', endpoint: 'about' }], first);
    expect(back.state).toEqual({ kind: 'journey', endpoint: 'about', fast: true });
  });

  it('routes to the next endpoint in console order, wrapping at the end', () => {
    const inAbout = run([{ type: 'select', endpoint: 'about' }, { type: 'arrive' }], inConsole);
    expect(endpointOf(reduce(inAbout, { type: 'next' }).state)).toBe('education');

    const inLast = run([{ type: 'select', endpoint: 'experience' }, { type: 'arrive' }], inConsole);
    expect(endpointOf(reduce(inLast, { type: 'next' }).state)).toBe('about');
  });

  it('records each endpoint once in `visited`', () => {
    const ctx = run(
      [
        { type: 'select', endpoint: 'about' },
        { type: 'arrive' },
        { type: 'rerun' },
        { type: 'arrive' },
        { type: 'next' },
        { type: 'arrive' },
      ],
      inConsole,
    );
    expect(ctx.visited).toEqual(['about', 'education']);
  });

  it('goes straight to the room, with no journey, when `instant` (reduced motion)', () => {
    expect(
      reduce(inConsole, { type: 'select', endpoint: 'projects', instant: true }).state,
    ).toEqual({
      kind: 'room',
      endpoint: 'projects',
    });
    const inAbout = run([{ type: 'select', endpoint: 'about', instant: true }], inConsole);
    expect(reduce(inAbout, { type: 'next', instant: true }).state).toEqual({
      kind: 'room',
      endpoint: 'education',
    });
    expect(reduce(inAbout, { type: 'rerun', instant: true })).toBe(inAbout);
  });

  it('returns from a room to the console', () => {
    const inRoom = run([{ type: 'select', endpoint: 'about', instant: true }], inConsole);
    expect(reduce(inRoom, { type: 'console' }).state.kind).toBe('console');
  });

  describe('the 2D resume toggle', () => {
    it.each([
      ['boot', INITIAL_CONTEXT, 'boot'],
      ['console', inConsole, 'console'],
      ['a room', run([{ type: 'select', endpoint: 'skills', instant: true }], inConsole), 'room'],
    ] as const)('works from %s and returns to it', (_name, start, kind) => {
      const in2d = reduce(start, { type: 'toggle2d' });
      expect(in2d.state.kind).toBe('standard2d');
      expect(reduce(in2d, { type: 'toggle2d' }).state).toEqual(start.state);
      expect(start.state.kind).toBe(kind);
    });

    it('returns to the console, not to a stale journey, when toggled mid-journey', () => {
      const travelling = reduce(inConsole, { type: 'select', endpoint: 'about' });
      const in2d = reduce(travelling, { type: 'toggle2d' });
      expect(reduce(in2d, { type: 'toggle2d' }).state.kind).toBe('console');
    });

    it('ignores every other event while in 2D', () => {
      const in2d = reduce(inConsole, { type: 'toggle2d' });
      for (const event of [
        { type: 'enter' },
        { type: 'select', endpoint: 'about' },
        { type: 'arrive' },
      ] as JourneyEvent[]) {
        expect(reduce(in2d, event)).toBe(in2d);
      }
    });
  });

  it('returns the SAME context object for events that make no sense, never throwing', () => {
    expect(reduce(INITIAL_CONTEXT, { type: 'select', endpoint: 'about' })).toBe(INITIAL_CONTEXT);
    expect(reduce(INITIAL_CONTEXT, { type: 'arrive' })).toBe(INITIAL_CONTEXT);
    expect(reduce(inConsole, { type: 'enter' })).toBe(inConsole);
    expect(reduce(inConsole, { type: 'skip' })).toBe(inConsole);
    expect(reduce(inConsole, { type: 'next' })).toBe(inConsole);
  });

  it('cannot reach an invalid state through any sequence of events (random walk)', () => {
    const events: JourneyEvent[] = [
      { type: 'enter' },
      { type: 'arrive' },
      { type: 'skip' },
      { type: 'rerun' },
      { type: 'next' },
      { type: 'console' },
      { type: 'toggle2d' },
      { type: 'rerun', instant: true },
      { type: 'next', instant: true },
      ...ENDPOINT_IDS.flatMap((endpoint): JourneyEvent[] => [
        { type: 'select', endpoint },
        { type: 'select', endpoint, instant: true },
      ]),
    ];
    let seed = 42;
    const random = (): number => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    let ctx = INITIAL_CONTEXT;
    for (let i = 0; i < 5000; i++) {
      ctx = reduce(ctx, events[Math.floor(random() * events.length)] as JourneyEvent);
      const state = ctx.state;
      expect(['boot', 'console', 'journey', 'room', 'standard2d']).toContain(state.kind);
      if (state.kind === 'journey' || state.kind === 'room')
        expect(ENDPOINT_IDS).toContain(state.endpoint);
      if (state.kind === 'standard2d') expect(state.resume.kind).not.toBe('journey');
      expect(new Set(ctx.visited).size).toBe(ctx.visited.length);
      ctx.visited.forEach((v: EndpointId) => expect(ENDPOINT_IDS).toContain(v));
    }
  });

  describe('deep links and history (CONCEPT.md A6)', () => {
    it('opens straight into a room from the boot screen or the console, with no journey', () => {
      for (const from of [INITIAL_CONTEXT, inConsole]) {
        const opened = reduce(from, { type: 'open', endpoint: 'skills' });
        expect(opened.state).toEqual({ kind: 'room', endpoint: 'skills' });
        expect(opened.visited).toEqual(['skills']);
      }
    });

    it('opens another room from a room, and does nothing when it is already there', () => {
      const inAbout = run([{ type: 'select', endpoint: 'about' }, { type: 'arrive' }], inConsole);
      expect(reduce(inAbout, { type: 'open', endpoint: 'projects' }).state).toEqual({
        kind: 'room',
        endpoint: 'projects',
      });
      expect(reduce(inAbout, { type: 'open', endpoint: 'about' })).toBe(inAbout);
    });

    it('lets a link override a journey in progress: the visitor arrives where the address says', () => {
      const travelling = reduce(inConsole, { type: 'select', endpoint: 'about' });
      expect(reduce(travelling, { type: 'open', endpoint: 'education' }).state).toEqual({
        kind: 'room',
        endpoint: 'education',
      });
    });

    it('leaves a room, or a journey, for the console, and does nothing elsewhere', () => {
      const inRoom = run([{ type: 'select', endpoint: 'about' }, { type: 'arrive' }], inConsole);
      expect(reduce(inRoom, { type: 'leave' }).state.kind).toBe('console');
      const travelling = reduce(inConsole, { type: 'select', endpoint: 'about' });
      expect(reduce(travelling, { type: 'leave' }).state.kind).toBe('console');
      expect(reduce(inConsole, { type: 'leave' })).toBe(inConsole);
      expect(reduce(INITIAL_CONTEXT, { type: 'leave' })).toBe(INITIAL_CONTEXT);
    });

    it('ignores the address while the 2D resume is showing', () => {
      const in2d = run([{ type: 'toggle2d' }], inConsole);
      expect(reduce(in2d, { type: 'open', endpoint: 'skills' })).toBe(in2d);
      expect(reduce(in2d, { type: 'leave' })).toBe(in2d);
    });

    it('a room reached by link makes the next visit there a fast one', () => {
      const linked = reduce(INITIAL_CONTEXT, { type: 'open', endpoint: 'about' });
      const back = run([{ type: 'console' }, { type: 'select', endpoint: 'about' }], linked);
      expect(back.state).toEqual({ kind: 'journey', endpoint: 'about', fast: true });
    });
  });

  it('is pure: it never mutates the context it is given', () => {
    const before = run([{ type: 'select', endpoint: 'about' }, { type: 'arrive' }], inConsole);
    const snapshot = JSON.stringify(before);
    reduce(before, { type: 'next' });
    reduce(before, { type: 'toggle2d' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('journeyDurationMs', () => {
  const journey = (fast: boolean) => ({ kind: 'journey', endpoint: 'about', fast }) as const;

  it('uses the first-visit and repeat caps from the design tokens', () => {
    expect(journeyDurationMs(journey(false), false)).toBe(MOTION.journeyMs.first);
    expect(journeyDurationMs(journey(true), false)).toBe(MOTION.journeyMs.repeat);
  });

  it('has no journey under reduced motion, and stays within the 3 to 4 second cap', () => {
    expect(journeyDurationMs(journey(false), true)).toBe(0);
    expect(MOTION.journeyMs.first).toBeLessThanOrEqual(4000);
    expect(MOTION.journeyMs.repeat).toBeLessThan(MOTION.journeyMs.first);
  });
});
