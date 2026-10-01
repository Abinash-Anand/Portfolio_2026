import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { MotionService } from '../motion/motion.service';
import { SceneRegistry } from './scene-registry';

interface OverlayView {
  readonly engine: string;
  readonly fps: number;
  readonly frameMs: number;
  readonly drawCalls: number;
  readonly heapMb: number | null;
  readonly tier: string;
  readonly choice: string;
}

/**
 * Developer overlay (ARCHITECTURE.md S13): FPS, frame time, draw calls, JS heap, tier. It PULLS from the scene
 * four times a second, so measuring never adds per-frame work. Shown in dev mode, or in production with `?debug`.
 */
@Component({
  selector: 'app-dev-overlay',
  templateUrl: './dev-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevOverlay {
  private readonly registry = inject(SceneRegistry);
  private readonly motion = inject(MotionService);

  protected readonly visible =
    isDevMode() ||
    (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'));
  protected readonly view = signal<OverlayView | null>(null);

  constructor() {
    if (!this.visible) return;
    const timer = setInterval(() => this.sample(), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private sample(): void {
    const stats = this.registry.stats();
    if (!stats) {
      this.view.set(null);
      return;
    }
    // `performance.memory` exists in Chromium only.
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      ?.usedJSHeapSize;
    this.view.set({
      engine: stats.engine,
      fps: stats.fps,
      frameMs: stats.frameMs,
      drawCalls: stats.drawCalls,
      heapMb: heap === undefined ? null : Math.round(heap / 1048576),
      tier: this.motion.tier(),
      choice: this.motion.userChoice(),
    });
  }
}
