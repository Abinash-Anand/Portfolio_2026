import { DOCUMENT } from '@angular/common';
import { inject, Injectable, NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ShellService } from '../shell.service';
import { AnalyticsPort } from './analytics.port';

export const DEPTHS = [25, 50, 75, 100] as const;
export type Depth = (typeof DEPTHS)[number];

/** A page that barely scrolls says nothing about reading: it is not measured. */
const MIN_SCROLLABLE_RATIO = 1.25;

/**
 * Which depth thresholds the visitor has newly passed. Pure: `reached` is what was already reported for this page.
 * The depth is how far the bottom of the viewport has travelled down the page.
 */
export function newDepths(
  scrollTop: number,
  viewportHeight: number,
  pageHeight: number,
  reached: ReadonlySet<Depth>,
): Depth[] {
  if (viewportHeight <= 0 || pageHeight < viewportHeight * MIN_SCROLLABLE_RATIO) return [];
  const percent = ((scrollTop + viewportHeight) / pageHeight) * 100;
  return DEPTHS.filter((depth) => percent >= depth - 0.5 && !reached.has(depth));
}

/**
 * Sends `scroll_depth` (25, 50, 75, 100) once per page and threshold, for the 2D pages. The immersive 3D
 * experience has no page scroll and is skipped. Passive listener, throttled to one check per frame.
 */
@Injectable({ providedIn: 'root' })
export class ScrollDepthTracker {
  private readonly analytics = inject(AnalyticsPort);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  private reached = new Set<Depth>();
  private scheduled = false;
  private started = false;

  start(): void {
    const view = this.document.defaultView;
    if (this.started || !view) return;
    this.started = true;

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.reached = new Set(); // a new page: measure again
    });

    this.zone.runOutsideAngular(() => {
      view.addEventListener('scroll', () => this.check(view), { passive: true });
    });
  }

  private check(view: Window): void {
    if (this.scheduled || this.shell.immersive()) return;
    this.scheduled = true;
    view.requestAnimationFrame(() => {
      this.scheduled = false;
      const root = this.document.documentElement;
      for (const depth of newDepths(
        view.scrollY,
        view.innerHeight,
        root.scrollHeight,
        this.reached,
      )) {
        this.reached.add(depth);
        this.analytics.track({ name: 'scroll_depth', depth });
      }
    });
  }
}
