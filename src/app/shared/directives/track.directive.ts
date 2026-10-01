import { Directive, inject, input } from '@angular/core';
import { AnalyticsPort, type AnalyticsEvent } from '../../core/analytics/analytics.port';

/** Declarative analytics: `<a [appTrack]="{ name: 'cv_download' }">` sends the event on click. */
@Directive({
  selector: '[appTrack]',
  host: { '(click)': 'send()' },
})
export class TrackDirective {
  private readonly analytics = inject(AnalyticsPort);
  readonly appTrack = input.required<AnalyticsEvent>();

  protected send(): void {
    this.analytics.track(this.appTrack());
  }
}
