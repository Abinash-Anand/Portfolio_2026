import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IDENTITY_LINE } from '../../../journey/telemetry';
import { SceneRegistry } from '../../../scene/scene-registry';

/**
 * The corner HUD: identity, live engine and FPS readouts, and the controls that are always available
 * (audio, graphics, standard 2D resume). Decorative readouts are hidden from assistive tech and on small screens.
 * FPS is PULLED from the scene twice a second; nothing per-frame flows through Angular.
 */
@Component({
  selector: 'app-hud',
  imports: [RouterLink],
  templateUrl: './hud.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hud {
  readonly audioLabel = input.required<string>();
  readonly audioOn = input(false);
  readonly graphicsLabel = input.required<string>();

  readonly audioToggle = output<void>();
  readonly graphicsCycle = output<void>();
  readonly resume2d = output<void>();
  readonly cue = output<void>();

  protected readonly identity = IDENTITY_LINE;
  private readonly registry = inject(SceneRegistry);
  protected readonly readout = signal<{ fps: number; engine: string } | null>(null);

  constructor() {
    const timer = setInterval(() => {
      const stats = this.registry.stats();
      this.readout.set(stats ? { fps: stats.fps, engine: stats.engine } : null);
    }, 500);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
