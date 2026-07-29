export type ActivityTrendExportPoint = {
  date: string;
  sends: number;
  opens: number;
  clicks: number;
};

export type ActivityTrendExportFormat = "csv" | "png";

function sortByDate(points: ActivityTrendExportPoint[]): ActivityTrendExportPoint[] {
  return [...points].sort((left, right) => left.date.localeCompare(right.date));
}

export function hasActivityTrendData(points: ActivityTrendExportPoint[] | undefined): points is ActivityTrendExportPoint[] {
  return Boolean(points?.some((point) => point.sends > 0 || point.opens > 0 || point.clicks > 0));
}

export function buildActivityTrendExportFilename(
  points: ActivityTrendExportPoint[],
  format: ActivityTrendExportFormat,
): string | null {
  if (points.length === 0) return null;
  const sorted = sortByDate(points);
  const start = sorted[0]?.date;
  const end = sorted.at(-1)?.date;
  if (!start || !end) return null;
  return `get-phame-activity-trend-${start}-to-${end}.${format}`;
}

export function serializeActivityTrendCsv(points: ActivityTrendExportPoint[]): string {
  const lines = sortByDate(points).map((point) =>
    [point.date, point.sends, point.opens, point.clicks].join(","),
  );
  return ["Date,Sent,Opens,Clicks", ...lines].join("\n");
}
