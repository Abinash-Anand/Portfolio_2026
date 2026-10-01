import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsPort } from './analytics/analytics.port';
import { AppErrorHandler } from './app-error-handler';

function setup(track = vi.fn()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AnalyticsPort, useValue: { track } },
      { provide: ErrorHandler, useClass: AppErrorHandler },
    ],
  });
  return { handler: TestBed.inject(ErrorHandler), track };
}

describe('AppErrorHandler', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('still logs the error, and counts it without sending anything about it', () => {
    const { handler, track } = setup();
    handler.handleError(new Error('secret message with /private/path'));
    expect(console.error).toHaveBeenCalled();
    expect(track).toHaveBeenCalledExactlyOnceWith({ name: 'app_error' });
  });

  it('stops reporting after a few errors, so a failure loop cannot flood the statistics', () => {
    const { handler, track } = setup();
    for (let i = 0; i < 20; i++) handler.handleError(new Error('again'));
    expect(track).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledTimes(20); // the console still gets every one
  });

  it('never throws a second error if reporting itself fails', () => {
    const { handler } = setup(
      vi.fn(() => {
        throw new Error('analytics down');
      }),
    );
    expect(() => handler.handleError(new Error('x'))).not.toThrow();
  });
});
