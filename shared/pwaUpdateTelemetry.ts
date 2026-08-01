/**
 * Privacy-preserving PWA update notice telemetry vocabulary.
 *
 * The browser sends only this allowlisted interaction name. The server stores
 * daily aggregate totals; it never receives a deployment version, visitor,
 * account, device, route, network, or error identifier for these events.
 */
export const PWA_UPDATE_TELEMETRY_EVENT_NAMES = [
  "notice_shown",
  "update_requested",
  "update_deferred",
  "update_blocked",
  "update_discard_confirmed",
  "update_applying",
] as const;

export type PwaUpdateTelemetryEvent =
  (typeof PWA_UPDATE_TELEMETRY_EVENT_NAMES)[number];
