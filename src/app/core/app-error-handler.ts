import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AnalyticsPort } from './analytics/analytics.port';

/** At most this many errors are reported per page load, so a failure loop cannot flood the statistics. */
const MAX_REPORTS = 3;

/**
 * Keeps Angular's default behaviour (the error still goes to the console) and also counts it, anonymously: only
 * the fact that something failed is sent, never the message or the stack (they can contain URLs or user content).
 * That is enough to notice a broken release from the statistics.
 */
@Injectable()
export class AppErrorHandler extends ErrorHandler {
  private readonly analytics = inject(AnalyticsPort);
  private reported = 0;

  override handleError(error: unknown): void {
    super.handleError(error);
    if (this.reported >= MAX_REPORTS) return;
    this.reported++;
    try {
      this.analytics.track({ name: 'app_error' });
    } catch {
      // Reporting must never cause a second error.
    }
  }
}
