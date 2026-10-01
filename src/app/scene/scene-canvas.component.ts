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
  SCENE_HOST_FACTORY,
  type RenderTier,
  type SceneHost,
  type SceneSnapshot,
} from './scene-host';
import { SceneRegistry } from './scene-registry';

/**
 * Thin Angular wrapper around a SceneHost (ARCHITECTURE.md S3): it owns the canvas and the lifecycle,
 * pushes COARSE inputs in (snapshot, tier, size) and runs the adaptive-quality governor. Nothing per-frame
 * flows through Angular. The canvas is decorative (`aria-hidden`): all meaning is also in DOM text.
 * The host is created asynchronously, so its implementation can be code-split and lazy-loaded.
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
      const created = await this.createHost();
      if (destroyed) {
        // The page was left while the implementation was still loading.
        created.dispose();
        return;
      }
      host = created;

      created.onFrameTime = (ms) => {
        // A tier the user forced is respected as is; only "auto" is adapted.
        if (this.motion.userChoice() !== 'auto') return;
        const change = governor.push(ms);
        if (change) this.motion.reportGovernorTier(change);
      };
      created.setTier(this.tier());
      created.setSnapshot(this.snapshot());
      created.mount(element);
      created.resize(element.clientWidth, element.clientHeight, window.devicePixelRatio || 1);
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

    // When the user hands control back to "auto", start the governor fresh from the detected tier.
    effect(() => {
      if (this.motion.userChoice() === 'auto')
        governor = new AdaptiveQuality(this.motion.detectedTier());
    });
  }
}
