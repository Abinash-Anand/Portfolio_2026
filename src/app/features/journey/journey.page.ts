import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE } from '../../content/profile';
import { AnalyticsPort } from '../../core/analytics/analytics.port';
import { SeoService } from '../../core/seo.service';
import { ShellService } from '../../core/shell.service';
import { ENDPOINTS, endpointInfo } from '../../journey/endpoints';
import { JourneyService } from '../../journey/journey.service';
import { BOOT_LINES, CONSOLE_PROMPT, RESPONSE_LINE, SIMULATED_TAG } from '../../journey/telemetry';
import { AudioService } from '../../motion/audio/audio.service';
import { MotionService } from '../../motion/motion.service';
import { BenchPanel } from '../../scene/bench/bench-panel.component';
import { DevOverlay } from '../../scene/dev-overlay.component';
import { SceneCanvas } from '../../scene/scene-canvas.component';
import type { RenderTier, SceneHover, SceneSnapshot } from '../../scene/scene-host';
import { SceneRegistry } from '../../scene/scene-registry';
import { EndpointKeys } from './hud/endpoint-keys.component';
import { Hud } from './hud/hud.component';
import { TelemetryMonitor } from './hud/telemetry-monitor.component';
import { Typewriter } from './hud/typewriter.component';

/**
 * The "Packet's Journey" experience, Phase 2 edition: the real state machine, HUD, audio, tiers and frame loop
 * running over a PLACEHOLDER scene (Spike 0 replaces the scene with Three.js). Preview route, not indexed.
 */
@Component({
  selector: 'app-journey-page',
  imports: [
    BenchPanel,
    DevOverlay,
    EndpointKeys,
    Hud,
    RouterLink,
    SceneCanvas,
    TelemetryMonitor,
    Typewriter,
  ],
  templateUrl: './journey.page.html',
  host: { '(document:keydown.escape)': 'onEscape()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyPage {
  protected readonly journey = inject(JourneyService);
  protected readonly motion = inject(MotionService);
  protected readonly audio = inject(AudioService);
  private readonly shell = inject(ShellService);
  private readonly analytics = inject(AnalyticsPort);
  private readonly registry = inject(SceneRegistry);
  private readonly injector = inject(Injector);

  /** `?bench` shows the Spike 0 benchmark panel (its code is a separate chunk, never sent otherwise). */
  protected readonly benchMode =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('bench');

  protected readonly profile = PROFILE;
  protected readonly endpoints = ENDPOINTS;
  protected readonly bootLines = BOOT_LINES;
  protected readonly consolePrompt = CONSOLE_PROMPT;
  protected readonly responseLine = RESPONSE_LINE;
  protected readonly simulatedTag = SIMULATED_TAG;
  protected readonly coreStack = 'TypeScript, NestJS, React, Angular, PostgreSQL, Docker';

  protected readonly tier = this.motion.tier;
  protected readonly showCanvas = computed(() => this.tier() !== 'static');
  protected readonly renderTier = computed<RenderTier>(() => {
    const tier = this.tier();
    return tier === 'static' ? 'low' : tier;
  });
  /** Show text at once: reduced motion, or no 3D to sync with. */
  protected readonly plainText = computed(
    () => this.motion.reducedMotion() || this.tier() === 'static',
  );

  protected readonly snapshot = computed<SceneSnapshot>(() => {
    const state = this.journey.state();
    const base = state.kind === 'standard2d' ? state.resume : state;
    return base.kind === 'journey' || base.kind === 'room'
      ? { phase: base.kind, endpoint: base.endpoint }
      : { phase: base.kind, endpoint: null };
  });

  protected readonly graphicsLabel = computed(() => {
    const tier = this.tier().toUpperCase();
    return this.motion.userChoice() === 'auto' ? `AUTO · ${tier}` : tier;
  });

  protected readonly info = computed(() => {
    const endpoint = this.journey.endpoint();
    return endpoint ? endpointInfo(endpoint) : null;
  });

  /** Spoken by screen readers when the state changes. */
  protected readonly announcement = computed(() => {
    const title = this.info()?.title ?? '';
    switch (this.journey.kind()) {
      case 'boot':
        return 'Boot sequence. Initialize the neural link to continue.';
      case 'console':
        return 'Console ready. Select an endpoint.';
      case 'journey':
        return `Travelling to ${title}. Press Escape to skip.`;
      case 'room':
        return `${title} reached.`;
      case 'standard2d':
        return '';
    }
  });

  constructor() {
    inject(SeoService).set({
      title: "Experience preview — Packet's Journey",
      description: "A preview of the interactive 'Packet's Journey' experience.",
      path: '/journey',
      robots: 'noindex, nofollow',
    });

    this.shell.setImmersive(true);
    inject(DestroyRef).onDestroy(() => {
      this.shell.setImmersive(false);
      this.journey.reset();
      this.audio.stopHum();
    });

    // Keyboard users land on the primary control of each state.
    effect(() => {
      this.journey.kind();
      afterNextRender(() => document.querySelector<HTMLElement>('[data-autofocus]')?.focus(), {
        injector: this.injector,
      });
    });

    // Record tier changes (the coarse tier only, never raw hardware details).
    let first = true;
    effect(() => {
      const tier = this.tier();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.analytics.track({ name: 'tier_change', tier }));
    });
  }

  protected onEscape(): void {
    if (this.journey.kind() === 'journey') this.journey.skip();
  }

  /** The headset glows while its DOM twin (the Initialize button) is hovered or focused. */
  protected hover(target: SceneHover): void {
    this.registry.hover(target);
  }

  protected toggleAudio(): void {
    this.audio.toggle();
  }
}
