const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyTrendPoint = {
  date: string;
  sends: number;
  opens: number;
  clicks: number;
};

type SendRow = {
  sentAt: Date;
};

type EventRow = {
  createdAt: Date;
  requestId: number;
  type: string;
};

function toUtcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Builds a dense UTC day series from raw timestamp rows.
 *
 * TiDB rejects the previous DATE(column) SELECT/GROUP BY combination used by
 * Drizzle in this project. Aggregating the bounded 7–90 day result set here
 * keeps the query portable and preserves distinct-request open/click counts.
 */
export function buildDailyTrend(input: {
  days: number;
  nowMs: number;
  sendRows: SendRow[];
  eventRows: EventRow[];
}): DailyTrendPoint[] {
  const sendsByDay = new Map<string, number>();
  const opensByDay = new Map<string, Set<number>>();
  const clicksByDay = new Map<string, Set<number>>();

  for (const row of input.sendRows) {
    const day = toUtcDay(row.sentAt);
    sendsByDay.set(day, (sendsByDay.get(day) ?? 0) + 1);
  }

  for (const row of input.eventRows) {
    const day = toUtcDay(row.createdAt);
    const target = row.type === "open"
      ? opensByDay
      : row.type === "click"
        ? clicksByDay
        : null;

    if (!target) continue;
    const requestIds = target.get(day) ?? new Set<number>();
    requestIds.add(row.requestId);
    target.set(day, requestIds);
  }

  const result: DailyTrendPoint[] = [];
  for (let i = input.days - 1; i >= 0; i--) {
    const date = new Date(input.nowMs - i * DAY_MS).toISOString().slice(0, 10);
    result.push({
      date,
      sends: sendsByDay.get(date) ?? 0,
      opens: opensByDay.get(date)?.size ?? 0,
      clicks: clicksByDay.get(date)?.size ?? 0,
    });
  }

  return result;
}
