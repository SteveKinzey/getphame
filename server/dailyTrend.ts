const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_TIMEZONE_OFFSET_MINUTES = -14 * 60;
const MAX_TIMEZONE_OFFSET_MINUTES = 14 * 60;

export const MAX_ACTIVITY_TREND_RANGE_DAYS = 366;

export type DailyTrendPoint = {
  date: string;
  sends: number;
  opens: number;
  clicks: number;
};

type SendRow = {
  sentAt: Date | null;
};

type EventRow = {
  createdAt: Date;
  requestId: number;
  type: string;
};

export type DailyTrendRangeInput = {
  days?: number;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
  startTimezoneOffsetMinutes?: number;
  endTimezoneOffsetMinutes?: number;
};

export type ResolvedDailyTrendRange = {
  startDate: string;
  endDate: string;
  startAt: Date;
  endExclusive: Date;
  days: number;
  timeZone: string;
  isCustom: boolean;
};

export class DailyTrendRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyTrendRangeError";
  }
}

function parseDateParts(value: string): [number, number, number] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DailyTrendRangeError("Choose valid Activity Trend dates.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new DailyTrendRangeError("Choose valid Activity Trend dates.");
  }
  return [year, month, day];
}

function shiftCalendarDate(value: string, days: number): string {
  const [year, month, day] = parseDateParts(value);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function calendarDayCount(startDate: string, endDate: string): number {
  const [startYear, startMonth, startDay] = parseDateParts(startDate);
  const [endYear, endMonth, endDay] = parseDateParts(endDate);
  return (
    Math.floor(
      (Date.UTC(endYear, endMonth - 1, endDay) -
        Date.UTC(startYear, startMonth - 1, startDay)) /
        DAY_MS
    ) + 1
  );
}

function localDateForInstant(instantMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instantMs));
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  const day = parts.find(part => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new DailyTrendRangeError(
      "Choose a valid timezone for the Activity Trend range."
    );
  }
  return `${year}-${month}-${day}`;
}

function localBoundary(
  calendarDate: string,
  timezoneOffsetMinutes: number
): Date {
  const [year, month, day] = parseDateParts(calendarDate);
  return new Date(
    Date.UTC(year, month - 1, day) + timezoneOffsetMinutes * 60_000
  );
}

export function resolveDailyTrendRange(
  input: DailyTrendRangeInput,
  nowMs = Date.now()
): ResolvedDailyTrendRange {
  const hasCustomRange = Boolean(input.startDate || input.endDate);

  if (!hasCustomRange) {
    const days = input.days ?? 30;
    if (!Number.isInteger(days) || days < 7 || days > 90) {
      throw new DailyTrendRangeError(
        "Choose a preset Activity Trend range between 7 and 90 days."
      );
    }
    const endDate = new Date(nowMs).toISOString().slice(0, 10);
    const startDate = shiftCalendarDate(endDate, -(days - 1));
    return {
      startDate,
      endDate,
      startAt: localBoundary(startDate, 0),
      endExclusive: localBoundary(shiftCalendarDate(endDate, 1), 0),
      days,
      timeZone: "UTC",
      isCustom: false,
    };
  }

  if (!input.startDate || !input.endDate) {
    throw new DailyTrendRangeError(
      "Choose both a start and end date for Activity Trend."
    );
  }
  if (input.days !== undefined) {
    throw new DailyTrendRangeError(
      "Choose either a preset period or a custom Activity Trend range."
    );
  }

  const boundaryOffsets = [
    input.startTimezoneOffsetMinutes,
    input.endTimezoneOffsetMinutes,
  ];
  if (
    !input.timeZone ||
    boundaryOffsets.some(
      offset =>
        !Number.isInteger(offset) ||
        offset === undefined ||
        offset < MIN_TIMEZONE_OFFSET_MINUTES ||
        offset > MAX_TIMEZONE_OFFSET_MINUTES
    )
  ) {
    throw new DailyTrendRangeError(
      "Choose a valid timezone for the Activity Trend range."
    );
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone }).format(
      new Date(nowMs)
    );
  } catch {
    throw new DailyTrendRangeError(
      "Choose a valid timezone for the Activity Trend range."
    );
  }

  const days = calendarDayCount(input.startDate, input.endDate);
  if (days < 1) {
    throw new DailyTrendRangeError(
      "The Activity Trend end date must be on or after its start date."
    );
  }
  if (days > MAX_ACTIVITY_TREND_RANGE_DAYS) {
    throw new DailyTrendRangeError(
      `Choose an Activity Trend range of ${MAX_ACTIVITY_TREND_RANGE_DAYS} days or fewer.`
    );
  }

  const localToday = localDateForInstant(nowMs, input.timeZone);
  if (input.endDate > localToday) {
    throw new DailyTrendRangeError(
      "The Activity Trend end date cannot be in the future."
    );
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    startAt: localBoundary(
      input.startDate,
      input.startTimezoneOffsetMinutes as number
    ),
    endExclusive: localBoundary(
      shiftCalendarDate(input.endDate, 1),
      input.endTimezoneOffsetMinutes as number
    ),
    days,
    timeZone: input.timeZone,
    isCustom: true,
  };
}

function toCalendarDay(value: Date, timeZone: string): string {
  return localDateForInstant(value.getTime(), timeZone);
}

/**
 * Builds a dense calendar-day series from bounded raw timestamp rows.
 *
 * TiDB rejects the previous DATE(column) SELECT/GROUP BY combination used by
 * Drizzle in this project. Aggregating bounded rows here keeps the query
 * portable, preserves distinct-request open/click counts, and allows custom
 * ranges to follow the user's local calendar boundaries.
 */
export function buildDailyTrend(input: {
  startDate: string;
  days: number;
  timeZone: string;
  sendRows: SendRow[];
  eventRows: EventRow[];
}): DailyTrendPoint[] {
  const sendsByDay = new Map<string, number>();
  const opensByDay = new Map<string, Set<number>>();
  const clicksByDay = new Map<string, Set<number>>();

  for (const row of input.sendRows) {
    if (!row.sentAt) continue;
    const day = toCalendarDay(row.sentAt, input.timeZone);
    sendsByDay.set(day, (sendsByDay.get(day) ?? 0) + 1);
  }

  for (const row of input.eventRows) {
    const day = toCalendarDay(row.createdAt, input.timeZone);
    const target =
      row.type === "open"
        ? opensByDay
        : row.type === "click"
          ? clicksByDay
          : null;

    if (!target) continue;
    const requestIds = target.get(day) ?? new Set<number>();
    requestIds.add(row.requestId);
    target.set(day, requestIds);
  }

  return Array.from({ length: input.days }, (_, index) => {
    const date = shiftCalendarDate(input.startDate, index);
    return {
      date,
      sends: sendsByDay.get(date) ?? 0,
      opens: opensByDay.get(date)?.size ?? 0,
      clicks: clicksByDay.get(date)?.size ?? 0,
    };
  });
}
