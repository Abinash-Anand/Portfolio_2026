import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AnalyticsPort } from '../core/analytics/analytics.port';
import { AudioService } from '../motion/audio/audio.service';
import { MotionService } from '../motion/motion.service';
import { endpointInfo, nextEndpoint } from './endpoints';
import {
  endpointOf,
  INITIAL_CONTEXT,
  journeyDurationMs,
  reduce,
  type JourneyContext,
  type JourneyEvent,
} from './journey.machine';

/**
 * Runs the journey state machine and wires its side effects: the travel timer, audio cues and analytics.
 * Components read the signals and call the methods; they never touch the machine directly.
 * (Coarse state only: per-frame work lives in the scene, not here.)
 */
@Injectable({ providedIn: 'root' })
export class JourneyService {
  private readonly motion = inject(MotionService);
  private readonly audio = inject(AudioService);
  private readonly analytics = inject(AnalyticsPort);

  private readonly context = signal<JourneyContext>(INITIAL_CONTEXT);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** No travelling: reduced motion, or no 3D to travel through (static tier). */
  private readonly instant = computed(
    () => this.motion.reducedMotion() || this.motion.tier() === 'static',
  );

  readonly state = computed(() => this.context().state);
  readonly visited = computed(() => this.context().visited);
  readonly kind = computed(() => this.state().kind);
  readonly endpoint = computed(() => endpointOf(this.state()));
  /** The endpoint "route to next" would go to, while in a room. */
  readonly next = computed(() => {
    const state = this.state();
    return state.kind === 'room' ? endpointInfo(nextEndpoint(state.endpoint)) : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  enter(): void {
    // Called from a click, so this is the user gesture that lets audio start (it stays muted until opted in).
    this.audio.unlock();
    this.dispatch({ type: 'enter' });
  }

  select(endpoint: Parameters<typeof endpointInfo>[0]): void {
    this.dispatch({ type: 'select', endpoint, instant: this.instant() });
  }

  skip(): void {
    this.dispatch({ type: 'skip' });
  }

  rerun(): void {
    this.dispatch({ type: 'rerun', instant: this.instant() });
  }

  routeToNext(): void {
    this.dispatch({ type: 'next', instant: this.instant() });
  }

  toConsole(): void {
    this.dispatch({ type: 'console' });
  }

  toggle2d(): void {
    this.dispatch({ type: 'toggle2d' });
  }

  /** Back to the boot screen (used when the page is left and re-entered). */
  reset(): void {
    this.clearTimer();
    this.context.set(INITIAL_CONTEXT);
  }

  /** Audio cue for hovering an interactive control. */
  cueHover(): void {
    this.audio.play('hover');
  }

  private dispatch(event: JourneyEvent): void {
    const before = this.context();
    const after = reduce(before, event);
    if (after === before) return; // nothing happened: no side effects

    this.context.set(after);
    this.clearTimer();
    this.sideEffects(before, after, event);

    const state = after.state;
    if (state.kind === 'journey') {
      const ms = journeyDurationMs(state, this.instant());
      this.timer = setTimeout(() => this.dispatch({ type: 'arrive' }), ms);
    }
  }

  private sideEffects(before: JourneyContext, after: JourneyContext, event: JourneyEvent): void {
    switch (event.type) {
      case 'enter':
        this.audio.startHum();
        this.audio.play('lensLock');
        this.analytics.track({ name: 'journey_start' });
        break;
      case 'select':
      case 'next':
      case 'rerun': {
        const target = endpointOf(after.state);
        this.audio.play('pneumatic');
        if (after.state.kind === 'journey') this.audio.play('whoosh');
        if (target && event.type !== 'rerun')
          this.analytics.track({ name: 'endpoint_select', endpoint: target });
        break;
      }
      case 'arrive':
        this.audio.play('arrive');
        break;
      case 'skip':
        this.audio.play('arrive');
        this.analytics.track({ name: 'journey_skip' });
        break;
      case 'toggle2d':
        if (after.state.kind === 'standard2d') this.analytics.track({ name: 'resume_2d_toggle' });
        break;
      default:
        break;
    }
    void before;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
