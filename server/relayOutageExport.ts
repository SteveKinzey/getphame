import { serializePreparedCsvRows } from "../shared/authHealthHistoryCsv";
import type { OutageRecord } from "./relayHealth";
import { sanitizeRelayDiagnostic } from "./relayHealth";

export const RELAY_OUTAGE_CSV_PREVIEW_LIMIT = 25;

export const RELAY_OUTAGE_EXPORT_COLUMNS = [
  { key: "outageId", csvHeader: "outage_id" },
  { key: "startedAtUtc", csvHeader: "started_at_utc" },
  { key: "resolvedAtUtc", csvHeader: "resolved_at_utc" },
  { key: "status", csvHeader: "status" },
  { key: "durationMinutes", csvHeader: "duration_minutes" },
  { key: "triggerSource", csvHeader: "trigger_source" },
  { key: "causeSanitized", csvHeader: "cause_sanitized" },
] as const;

export type RelayOutageExportColumnKey = (typeof RELAY_OUTAGE_EXPORT_COLUMNS)[number]["key"];
export type RelayOutageExportRow = Record<RelayOutageExportColumnKey, string>;

function formulaSafeCell(value: string | number) {
  const raw = String(value ?? "");
  return /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
}

function toUtc(value: number | null) {
  return value === null ? "" : new Date(value).toISOString();
}

export function buildRelayOutageExportRows(outages: readonly OutageRecord[]): RelayOutageExportRow[] {
  return outages.map((outage) => ({
    outageId: formulaSafeCell(outage.id),
    startedAtUtc: formulaSafeCell(toUtc(outage.startedAt)),
    resolvedAtUtc: formulaSafeCell(toUtc(outage.resolvedAt)),
    status: formulaSafeCell(outage.status),
    durationMinutes: formulaSafeCell(outage.durationMinutes),
    triggerSource: formulaSafeCell(outage.triggerSource.slice(0, 32)),
    causeSanitized: formulaSafeCell(sanitizeRelayDiagnostic(outage.cause)),
  }));
}

function buildRelayOutageCsvFilename(generatedAt = Date.now()) {
  return `getphame-email-relay-outages-${new Date(generatedAt).toISOString().slice(0, 10)}.csv`;
}

export function buildRelayOutageCsvExport(input: {
  outages: readonly OutageRecord[];
  totalMatching: number;
  truncated: boolean;
  snapshotToMs: number;
  generatedAt?: number;
}) {
  const generatedAt = input.generatedAt ?? Date.now();
  const rows = buildRelayOutageExportRows(input.outages);
  return {
    filename: buildRelayOutageCsvFilename(generatedAt),
    mimeType: "text/csv;charset=utf-8",
    csv: serializePreparedCsvRows(rows, RELAY_OUTAGE_EXPORT_COLUMNS),
    clipboardText: serializePreparedCsvRows(rows, RELAY_OUTAGE_EXPORT_COLUMNS, false),
    generatedAt,
    snapshotToMs: input.snapshotToMs,
    rowCount: rows.length,
    totalMatching: input.totalMatching,
    truncated: input.truncated,
    availableColumns: RELAY_OUTAGE_EXPORT_COLUMNS.map(({ key, csvHeader }) => ({ key, csvHeader })),
    preview: {
      columns: RELAY_OUTAGE_EXPORT_COLUMNS,
      rows: rows.slice(0, RELAY_OUTAGE_CSV_PREVIEW_LIMIT),
      rowCount: Math.min(rows.length, RELAY_OUTAGE_CSV_PREVIEW_LIMIT),
      limit: RELAY_OUTAGE_CSV_PREVIEW_LIMIT,
      truncated: rows.length > RELAY_OUTAGE_CSV_PREVIEW_LIMIT,
    },
  };
}
