import type { AuthHealthCheck } from "../drizzle/schema";
import { escapeAdminOperationsCsvCell } from "./adminOperationsExport";
import { redactAuthDiagnosticDetail } from "./authOperations";

const headers = [
  "record_id",
  "checked_at_utc",
  "trigger_source",
  "overall_status",
  "config_status",
  "database_status",
  "user_schema_status",
  "magic_link_schema_status",
  "session_status",
  "email_provider_status",
  "provider_name",
  "failure_code",
  "failure_detail_sanitized",
  "duration_ms",
];

function safeText(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  return redactAuthDiagnosticDetail(value).slice(0, maxLength);
}

export function serializeAuthHealthHistoryCsv(rows: AuthHealthCheck[]) {
  const body = rows.map((row) => [
    row.id,
    new Date(row.checkedAt).toISOString(),
    row.triggerSource,
    row.overallStatus,
    row.configStatus,
    row.databaseStatus,
    row.userSchemaStatus,
    row.magicLinkSchemaStatus,
    row.sessionStatus,
    row.emailProviderStatus,
    safeText(row.providerName, 64),
    safeText(row.failureCode, 64),
    safeText(row.failureDetail, 500),
    row.durationMs,
  ].map(escapeAdminOperationsCsvCell).join(","));

  return `\uFEFF${headers.join(",")}\r\n${body.join("\r\n")}\r\n`;
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
  generatedAt?: number;
}) {
  const generatedAt = input.generatedAt ?? Date.now();
  return {
    filename: buildAuthHealthHistoryCsvFilename(input, generatedAt),
    mimeType: "text/csv;charset=utf-8",
    csv: serializeAuthHealthHistoryCsv(input.rows),
    generatedAt,
    rowCount: input.rows.length,
    totalMatching: input.total,
    truncated: input.truncated,
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
