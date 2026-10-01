/**
 * Sound design as data (DESIGN.md section 10). Everything is synthesised with Web Audio, so the download
 * cost is zero. Recipes are plain objects so they can be reviewed, tuned and tested without a browser.
 */

export type SoundId = 'hover' | 'lensLock' | 'pneumatic' | 'whoosh' | 'arrive';

export interface SoundLayer {
  /** `osc` sweeps the oscillator frequency; `noise` sweeps the center of a filter over white noise. */
  readonly source: 'osc' | 'noise';
  readonly wave?: OscillatorType;
  /** Start and end of the frequency sweep, in Hz. */
  readonly from: number;
  readonly to: number;
  /** Peak gain (0 to 1) before the master gain. */
  readonly gain: number;
  readonly attackMs: number;
  readonly durationMs: number;
  readonly filter?: { readonly type: BiquadFilterType; readonly q: number };
}

export interface SoundRecipe {
  readonly layers: readonly SoundLayer[];
  /** Minimum time between two plays, so rapid hovering does not machine-gun the sound. */
  readonly minIntervalMs: number;
}

export const SOUNDS: Readonly<Record<SoundId, SoundRecipe>> = {
  // Short, dry mechanical tick.
  hover: {
    minIntervalMs: 70,
    layers: [
      {
        source: 'osc',
        wave: 'square',
        from: 1800,
        to: 900,
        gain: 0.05,
        attackMs: 2,
        durationMs: 28,
      },
      {
        source: 'noise',
        from: 6000,
        to: 3000,
        gain: 0.05,
        attackMs: 1,
        durationMs: 14,
        filter: { type: 'highpass', q: 0.7 },
      },
    ],
  },
  // Crisp optical snap: a bright burst plus a short body.
  lensLock: {
    minIntervalMs: 200,
    layers: [
      {
        source: 'noise',
        from: 3600,
        to: 2800,
        gain: 0.16,
        attackMs: 2,
        durationMs: 70,
        filter: { type: 'bandpass', q: 4 },
      },
      {
        source: 'osc',
        wave: 'sine',
        from: 1200,
        to: 300,
        gain: 0.12,
        attackMs: 2,
        durationMs: 130,
      },
    ],
  },
  // Heavy short thud with a low body.
  pneumatic: {
    minIntervalMs: 150,
    layers: [
      {
        source: 'noise',
        from: 900,
        to: 400,
        gain: 0.2,
        attackMs: 3,
        durationMs: 150,
        filter: { type: 'lowpass', q: 0.8 },
      },
      { source: 'osc', wave: 'sine', from: 90, to: 48, gain: 0.22, attackMs: 3, durationMs: 170 },
    ],
  },
  // Filtered noise sweep for the journey.
  whoosh: {
    minIntervalMs: 300,
    layers: [
      {
        source: 'noise',
        from: 300,
        to: 3200,
        gain: 0.2,
        attackMs: 250,
        durationMs: 900,
        filter: { type: 'bandpass', q: 1.2 },
      },
    ],
  },
  // Soft landing when a journey ends.
  arrive: {
    minIntervalMs: 200,
    layers: [
      { source: 'osc', wave: 'sine', from: 440, to: 330, gain: 0.07, attackMs: 8, durationMs: 220 },
      {
        source: 'noise',
        from: 2400,
        to: 1200,
        gain: 0.05,
        attackMs: 4,
        durationMs: 90,
        filter: { type: 'bandpass', q: 2 },
      },
    ],
  },
};

/** The ambient low-frequency hum: two slightly detuned sines. */
export const HUM = {
  frequencies: [55, 55.7] as const,
  gain: 0.045,
  fadeMs: 800,
};

/** Overall level; the HUD toggle sets the master gain to 0 or this. */
export const MASTER_GAIN = 0.5;
