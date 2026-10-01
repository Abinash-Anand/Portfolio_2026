import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { AdaptiveQuality } from '../motion/adaptive-quality';
import { MotionService } from '../motion/motion.service';
import {
  EMPTY_CONTENT,
  SCENE_HOST_FACTORY,
  type RenderTier,
  type SceneContent,
  type SceneHost,
  type SceneSnapshot,
} from './scene-host';
import { SceneRegistry } from './scene-registry';

/**
 * Thin Angular wrapper around a SceneHost (ARCHITECTURE.md S3): it owns the canvas and the lifecycle,
 * pushes COARSE inputs in (snapshot, tier, size) and runs the adaptive-quality governor. Nothing per-frame
 * flows through Angular. The canvas is decorative (`aria-hidden`): all meaning is also in DOM text.
 *
 * The host is created asynchronously (its implementation is code-split), and anything that goes wrong,
 * whether the implementation fails to start or the browser later takes the WebGL context away, drops the
 * visitor to the 2D experience instead of leaving a blank screen.
 */
@Component({
  selector: 'app-scene-canvas',
  host: { class: 'block h-full w-full' },
  template: '<canvas #canvas class="block h-full w-full" aria-hidden="true"></canvas>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneCanvas {
  readonly snapshot = input.required<SceneSnapshot>();
  readonly tier = input.required<RenderTier>();
  /** What the rooms are built from; changing it rebuilds the rooms lazily. */
  readonly content = input<SceneContent>(EMPTY_CONTENT);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly registry = inject(SceneRegistry);
  private readonly motion = inject(MotionService);
  private readonly createHost = inject(SCENE_HOST_FACTORY);

  constructor() {
    let host: SceneHost | null = null;
    let destroyed = false;
    let cleanup: (() => void) | null = null;
    let governor = new AdaptiveQuality(this.motion.detectedTier());

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      cleanup?.();
    });

    afterNextRender(async () => {
      const element = this.canvas().nativeElement;

      let created: SceneHost;
      try {
        created = await this.createHost();
      } catch {
        if (!destroyed) this.motion.fallBackToStatic('init_failed');
        return;
      }
      if (destroyed) {
        // The page was left while the implementation was still loading.
        created.dispose();
        return;
      }

      created.onFrameTime = (ms) => {
        // A tier the user forced is respected as is; only "auto" is adapted.
        if (this.motion.userChoice() !== 'auto') return;
        const change = governor.push(ms);
        if (change) this.motion.reportGovernorTier(change);
      };
      created.onContextLost = () => this.motion.fallBackToStatic('context_lost');

      try {
        created.setTier(this.tier());
        created.setContent?.(this.content());
        created.setSnapshot(this.snapshot());
        created.mount(element);
        created.resize(element.clientWidth, element.clientHeight, window.devicePixelRatio || 1);
      } catch {
        // For example: no WebGL, or the driver refused to create a context.
        created.dispose();
        this.motion.fallBackToStatic('init_failed');
        return;
      }
      host = created;
      this.registry.register(created);

      const observer = new ResizeObserver(([entry]) => {
        if (entry)
          created.resize(
            entry.contentRect.width,
            entry.contentRect.height,
            window.devicePixelRatio || 1,
          );
      });
      observer.observe(element);

      // Do no work nobody can see (ARCHITECTURE.md S10).
      const onVisibility = (): void => (document.hidden ? created.pause() : created.resume());
      document.addEventListener('visibilitychange', onVisibility);

      cleanup = () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        this.registry.unregister(created);
        created.dispose();
        host = null;
      };
    });

    effect(() => {
      const snapshot = this.snapshot();
      host?.setSnapshot(snapshot);
    });

    effect(() => {
      const tier = this.tier();
      host?.setTier(tier);
    });

    effect(() => {
      const content = this.content();
      host?.setContent?.(content);
    });

    // When the user hands control back to "auto", start the governor fresh from the detected tier.
    effect(() => {
      if (this.motion.userChoice() === 'auto')
        governor = new AdaptiveQuality(this.motion.detectedTier());
    });
  }
}
