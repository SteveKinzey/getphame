export const AUTH_HEALTH_HISTORY_RELATIVE_DAYS = [7, 30] as const;

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
