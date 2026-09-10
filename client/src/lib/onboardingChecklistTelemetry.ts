export const ONBOARDING_CHECKLIST_TELEMETRY_EVENTS = [
  "checklist_viewed",
  "email_step_viewed",
  "platform_step_viewed",
  "contacts_step_viewed",
  "send_step_viewed",
  "email_step_actioned",
  "platform_step_actioned",
  "contacts_step_actioned",
  "send_step_actioned",
  "checklist_completed",
] as const;

export type OnboardingChecklistTelemetryEvent =
  (typeof ONBOARDING_CHECKLIST_TELEMETRY_EVENTS)[number];

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_PREFIX = "getphame:onboarding-checklist-events:";

function getSessionStorage(): SessionStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseStoredEvents(
  value: string | null
): Set<OnboardingChecklistTelemetryEvent> {
  if (!value) return new Set();
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((event): event is OnboardingChecklistTelemetryEvent =>
        ONBOARDING_CHECKLIST_TELEMETRY_EVENTS.includes(
          event as OnboardingChecklistTelemetryEvent
        )
      )
    );
  } catch {
    return new Set();
  }
}

/**
 * Claims a low-volume checklist event once per authenticated account and browser
 * session. The server remains the authority for authentication, event allowlisting,
 * and the rolling abuse limit; this simply prevents ordinary reloads or remounts
 * from producing duplicate best-effort analytics writes.
 */
export function claimOnboardingChecklistTelemetryEvent(
  userId: number | null | undefined,
  event: OnboardingChecklistTelemetryEvent,
  claimedEvents: Set<string>,
  storage: SessionStorageLike | null = getSessionStorage()
): boolean {
  const storageKey = `${STORAGE_PREFIX}${userId ?? "unknown"}`;
  const memoryKey = `${storageKey}:${event}`;
  if (claimedEvents.has(memoryKey)) return false;

  if (storage) {
    let storedEvents = new Set<OnboardingChecklistTelemetryEvent>();
    try {
      storedEvents = parseStoredEvents(storage.getItem(storageKey));
    } catch {
      // Keep the in-memory claim below when browser storage is unavailable.
    }
    if (storedEvents.has(event)) {
      claimedEvents.add(memoryKey);
      return false;
    }

    storedEvents.add(event);
    try {
      storage.setItem(storageKey, JSON.stringify(Array.from(storedEvents)));
    } catch {
      // Keep the in-memory claim below when browser storage is unavailable.
    }
  }

  claimedEvents.add(memoryKey);
  return true;
}
