import { Injectable, signal } from '@angular/core';
import type { SceneHost, SceneHover, SceneStats } from './scene-host';

/**
 * Lets the HUD, dev overlay and benchmark reach whichever host is mounted. Stats are PULLED a few times a
 * second; nothing is pushed per frame.
 */
@Injectable({ providedIn: 'root' })
export class SceneRegistry {
  private current: SceneHost | null = null;
  private readonly activeState = signal(false);

  /** True while a scene is mounted. */
  readonly active = this.activeState.asReadonly();

  get host(): SceneHost | null {
    return this.current;
  }

  register(host: SceneHost): void {
    this.current = host;
    this.activeState.set(true);
  }

  unregister(host: SceneHost): void {
    if (this.current === host) {
      this.current = null;
      this.activeState.set(false);
    }
  }

  stats(): SceneStats | null {
    return this.current?.stats() ?? null;
  }

  /** Forwards a hover from a DOM control to the world (no-op for hosts that do not react to it). */
  hover(target: SceneHover): void {
    this.current?.setHover?.(target);
  }
}
