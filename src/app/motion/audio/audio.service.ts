import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { HUM, MASTER_GAIN, SOUNDS, type SoundId, type SoundLayer } from './sounds';

/** Creates the AudioContext. Null where Web Audio is unavailable. Overridable in tests. */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext | null>(
  'AUDIO_CONTEXT_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => {
      if (typeof window === 'undefined') return null;
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return Ctor ? new Ctor() : null;
    },
  },
);

/**
 * Procedural audio with a strict policy (DESIGN.md section 10):
 *  - nothing plays until a user gesture unlocks the audio context (browsers require it anyway);
 *  - it is MUTED by default, even after unlocking: sound is opt-in;
 *  - the mute state lives in memory only (no storage, no cookies).
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly createContext = inject(AUDIO_CONTEXT_FACTORY);

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hum: { stop: () => void } | null = null;
  private humWanted = false;
  private readonly lastPlayed = new Map<SoundId, number>();

  private readonly mutedState = signal(true);
  private readonly unlockedState = signal(false);

  readonly muted = this.mutedState.asReadonly();
  readonly unlocked = this.unlockedState.asReadonly();
  /** Text for the HUD button. */
  readonly label = computed(() => (this.mutedState() ? 'AUDIO: OFF' : 'AUDIO: ON'));

  /** Call from a user gesture (a click or key press). Safe to call repeatedly. */
  unlock(): void {
    if (!this.context) {
      this.context = this.createContext();
      if (!this.context) return;
      this.master = this.context.createGain();
      this.master.gain.value = this.mutedState() ? 0 : MASTER_GAIN;
      this.master.connect(this.context.destination);
    }
    void this.context.resume?.();
    this.unlockedState.set(true);
  }

  setMuted(muted: boolean): void {
    this.mutedState.set(muted);
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, this.context.currentTime, 0.03);
    }
    if (muted) this.stopHumNodes();
    else if (this.humWanted) this.startHumNodes();
  }

  /** The HUD toggle. A click is a user gesture, so it also unlocks audio. */
  toggle(): void {
    this.unlock();
    this.setMuted(!this.mutedState());
  }

  play(id: SoundId): void {
    const ctx = this.context;
    if (!ctx || !this.master || this.mutedState()) return;

    const recipe = SOUNDS[id];
    const now = performance.now();
    const last = this.lastPlayed.get(id);
    if (last !== undefined && now - last < recipe.minIntervalMs) return;
    this.lastPlayed.set(id, now);

    for (const layer of recipe.layers) this.playLayer(ctx, this.master, layer);
  }

  /** Ambient hum on (it only sounds while unmuted). */
  startHum(): void {
    this.humWanted = true;
    if (!this.mutedState()) this.startHumNodes();
  }

  stopHum(): void {
    this.humWanted = false;
    this.stopHumNodes();
  }

  private playLayer(ctx: AudioContext, destination: AudioNode, layer: SoundLayer): void {
    const t = ctx.currentTime;
    const end = t + layer.durationMs / 1000;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(layer.gain, t + layer.attackMs / 1000);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(destination);

    if (layer.source === 'osc') {
      const osc = ctx.createOscillator();
      osc.type = layer.wave ?? 'sine';
      osc.frequency.setValueAtTime(layer.from, t);
      osc.frequency.exponentialRampToValueAtTime(layer.to, end);
      osc.connect(envelope);
      osc.start(t);
      osc.stop(end + 0.05);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = layer.filter?.type ?? 'bandpass';
    filter.Q.value = layer.filter?.q ?? 1;
    filter.frequency.setValueAtTime(layer.from, t);
    filter.frequency.exponentialRampToValueAtTime(layer.to, end);
    source.connect(filter);
    filter.connect(envelope);
    source.start(t);
    source.stop(end + 0.05);
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private startHumNodes(): void {
    const ctx = this.context;
    if (!ctx || !this.master || this.hum) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(HUM.gain, t + HUM.fadeMs / 1000);
    gain.connect(this.master);
    const oscillators = HUM.frequencies.map((frequency) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start(t);
      return osc;
    });
    this.hum = {
      stop: () => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, HUM.fadeMs / 4000);
        for (const osc of oscillators) osc.stop(now + HUM.fadeMs / 1000);
      },
    };
  }

  private stopHumNodes(): void {
    this.hum?.stop();
    this.hum = null;
  }
}
