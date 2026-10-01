import { Injectable, signal } from '@angular/core';
import type { EndpointId } from '../core/experience';
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

  /** The visitor is likely heading to this endpoint: let the world start preparing its room. */
  intent(endpoint: EndpointId | null): void {
    this.current?.setIntent?.(endpoint);
  }

  /** Draws attention to one thing inside the current room (a project pod, a commit). */
  focus(id: string | null): void {
    this.current?.setFocus?.(id);
  }
}
