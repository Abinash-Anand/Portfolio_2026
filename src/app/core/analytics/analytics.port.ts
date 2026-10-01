import { Injectable } from '@angular/core';

/**
 * The only analytics events that exist. A typed union, so a typo or an unplanned property
 * does not compile. Properties never carry personal data (see docs/ARCHITECTURE.md).
 */
export type AnalyticsEvent =
  | { readonly name: 'cv_download' }
  | { readonly name: 'project_open'; readonly slug: string }
  | {
      readonly name: 'contact_click';
      readonly channel: 'email' | 'github' | 'linkedin' | 'instagram';
    }
  /** Something went wrong in the page (no details are sent). Lets a broken release be noticed. */
  | { readonly name: 'app_error' }
  /** How far down a page the visitor scrolled, once per page and threshold. */
  | { readonly name: 'scroll_depth'; readonly depth: 25 | 50 | 75 | 100 };

/**
 * Port: components send events here and know nothing about the provider.
 * The default adapter records nothing; app.config swaps in the real provider in production browsers.
 */
@Injectable({ providedIn: 'root', useFactory: () => new NoopAnalytics() })
export abstract class AnalyticsPort {
  abstract track(event: AnalyticsEvent): void;
}

export class NoopAnalytics extends AnalyticsPort {
  track(): void {
    // intentionally empty
  }
}
