export type AnalyticsEvent =
  | { readonly name: "cv_download" }
  | { readonly name: "project_open"; readonly projectIndex: number }
  | { readonly name: "contact_click"; readonly kind: "email" | "social" | "navigation" | "calendly" }
  | { readonly name: "scroll_depth"; readonly percent: 25 | 50 | 75 | 100 }
  | { readonly name: "app_error"; readonly kind: "error" | "unhandledrejection" };

export interface AnalyticsPort {
  track(event: AnalyticsEvent): void;
}
export const noAnalytics: AnalyticsPort = {track: () => {}};

export function analyticsPayload(event: AnalyticsEvent): Record<string, string | number> | null {
  switch (event.name) {
    case "cv_download": return {};
    case "project_open": return Number.isSafeInteger(event.projectIndex) && event.projectIndex >= 0 && event.projectIndex <= 5 ? {project_index: event.projectIndex} : null;
    case "contact_click": return ["email", "social", "navigation", "calendly"].includes(event.kind) ? {kind: event.kind} : null;
    case "scroll_depth": return [25, 50, 75, 100].includes(event.percent) ? {percent: event.percent} : null;
    case "app_error": return ["error", "unhandledrejection"].includes(event.kind) ? {kind: event.kind} : null;
    default: return null;
  }
}
