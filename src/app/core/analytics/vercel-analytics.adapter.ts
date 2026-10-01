import { AnalyticsPort, type AnalyticsEvent } from './analytics.port';

/**
 * Anonymous, cookieless visit statistics through Vercel Web Analytics and Speed Insights (ADR-011, PRODUCT.md
 * section 3). This adapter does the little the official packages do (they only add a script tag and a queue),
 * without their framework-specific dependencies:
 *
 * - nothing is loaded when the browser sends Do Not Track or Global Privacy Control;
 * - the scripts are served from this site (`/_vercel/...`), loaded when the browser is idle, so they never compete
 *   with the first paint, and do nothing until Web Analytics is switched on for the project in Vercel;
 * - events carry only coarse values (an endpoint, a project slug, a channel), never anything personal.
 */

type Queue = (...params: unknown[]) => void;

/** The browser properties this adapter touches, so tests can supply a fake. */
export interface AnalyticsWindow {
  va?: Queue;
  vaq?: unknown[][];
  si?: Queue;
  siq?: unknown[][];
  doNotTrack?: string | null;
  navigator: {
    doNotTrack?: string | null;
    msDoNotTrack?: string | null;
    globalPrivacyControl?: boolean;
  };
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  setTimeout: (callback: () => void, ms: number) => unknown;
}

/** True when the visitor has asked not to be measured. */
export function optedOut(win: Pick<AnalyticsWindow, 'doNotTrack' | 'navigator'>): boolean {
  const flags = [win.navigator.doNotTrack, win.doNotTrack, win.navigator.msDoNotTrack];
  return (
    flags.some((flag) => flag === '1' || flag === 'yes') ||
    win.navigator.globalPrivacyControl === true
  );
}

export interface EventPayload {
  readonly name: string;
  /** Only strings, numbers and booleans are allowed by the provider. */
  readonly data?: Readonly<Record<string, string | number | boolean>>;
}

/** The name and properties sent for each event; the single place that decides what leaves the browser. */
export function eventPayload(event: AnalyticsEvent): EventPayload {
  switch (event.name) {
    case 'project_open':
      return { name: event.name, data: { slug: event.slug } };
    case 'contact_click':
      return { name: event.name, data: { channel: event.channel } };
    case 'endpoint_select':
      return { name: event.name, data: { endpoint: event.endpoint } };
    case 'room_arrive':
      return { name: event.name, data: { endpoint: event.endpoint, how: event.how } };
    case 'tier_change':
      return { name: event.name, data: { tier: event.tier } };
    case 'scroll_depth':
      return { name: event.name, data: { depth: event.depth } };
    case 'webgl_fallback':
      return { name: event.name, data: { reason: event.reason } };
    case 'app_error':
      return { name: event.name };
    case 'cv_download':
    case 'journey_start':
    case 'journey_skip':
    case 'resume_2d_toggle':
      return { name: event.name };
  }
}

export class VercelAnalytics extends AnalyticsPort {
  constructor(
    private readonly win: AnalyticsWindow,
    private readonly doc: Document,
  ) {
    super();
    // The queue exists from the start, so an event sent before the script has loaded is not lost.
    win.va ??= (...params) => (win.vaq ??= []).push(params);
    win.si ??= (...params) => (win.siq ??= []).push(params);
  }

  /** Loads the two scripts when the browser is idle. Does nothing when the visitor has opted out. */
  start(): void {
    if (optedOut(this.win)) return;
    const load = (): void => {
      this.addScript('/_vercel/insights/script.js', '@vercel/analytics');
      this.addScript('/_vercel/speed-insights/script.js', '@vercel/speed-insights');
    };
    if (this.win.requestIdleCallback) this.win.requestIdleCallback(load, { timeout: 4000 });
    else this.win.setTimeout(load, 2000);
  }

  track(event: AnalyticsEvent): void {
    if (optedOut(this.win)) return;
    const { name, data } = eventPayload(event);
    this.win.va?.('event', data ? { name, data } : { name });
  }

  private addScript(src: string, sdk: string): void {
    if (this.doc.head.querySelector(`script[src="${src}"]`)) return;
    const script = this.doc.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset['sdkn'] = sdk;
    script.dataset['sdkv'] = 'custom';
    this.doc.head.appendChild(script);
  }
}
