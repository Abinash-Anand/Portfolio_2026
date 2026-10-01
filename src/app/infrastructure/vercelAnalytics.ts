import { analyticsPayload, type AnalyticsEvent, type AnalyticsPort } from "../application/AnalyticsPort.ts";

type PrivacySignals = { readonly doNotTrack?: string | null; readonly globalPrivacyControl?: boolean };
type Provider = { track(name: string, payload: Record<string, string | number>): void; initialize(): void };
export function privacyAllowsAnalytics(signals: PrivacySignals): boolean {
  return !signals.globalPrivacyControl && signals.doNotTrack !== "1" && signals.doNotTrack !== "yes";
}
export function createAnalyticsAdapter(provider: Provider, enabled: boolean, privacy: () => PrivacySignals): AnalyticsPort {
  let initialized = false;
  return {track(event: AnalyticsEvent) {
    if (!enabled || !privacyAllowsAnalytics(privacy())) return;
    const payload = analyticsPayload(event);
    if (payload === null) return;
    try {
      if (!initialized) { provider.initialize(); initialized = true; }
      provider.track(event.name, payload);
    } catch {}
  }};
}
function browserPrivacy(): PrivacySignals {
  const signals = [navigator.doNotTrack, (window as Window & {doNotTrack?: string}).doNotTrack];
  return {doNotTrack: signals.find(signal => signal === "1" || signal === "yes"), globalPrivacyControl: (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl};
}
export function createVercelAnalytics(enabled: boolean): {port: AnalyticsPort; dispose(): void} {
  let disposed = false;
  let provider: {track(name: string, payload: Record<string, string | number>): void} | undefined;
  const pending: {name: string; payload: Record<string, string | number>}[] = [];
  const port = createAnalyticsAdapter({
    initialize() {
      void Promise.all([import("@vercel/analytics"), import("@vercel/speed-insights")]).then(([analytics, speed]) => {
        if (disposed || !privacyAllowsAnalytics(browserPrivacy())) return;
        const safeUrl = () => `${location.origin}/`;
        analytics.inject({mode: "production", debug: false, disableAutoTrack: true, beforeSend: event => disposed || !privacyAllowsAnalytics(browserPrivacy()) ? null : {type: event.type, url: safeUrl()}});
        speed.injectSpeedInsights({debug: false, route: "/", beforeSend: event => disposed || !privacyAllowsAnalytics(browserPrivacy()) ? null : {type: event.type, url: safeUrl(), route: "/"}});
        provider = analytics;
        if (privacyAllowsAnalytics(browserPrivacy())) pending.splice(0).forEach(event => provider?.track(event.name, event.payload));
        else pending.length = 0;
      }).catch(() => {});
    },
    track(name, payload) {
      if (disposed) return;
      if (provider) provider.track(name, payload);
      else if (pending.length < 20) pending.push({name, payload});
    },
  }, enabled, browserPrivacy);
  const onError = () => port.track({name: "app_error", kind: "error"});
  const onRejection = () => port.track({name: "app_error", kind: "unhandledrejection"});
  if (enabled && privacyAllowsAnalytics(browserPrivacy())) {
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
  }
  return {port, dispose() {disposed = true; pending.length = 0; window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection);}};
}
