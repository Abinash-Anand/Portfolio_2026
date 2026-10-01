import type { EndpointId } from '../core/experience';
import { MOTION } from '../core/design/tokens';
import { nextEndpoint } from './endpoints';

/**
 * The journey state machine: pure TypeScript, no Angular, no timers, no side effects.
 * It is the single driver of the experience (it replaces scroll; ARCHITECTURE.md S2), and everything that
 * reacts to it (HUD, scene, audio, analytics) observes the state it produces.
 *
 *   boot -> console -> journey -> room -> (journey | console)       standard2d is reachable from every state
 *   `open` jumps to a room from anywhere (deep links, history); `leave` returns from a room to the console
 */

export type BaseState =
  | { readonly kind: 'boot' }
  | { readonly kind: 'console' }
  | { readonly kind: 'journey'; readonly endpoint: EndpointId; readonly fast: boolean }
  | { readonly kind: 'room'; readonly endpoint: EndpointId };

export type JourneyState = BaseState | { readonly kind: 'standard2d'; readonly resume: BaseState };

export interface JourneyContext {
  readonly state: JourneyState;
  /** Endpoints already reached, so repeat journeys can be shorter (CONCEPT.md A2). */
  readonly visited: readonly EndpointId[];
}

/** `instant` skips the travelling and lands in the room directly (reduced motion). */
export type JourneyEvent =
  | { readonly type: 'enter' }
  | { readonly type: 'select'; readonly endpoint: EndpointId; readonly instant?: boolean }
  | { readonly type: 'arrive' }
  | { readonly type: 'skip' }
  | { readonly type: 'rerun'; readonly instant?: boolean }
  | { readonly type: 'next'; readonly instant?: boolean }
  | { readonly type: 'console' }
  /** The address bar or a history entry names a room: go straight there, with no journey (a deep link). */
  | { readonly type: 'open'; readonly endpoint: EndpointId }
  /** History went back out of a room, to the console. */
  | { readonly type: 'leave' }
  | { readonly type: 'toggle2d' };

export const INITIAL_CONTEXT: JourneyContext = { state: { kind: 'boot' }, visited: [] };

function arriveAt(ctx: JourneyContext, endpoint: EndpointId): JourneyContext {
  return {
    state: { kind: 'room', endpoint },
    visited: ctx.visited.includes(endpoint) ? ctx.visited : [...ctx.visited, endpoint],
  };
}

function travelTo(
  ctx: JourneyContext,
  endpoint: EndpointId,
  instant: boolean | undefined,
): JourneyContext {
  if (instant) return arriveAt(ctx, endpoint);
  return { ...ctx, state: { kind: 'journey', endpoint, fast: ctx.visited.includes(endpoint) } };
}

/**
 * The transition function. Events that make no sense in the current state return the SAME context
 * object (never throw), so callers can detect "nothing happened" with `===`.
 */
export function reduce(ctx: JourneyContext, event: JourneyEvent): JourneyContext {
  const state = ctx.state;

  if (state.kind === 'standard2d') {
    return event.type === 'toggle2d' ? { ...ctx, state: state.resume } : ctx;
  }

  if (event.type === 'toggle2d') {
    // Leaving mid-journey returns to the console rather than to a journey that kept running.
    const resume: BaseState = state.kind === 'journey' ? { kind: 'console' } : state;
    return { ...ctx, state: { kind: 'standard2d', resume } };
  }

  switch (state.kind) {
    case 'boot':
      if (event.type === 'open') return arriveAt(ctx, event.endpoint);
      return event.type === 'enter' ? { ...ctx, state: { kind: 'console' } } : ctx;

    case 'console':
      if (event.type === 'open') return arriveAt(ctx, event.endpoint);
      return event.type === 'select' ? travelTo(ctx, event.endpoint, event.instant) : ctx;

    case 'journey':
      if (event.type === 'open') return arriveAt(ctx, event.endpoint);
      if (event.type === 'leave') return { ...ctx, state: { kind: 'console' } };
      return event.type === 'arrive' || event.type === 'skip' ? arriveAt(ctx, state.endpoint) : ctx;

    case 'room':
      switch (event.type) {
        case 'rerun':
          return event.instant
            ? ctx
            : { ...ctx, state: { kind: 'journey', endpoint: state.endpoint, fast: true } };
        case 'next':
          return travelTo(ctx, nextEndpoint(state.endpoint), event.instant);
        case 'console':
        case 'leave':
          return { ...ctx, state: { kind: 'console' } };
        case 'open':
          return event.endpoint === state.endpoint ? ctx : arriveAt(ctx, event.endpoint);
        default:
          return ctx;
      }
  }
}

/** How long a journey takes. Reduced motion has no journey at all. */
export function journeyDurationMs(
  state: Extract<BaseState, { kind: 'journey' }>,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return MOTION.journeyMs.reduced;
  return state.fast ? MOTION.journeyMs.repeat : MOTION.journeyMs.first;
}

/** The endpoint a state is about, if any. */
export function endpointOf(state: JourneyState): EndpointId | null {
  const base = state.kind === 'standard2d' ? state.resume : state;
  return base.kind === 'journey' || base.kind === 'room' ? base.endpoint : null;
}
