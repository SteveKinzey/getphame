export const ONBOARDING_CHECKLIST_EVENT_NAMES = [
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

export type OnboardingChecklistEventName =
  (typeof ONBOARDING_CHECKLIST_EVENT_NAMES)[number];

export const ONBOARDING_CHECKLIST_EVENT_SOURCE = "onboarding_checklist";
const ONBOARDING_CHECKLIST_EVENT_PREFIX = "/onboarding-checklist/";
const STEPS = ["email", "platform", "contacts", "send"] as const;
type ChecklistStep = (typeof STEPS)[number];
type EventCounts = Record<OnboardingChecklistEventName, number>;

export interface OnboardingChecklistEventRow {
  page: string;
  userId: number | null;
  createdAt: Date;
}

export function toOnboardingChecklistEventPage(
  event: OnboardingChecklistEventName
): string {
  return `${ONBOARDING_CHECKLIST_EVENT_PREFIX}${event.replaceAll("_", "-")}`;
}

export function fromOnboardingChecklistEventPage(
  page: string
): OnboardingChecklistEventName | null {
  if (!page.startsWith(ONBOARDING_CHECKLIST_EVENT_PREFIX)) return null;
  const event = page
    .slice(ONBOARDING_CHECKLIST_EVENT_PREFIX.length)
    .replaceAll("-", "_");
  return ONBOARDING_CHECKLIST_EVENT_NAMES.includes(
    event as OnboardingChecklistEventName
  )
    ? (event as OnboardingChecklistEventName)
    : null;
}

function emptyCounts(): EventCounts {
  return Object.fromEntries(
    ONBOARDING_CHECKLIST_EVENT_NAMES.map(event => [event, 0])
  ) as EventCounts;
}

function uniqueEventCounts(rows: OnboardingChecklistEventRow[]): EventCounts {
  const seen = new Map<OnboardingChecklistEventName, Set<number>>();
  const counts = emptyCounts();
  for (const row of rows) {
    const event = fromOnboardingChecklistEventPage(row.page);
    if (!event || row.userId == null) continue;
    const users = seen.get(event) ?? new Set<number>();
    users.add(row.userId);
    seen.set(event, users);
  }
  for (const event of ONBOARDING_CHECKLIST_EVENT_NAMES)
    counts[event] = seen.get(event)?.size ?? 0;
  return counts;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0
    ? Math.round((numerator / denominator) * 1000) / 10
    : 0;
}

function summarizeStep(counts: EventCounts, step: ChecklistStep) {
  const shown = counts[`${step}_step_viewed` as OnboardingChecklistEventName];
  const actioned =
    counts[`${step}_step_actioned` as OnboardingChecklistEventName];
  return {
    shown,
    actioned,
    dropOff: Math.max(shown - actioned, 0),
    continuationRate: percent(actioned, shown),
  };
}

/** Returns aggregate, unique-account metrics only; no raw activity data leaves the server. */
export function summarizeOnboardingChecklistEvents(
  rows: OnboardingChecklistEventRow[],
  now = Date.now()
) {
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const allTime = uniqueEventCounts(rows);
  const last30Days = uniqueEventCounts(
    rows.filter(row => row.createdAt.getTime() >= thirtyDaysAgo)
  );
  return {
    allTime,
    last30Days,
    steps: Object.fromEntries(
      STEPS.map(step => [step, summarizeStep(allTime, step)])
    ) as Record<ChecklistStep, ReturnType<typeof summarizeStep>>,
    rates: {
      completion: percent(
        allTime.checklist_completed,
        allTime.checklist_viewed
      ),
    },
  };
}
