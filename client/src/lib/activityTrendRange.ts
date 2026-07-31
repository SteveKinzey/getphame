export const MAX_ACTIVITY_TREND_CUSTOM_DAYS = 366;

export type ActivityTrendRangeError =
  | "missing"
  | "invalidDate"
  | "invalidOrder"
  | "futureEnd"
  | "rangeTooLong";

export type ActivityTrendCustomQuery = {
  startDate: string;
  endDate: string;
  timeZone: string;
  startTimezoneOffsetMinutes: number;
  endTimezoneOffsetMinutes: number;
};

export type ActivityTrendRangeResult = {
  query: ActivityTrendCustomQuery | null;
  days: number | null;
  error: ActivityTrendRangeError | null;
};

function parseInputDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function toActivityTrendInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultActivityTrendRange(now = new Date()): {
  startDate: string;
  endDate: string;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 29);
  return {
    startDate: toActivityTrendInputDate(start),
    endDate: toActivityTrendInputDate(now),
  };
}

export function resolveActivityTrendCustomRange(
  startDate: string,
  endDate: string,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
): ActivityTrendRangeResult {
  if (!startDate || !endDate) {
    return { query: null, days: null, error: "missing" };
  }

  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end) {
    return { query: null, days: null, error: "invalidDate" };
  }

  const startUtcDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endUtcDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.floor((endUtcDay - startUtcDay) / 86_400_000) + 1;
  if (days < 1) {
    return { query: null, days: null, error: "invalidOrder" };
  }
  if (days > MAX_ACTIVITY_TREND_CUSTOM_DAYS) {
    return { query: null, days, error: "rangeTooLong" };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (end.getTime() > today.getTime()) {
    return { query: null, days, error: "futureEnd" };
  }

  const endExclusive = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1
  );

  return {
    query: {
      startDate,
      endDate,
      timeZone,
      startTimezoneOffsetMinutes: start.getTimezoneOffset(),
      endTimezoneOffsetMinutes: endExclusive.getTimezoneOffset(),
    },
    days,
    error: null,
  };
}
