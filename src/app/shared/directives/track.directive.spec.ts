import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsPort, NoopAnalytics, type AnalyticsEvent } from '../../core/analytics/analytics.port';
import { TrackDirective } from './track.directive';

@Component({
  imports: [TrackDirective],
  template: `<a href="#x" [appTrack]="{ name: 'project_open', slug: 'demo' }">open</a>`,
})
class Host {}

describe('TrackDirective', () => {
  it('sends the configured event to the analytics port on click', () => {
    const track = vi.fn<(event: AnalyticsEvent) => void>();
    TestBed.configureTestingModule({ providers: [{ provide: AnalyticsPort, useValue: { track } }] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('a')?.click();
    expect(track).toHaveBeenCalledExactlyOnceWith({ name: 'project_open', slug: 'demo' });
  });

  it('defaults to the no-op adapter, so tracking is silent until a provider is wired', () => {
    const analytics = TestBed.inject(AnalyticsPort);
    expect(analytics).toBeInstanceOf(NoopAnalytics);
    expect(() => analytics.track({ name: 'cv_download' })).not.toThrow();
  });
});
