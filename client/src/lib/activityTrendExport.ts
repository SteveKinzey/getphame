export interface ActivityTrendExportPoint {
  date: string;
  sends: number;
  opens: number;
  clicks: number;
}

export type ActivityTrendExportFormat = "csv" | "png";
export const ACTIVITY_TREND_EXPORT_SERIES = [
  "sends",
  "opens",
  "clicks",
] as const;
export type ActivityTrendExportSeries =
  (typeof ACTIVITY_TREND_EXPORT_SERIES)[number];

const SERIES_HEADER: Record<ActivityTrendExportSeries, string> = {
  sends: "Sent",
  opens: "Opens",
  clicks: "Clicks",
};

const SERIES_FILENAME: Record<ActivityTrendExportSeries, string> = {
  sends: "sent",
  opens: "opens",
  clicks: "clicks",
};

function sortByDate(
  points: ActivityTrendExportPoint[]
): ActivityTrendExportPoint[] {
  return [...points].sort((left, right) => left.date.localeCompare(right.date));
}

function normalizeSeries(
  selectedSeries: readonly ActivityTrendExportSeries[]
): ActivityTrendExportSeries[] {
  return ACTIVITY_TREND_EXPORT_SERIES.filter(series =>
    selectedSeries.includes(series)
  );
}

export function hasActivityTrendData(
  points: ActivityTrendExportPoint[] | undefined,
  selectedSeries: readonly ActivityTrendExportSeries[] = ACTIVITY_TREND_EXPORT_SERIES
): points is ActivityTrendExportPoint[] {
  const normalizedSeries = normalizeSeries(selectedSeries);
  return Boolean(
    normalizedSeries.length > 0 &&
      points?.some(point => normalizedSeries.some(series => point[series] > 0))
  );
}

export function buildActivityTrendExportFilename(
  points: ActivityTrendExportPoint[],
  format: ActivityTrendExportFormat,
  selectedSeries: readonly ActivityTrendExportSeries[] = ACTIVITY_TREND_EXPORT_SERIES
): string | null {
  const normalizedSeries = normalizeSeries(selectedSeries);
  if (points.length === 0 || normalizedSeries.length === 0) return null;
  const sorted = sortByDate(points);
  const start = sorted[0]?.date;
  const end = sorted.at(-1)?.date;
  if (!start || !end) return null;

  const seriesSuffix =
    normalizedSeries.length === ACTIVITY_TREND_EXPORT_SERIES.length
      ? ""
      : `-${normalizedSeries.map(series => SERIES_FILENAME[series]).join("-")}`;

  return `get-phame-activity-trend-${start}-to-${end}${seriesSuffix}.${format}`;
}

export function serializeActivityTrendCsv(
  points: ActivityTrendExportPoint[],
  selectedSeries: readonly ActivityTrendExportSeries[] = ACTIVITY_TREND_EXPORT_SERIES
): string {
  const normalizedSeries = normalizeSeries(selectedSeries);
  const header = [
    "Date",
    ...normalizedSeries.map(series => SERIES_HEADER[series]),
  ].join(",");
  const lines = sortByDate(points).map(point =>
    [point.date, ...normalizedSeries.map(series => point[series])].join(",")
  );
  return [header, ...lines].join("\n");
}
