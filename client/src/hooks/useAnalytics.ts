/**
 * useAnalytics — thin wrapper around the Umami analytics client.
 *
 * Umami is loaded via a <script> tag in index.html and exposes
 * `window.umami` globally. This hook provides a typed, safe interface
 * so components never call window.umami directly.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("send_request", { platform: "google" });
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export type AnalyticsEvent =
  | "page_view"
  | "send_request"
  | "bulk_send"
  | "csv_import"
  | "smtp_connect"
  | "template_create"
  | "template_edit"
  | "share_referral"
  | "reminder_created"
  | "contact_added"
  | "contact_natural_search"
  | "contact_export"
  | "review_link_clicked"
  | "onboarding_completed"
  | "account_deleted";

export function useAnalytics() {
  /**
   * Track a named event with optional metadata.
   * Silently no-ops if Umami hasn't loaded yet (e.g. ad-blocker, dev mode).
   */
  const track = (event: AnalyticsEvent, data?: Record<string, unknown>) => {
    try {
      window.umami?.track(event, data);
    } catch {
      // Never let analytics errors surface to the user
    }
  };

  return { track };
}
