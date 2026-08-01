import type { PwaUpdateTelemetryEvent } from "@shared/pwaUpdateTelemetry";

export type PwaUpdateTelemetryRow = {
  event: string;
  eventDay: string;
  total: number;
};

type EventCounts = Record<PwaUpdateTelemetryEvent, number>;

function emptyCounts(): EventCounts {
  return {
    notice_shown: 0,
    update_requested: 0,
    update_deferred: 0,
    update_blocked: 0,
    update_discard_confirmed: 0,
    update_applying: 0,
  };
}

function asEvent(value: string): PwaUpdateTelemetryEvent | null {
  const counts = emptyCounts();
  return Object.hasOwn(counts, value)
    ? (value as PwaUpdateTelemetryEvent)
    : null;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

export function getPwaUpdateTelemetryDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Produces authorized-admin aggregates only. Raw records and row-level dates
 * stay in the database; no account, browser, network, or deployment data is
 * represented in this model.
 */
export function summarizePwaUpdateTelemetry(
  rows: PwaUpdateTelemetryRow[],
  now = new Date()
) {
  const allTime = emptyCounts();
  const last30Days = emptyCounts();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  const firstIncludedDay = getPwaUpdateTelemetryDay(thirtyDaysAgo);

  for (const row of rows) {
    const event = asEvent(row.event);
    if (!event || !Number.isFinite(row.total) || row.total <= 0) continue;

    allTime[event] += row.total;
    if (row.eventDay >= firstIncludedDay) last30Days[event] += row.total;
  }

  return {
    allTime,
    last30Days,
    rates: {
      requestRate: percent(allTime.update_requested, allTime.notice_shown),
      deferralRate: percent(allTime.update_deferred, allTime.notice_shown),
      applyingRate: percent(allTime.update_applying, allTime.update_requested),
      blockedRate: percent(allTime.update_blocked, allTime.update_requested),
    },
  };
}
