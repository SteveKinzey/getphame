export type DiagnosticSnapshotPresetDays = 7 | 30;

export type DiagnosticSnapshotDateRange = {
  startDate: string;
  endDate: string;
};

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Return an inclusive UTC reporting range ending on the current UTC day.
 * The reporting backend converts the end date to the next UTC midnight for
 * its half-open database query, so this produces exactly `days` calendar days.
 */
export function getDiagnosticSnapshotPresetRange(
  days: DiagnosticSnapshotPresetDays,
  now = new Date()
): DiagnosticSnapshotDateRange {
  const endUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startUtc = new Date(endUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - (days - 1));

  return {
    startDate: formatUtcDate(startUtc),
    endDate: formatUtcDate(endUtc),
  };
}

export function matchesDiagnosticSnapshotPreset(
  range: DiagnosticSnapshotDateRange,
  days: DiagnosticSnapshotPresetDays,
  now = new Date()
): boolean {
  const preset = getDiagnosticSnapshotPresetRange(days, now);
  return (
    range.startDate === preset.startDate && range.endDate === preset.endDate
  );
}
