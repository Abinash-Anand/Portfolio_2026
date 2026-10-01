import { Injectable, signal } from '@angular/core';

/** Lets a full-screen experience take over the viewport: the site header and footer step aside. */
@Injectable({ providedIn: 'root' })
export class ShellService {
  private readonly immersiveState = signal(false);
  readonly immersive = this.immersiveState.asReadonly();

  setImmersive(immersive: boolean): void {
    this.immersiveState.set(immersive);
  }
}
