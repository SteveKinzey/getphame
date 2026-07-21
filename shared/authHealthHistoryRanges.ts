export const AUTH_HEALTH_HISTORY_RELATIVE_DAYS = [7, 30] as const;

export const AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT = "Alt+Shift+C";

type ShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};

export type AuthHealthHistoryShortcutEvent = {
  key: string;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  target: EventTarget | null;
};

export function isEditableAuthHealthHistoryShortcutTarget(target: EventTarget | null) {
  const candidate = target as ShortcutTarget | null;
  if (!candidate) return false;
  const tagName = candidate.tagName?.toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (candidate.isContentEditable) return true;
  return Boolean(candidate.closest?.('[contenteditable="true"]'));
}

export function shouldClearAuthHealthHistoryFiltersFromShortcut(event: AuthHealthHistoryShortcutEvent) {
  return event.key.toLowerCase() === "c"
    && event.altKey
    && event.shiftKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.repeat
    && !isEditableAuthHealthHistoryShortcutTarget(event.target);
}

export type AuthHealthHistoryRelativeDays = typeof AUTH_HEALTH_HISTORY_RELATIVE_DAYS[number];

export type AuthHealthHistoryFilterChipKey = "status" | "triggerSource" | "from" | "to";

export type AuthHealthHistoryFilterState = {
  status: "all" | "ok" | "fail";
  triggerSource: "all" | "scheduled" | "manual";
  from: string;
  to: string;
  page: number;
};

export function clearAuthHealthHistoryFilter(state: AuthHealthHistoryFilterState, key: AuthHealthHistoryFilterChipKey) {
  return {
    ...state,
    status: key === "status" ? "all" as const : state.status,
    triggerSource: key === "triggerSource" ? "all" as const : state.triggerSource,
    from: key === "from" ? "" : state.from,
    to: key === "to" ? "" : state.to,
    page: 1,
  };
}

export function clearAllAuthHealthHistoryFilters() {
  return { status: "all" as const, triggerSource: "all" as const, from: "", to: "", page: 1 };
}

export function getActiveAuthHealthHistoryFilterChips(filters: {
  status: "all" | "ok" | "fail";
  triggerSource: "all" | "scheduled" | "manual";
  from: string;
  to: string;
}) {
  const chips: Array<{ key: AuthHealthHistoryFilterChipKey; label: string }> = [];
  if (filters.status !== "all") chips.push({ key: "status", label: `Status: ${filters.status === "ok" ? "Healthy" : "Failures"}` });
  if (filters.triggerSource !== "all") chips.push({ key: "triggerSource", label: `Source: ${filters.triggerSource === "manual" ? "Administrator" : "Scheduled"}` });
  if (filters.from) chips.push({ key: "from", label: `From: ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `To: ${filters.to}` });
  return chips;
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRelativeAuthHealthHistoryDateInputs(
  days: AuthHealthHistoryRelativeDays,
  now = new Date(),
) {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return {
    from: toLocalDateInput(from),
    to: toLocalDateInput(to),
  };
}
