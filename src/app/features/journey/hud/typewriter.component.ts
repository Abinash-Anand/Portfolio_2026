import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

/**
 * Terminal text that types itself out. The FULL text is always in the DOM for screen readers (visually hidden),
 * and the animated copy is `aria-hidden`, so assistive tech never hears it letter by letter.
 * `instant` (reduced motion) shows everything at once.
 */
@Component({
  selector: 'app-typewriter',
  templateUrl: './typewriter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Typewriter {
  readonly lines = input.required<readonly string[]>();
  readonly instant = input(false);
  readonly speedMs = input(26);
  readonly caret = input(true);
  readonly finished = output<void>();

  protected readonly full = computed(() => this.lines().join('\n'));
  private readonly count = signal(0);
  protected readonly visible = computed(() => this.full().slice(0, this.count()));
  readonly done = computed(() => this.count() >= this.full().length);

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const length = this.full().length;
      const instant = this.instant();
      const speed = this.speedMs();
      untracked(() => this.restart(length, instant, speed));
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Finish immediately (for example when the visitor skips). */
  complete(): void {
    this.stop();
    this.count.set(this.full().length);
    this.finished.emit();
  }

  private restart(length: number, instant: boolean, speed: number): void {
    this.stop();
    if (instant || length === 0) {
      this.count.set(length);
      this.finished.emit();
      return;
    }
    this.count.set(0);
    this.timer = setInterval(() => {
      const next = this.count() + 1;
      this.count.set(next);
      if (next >= length) {
        this.stop();
        this.finished.emit();
      }
    }, speed);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
