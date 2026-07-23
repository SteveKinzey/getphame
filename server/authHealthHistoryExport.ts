import type { AuthHealthCheck } from "../drizzle/schema";
import { redactAuthDiagnosticDetail } from "./authOperations";
import { serializePreparedCsvRows } from "../shared/authHealthHistoryCsv";

export const AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT = 25;

export const AUTH_HEALTH_HISTORY_EXPORT_COLUMNS = [
  { key: "recordId", csvHeader: "record_id" },
  { key: "checkedAtUtc", csvHeader: "checked_at_utc" },
  { key: "triggerSource", csvHeader: "trigger_source" },
  { key: "overallStatus", csvHeader: "overall_status" },
  { key: "configStatus", csvHeader: "config_status" },
  { key: "databaseStatus", csvHeader: "database_status" },
  { key: "userSchemaStatus", csvHeader: "user_schema_status" },
  { key: "magicLinkSchemaStatus", csvHeader: "magic_link_schema_status" },
  { key: "sessionStatus", csvHeader: "session_status" },
  { key: "emailProviderStatus", csvHeader: "email_provider_status" },
  { key: "providerName", csvHeader: "provider_name" },
  { key: "failureCode", csvHeader: "failure_code" },
  { key: "failureDetailSanitized", csvHeader: "failure_detail_sanitized" },
  { key: "durationMs", csvHeader: "duration_ms" },
] as const;

export type AuthHealthHistoryExportColumnKey = (typeof AUTH_HEALTH_HISTORY_EXPORT_COLUMNS)[number]["key"];
export type AuthHealthHistoryExportRow = Record<AuthHealthHistoryExportColumnKey, string>;

export const AUTH_HEALTH_HISTORY_EXPORT_COLUMN_KEYS = AUTH_HEALTH_HISTORY_EXPORT_COLUMNS
  .map((column) => column.key) as [AuthHealthHistoryExportColumnKey, ...AuthHealthHistoryExportColumnKey[]];

function safeText(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  return redactAuthDiagnosticDetail(value).slice(0, maxLength);
}

function formulaSafeCell(value: string | number) {
  const raw = String(value ?? "");
  return /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
}

export function buildAuthHealthHistoryExportRows(rows: AuthHealthCheck[]): AuthHealthHistoryExportRow[] {
  return rows.map((row) => ({
    recordId: formulaSafeCell(row.id),
    checkedAtUtc: formulaSafeCell(new Date(row.checkedAt).toISOString()),
    triggerSource: formulaSafeCell(row.triggerSource),
    overallStatus: formulaSafeCell(row.overallStatus),
    configStatus: formulaSafeCell(row.configStatus),
    databaseStatus: formulaSafeCell(row.databaseStatus),
    userSchemaStatus: formulaSafeCell(row.userSchemaStatus),
    magicLinkSchemaStatus: formulaSafeCell(row.magicLinkSchemaStatus),
    sessionStatus: formulaSafeCell(row.sessionStatus),
    emailProviderStatus: formulaSafeCell(row.emailProviderStatus),
    providerName: formulaSafeCell(safeText(row.providerName, 64)),
    failureCode: formulaSafeCell(safeText(row.failureCode, 64)),
    failureDetailSanitized: formulaSafeCell(safeText(row.failureDetail, 500)),
    durationMs: formulaSafeCell(row.durationMs),
  }));
}

function getAuthHealthHistoryExportColumns(selectedColumns?: readonly AuthHealthHistoryExportColumnKey[]) {
  if (!selectedColumns) return AUTH_HEALTH_HISTORY_EXPORT_COLUMNS;
  const selected = new Set(selectedColumns);
  return AUTH_HEALTH_HISTORY_EXPORT_COLUMNS.filter((column) => selected.has(column.key));
}

function serializeAuthHealthHistoryExportRows(
  rows: AuthHealthHistoryExportRow[],
  selectedColumns?: readonly AuthHealthHistoryExportColumnKey[],
  includeBom = true,
) {
  const columns = getAuthHealthHistoryExportColumns(selectedColumns);
  return serializePreparedCsvRows<AuthHealthHistoryExportColumnKey>(rows, columns, includeBom);
}

export function serializeAuthHealthHistoryCsv(rows: AuthHealthCheck[]) {
  return serializeAuthHealthHistoryExportRows(buildAuthHealthHistoryExportRows(rows));
}

export function buildAuthHealthHistoryCsvExport(input: {
  rows: AuthHealthCheck[];
  total: number;
  truncated: boolean;
  status?: "ok" | "fail";
  triggerSource?: "scheduled" | "manual";
  fromMs?: number;
  toMs?: number;
  fromDate?: string;
  toDate?: string;
  selectedColumns?: readonly AuthHealthHistoryExportColumnKey[];
  snapshotToMs?: number;
  generatedAt?: number;
}) {
  const generatedAt = input.generatedAt ?? Date.now();
  const exportRows = buildAuthHealthHistoryExportRows(input.rows);
  const previewRows = exportRows.slice(0, AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT);
  const selectedColumns = getAuthHealthHistoryExportColumns(input.selectedColumns);
  const selectedColumnKeys = selectedColumns.map((column) => column.key);
  return {
    filename: buildAuthHealthHistoryCsvFilename(input, generatedAt),
    mimeType: "text/csv;charset=utf-8",
    csv: serializeAuthHealthHistoryExportRows(exportRows, selectedColumnKeys),
    clipboardText: serializeAuthHealthHistoryExportRows(exportRows, selectedColumnKeys, false),
    generatedAt,
    snapshotToMs: input.snapshotToMs ?? generatedAt,
    rowCount: input.rows.length,
    totalMatching: input.total,
    truncated: input.truncated,
    availableColumns: AUTH_HEALTH_HISTORY_EXPORT_COLUMNS.map(({ key, csvHeader }) => ({ key, csvHeader })),
    searchRows: exportRows,
    preview: {
      columns: selectedColumns.map(({ key, csvHeader }) => ({ key, csvHeader })),
      rows: previewRows,
      rowCount: previewRows.length,
      limit: AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT,
      truncated: exportRows.length > previewRows.length,
    },
    filters: {
      status: input.status ?? "all",
      triggerSource: input.triggerSource ?? "all",
      fromMs: input.fromMs ?? null,
      toMs: input.toMs ?? null,
    },
  };
}

function normalizeCsvDateLabel(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return undefined;
  return value;
}

export function buildAuthHealthHistoryCsvFilename(
  input: { fromDate?: string; toDate?: string },
  generatedAt = Date.now(),
) {
  const fromDate = normalizeCsvDateLabel(input.fromDate);
  const toDate = normalizeCsvDateLabel(input.toDate);
  if (fromDate && toDate) return `getphame-auth-health-history-${fromDate}-to-${toDate}.csv`;
  if (fromDate) return `getphame-auth-health-history-from-${fromDate}.csv`;
  if (toDate) return `getphame-auth-health-history-through-${toDate}.csv`;
  return `getphame-auth-health-history-${new Date(generatedAt).toISOString().slice(0, 10)}.csv`;
}
