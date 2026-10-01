import { Injectable, signal } from '@angular/core';
import type { SceneHost, SceneStats } from './scene-host';

/** Lets the HUD and dev overlay PULL stats from whichever host is mounted (nothing is pushed per frame). */
@Injectable({ providedIn: 'root' })
export class SceneRegistry {
  private host: SceneHost | null = null;
  private readonly activeState = signal(false);

  /** True while a scene is mounted. */
  readonly active = this.activeState.asReadonly();

  register(host: SceneHost): void {
    this.host = host;
    this.activeState.set(true);
  }

  unregister(host: SceneHost): void {
    if (this.host === host) {
      this.host = null;
      this.activeState.set(false);
    }
  }

  stats(): SceneStats | null {
    return this.host?.stats() ?? null;
  }
}
