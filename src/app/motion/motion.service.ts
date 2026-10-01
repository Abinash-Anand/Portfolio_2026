import { computed, DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { probeCapabilities, type Capabilities, type ProbeEnvironment } from './capabilities';
import { detectTier, TIERS, type Tier, type TierChoice } from './tier';

function browserEnvironment(): ProbeEnvironment | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  return {
    matchMedia: (query) => window.matchMedia(query),
    navigator: navigator as ProbeEnvironment['navigator'],
    createCanvas: () => document.createElement('canvas'),
  };
}

/** How capabilities are probed. Overridable in tests. */
export const CAPABILITY_PROBE = new InjectionToken<() => Capabilities>('CAPABILITY_PROBE', {
  providedIn: 'root',
  factory: () => () => probeCapabilities(browserEnvironment()),
});

/**
 * Motion and quality state as signals: reduced motion, device capabilities, and the effective quality tier.
 * Coarse state only: per-frame values never go through here (ARCHITECTURE.md S3).
 *
 * Effective tier = the user's explicit choice, else the governor's runtime correction, else the detected tier.
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly probe = inject(CAPABILITY_PROBE);

  // No signal dependencies: evaluated once, on first read, so the (cheap but not free) probe only runs
  // when the experience actually mounts.
  private readonly probed = computed(() => this.probe());

  private readonly reducedMotionState = signal<boolean | null>(null);
  private readonly choice = signal<TierChoice>('auto');
  private readonly governor = signal<Tier | null>(null);
  private readonly failed = signal(false);

  /** Live `prefers-reduced-motion`. */
  readonly reducedMotion = computed(() => this.reducedMotionState() ?? this.probed().reducedMotion);

  readonly capabilities = computed<Capabilities>(() => ({
    ...this.probed(),
    reducedMotion: this.reducedMotion(),
  }));

  /** What the device suggests, before any user choice or runtime correction. */
  readonly detectedTier = computed(() => detectTier(this.capabilities()));

  readonly userChoice = this.choice.asReadonly();

  /** The tier the scene should render at. */
  readonly tier = computed<Tier>(() => {
    // WebGL failed or its context was lost: show the 2D page until the visitor explicitly retries.
    if (this.failed()) return 'static';
    const choice = this.choice();
    return choice !== 'auto' ? choice : (this.governor() ?? this.detectedTier());
  });

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = (): void => this.reducedMotionState.set(query.matches);
      update();
      query.addEventListener?.('change', update);
      inject(DestroyRef).onDestroy(() => query.removeEventListener?.('change', update));
    }
  }

  setChoice(choice: TierChoice): void {
    this.choice.set(choice);
    this.governor.set(null);
    this.failed.set(false); // choosing graphics again is an explicit retry
  }

  /** The 3D world cannot run (no context, or it was lost): fall back to the 2D experience. */
  fallBackToStatic(): void {
    this.failed.set(true);
  }

  /** auto -> high -> medium -> low -> static -> auto (the HUD graphics button). */
  cycleChoice(): void {
    const order: readonly TierChoice[] = ['auto', ...TIERS];
    this.setChoice(order[(order.indexOf(this.choice()) + 1) % order.length] ?? 'auto');
  }

  /** Called by the adaptive-quality governor when it changes the tier. Ignored while the user forces a tier. */
  reportGovernorTier(tier: Tier): void {
    if (this.choice() === 'auto') this.governor.set(tier);
  }
}
