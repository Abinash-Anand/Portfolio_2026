import { Injectable } from '@angular/core';
import type { EndpointId, TierId } from '../experience';

/**
 * The only analytics events that exist. A typed union, so a typo or an unplanned property
 * does not compile. Properties never carry personal data (see ARCHITECTURE.md 10.1).
 */
export type AnalyticsEvent =
  | { readonly name: 'cv_download' }
  | { readonly name: 'project_open'; readonly slug: string }
  | {
      readonly name: 'contact_click';
      readonly channel: 'email' | 'github' | 'linkedin' | 'instagram';
    }
  | { readonly name: 'journey_start' }
  | { readonly name: 'endpoint_select'; readonly endpoint: EndpointId }
  | { readonly name: 'journey_skip' }
  | { readonly name: 'resume_2d_toggle' }
  | { readonly name: 'tier_change'; readonly tier: TierId };

/**
 * Port: components send events here and know nothing about the provider.
 * The default adapter records nothing; a real provider replaces it in app.config in Phase 4.
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
