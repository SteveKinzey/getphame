import {
  escapePreparedCsvCell,
  serializePreparedCsvRows,
  type PreparedCsvColumn,
} from "../shared/authHealthHistoryCsv";

export const MONTHLY_DIAGNOSTICS_AUTH_ROW_LIMIT = 5_000;
export const MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT = 1024 * 1024;

const CONSENT_COLUMNS = [
  { key: "reportMonthUtc", csvHeader: "report_month_utc" },
  {
    key: "snapshotGeneratedAtUtc",
    csvHeader: "snapshot_generated_at_utc",
  },
  { key: "savedContactsTotal", csvHeader: "saved_contacts_total" },
  { key: "explicitConsentTotal", csvHeader: "explicit_consent_total" },
  {
    key: "withoutExplicitConsentTotal",
    csvHeader: "without_explicit_consent_total",
  },
  { key: "optedOutTotal", csvHeader: "opted_out_total" },
  {
    key: "explicitConsentPercent",
    csvHeader: "explicit_consent_percent",
  },
] as const satisfies readonly PreparedCsvColumn<ConsentColumnKey>[];

type ConsentColumnKey =
  | "reportMonthUtc"
  | "snapshotGeneratedAtUtc"
  | "savedContactsTotal"
  | "explicitConsentTotal"
  | "withoutExplicitConsentTotal"
  | "optedOutTotal"
  | "explicitConsentPercent";

const AUTH_COLUMNS = [
  { key: "checkedAtUtc", csvHeader: "checked_at_utc" },
  { key: "triggerSource", csvHeader: "trigger_source" },
  { key: "overallStatus", csvHeader: "overall_status" },
  { key: "configStatus", csvHeader: "config_status" },
  { key: "databaseStatus", csvHeader: "database_status" },
  { key: "userSchemaStatus", csvHeader: "user_schema_status" },
  {
    key: "magicLinkSchemaStatus",
    csvHeader: "magic_link_schema_status",
  },
  { key: "sessionStatus", csvHeader: "session_status" },
  {
    key: "emailProviderStatus",
    csvHeader: "email_provider_status",
  },
  { key: "failureCode", csvHeader: "failure_code" },
  { key: "durationMs", csvHeader: "duration_ms" },
] as const satisfies readonly PreparedCsvColumn<AuthColumnKey>[];

type AuthColumnKey =
  | "checkedAtUtc"
  | "triggerSource"
  | "overallStatus"
  | "configStatus"
  | "databaseStatus"
  | "userSchemaStatus"
  | "magicLinkSchemaStatus"
  | "sessionStatus"
  | "emailProviderStatus"
  | "failureCode"
  | "durationMs";

export type MonthlyDiagnosticsAuthRow = {
  id: number;
  checkedAt: number;
  triggerSource: string;
  overallStatus: string;
  configStatus: string;
  databaseStatus: string;
  userSchemaStatus: string;
  magicLinkSchemaStatus: string;
  sessionStatus: string;
  emailProviderStatus: string;
  failureCode: string | null;
  durationMs: number;
};

export type MonthlyDiagnosticsConsentAggregate = {
  savedContactsTotal: number;
  explicitConsentTotal: number;
  optedOutTotal: number;
};

export type MonthlyDiagnosticsAttachment = {
  filename: string;
  mimeType: "text/csv";
  content: string;
  byteLength: number;
};

export type MonthlyDiagnosticsReportWindow = {
  reportMonthKey: string;
  periodStartMs: number;
  periodEndExclusiveMs: number;
  snapshotGeneratedAtMs: number;
};

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function boundedDiagnosticCell(
  value: string | null,
  maxLength: number
): string {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function deriveCompletedPreviousUtcMonth(
  snapshotGeneratedAtMs: number
): MonthlyDiagnosticsReportWindow {
  if (!Number.isFinite(snapshotGeneratedAtMs)) {
    throw new Error("INVALID_SNAPSHOT_TIMESTAMP");
  }
  const snapshot = new Date(Math.trunc(snapshotGeneratedAtMs));
  const periodEndExclusiveMs = Date.UTC(
    snapshot.getUTCFullYear(),
    snapshot.getUTCMonth(),
    1
  );
  const periodStart = new Date(periodEndExclusiveMs);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
  const periodStartMs = periodStart.getTime();
  return {
    reportMonthKey: periodStart.toISOString().slice(0, 7),
    periodStartMs,
    periodEndExclusiveMs,
    snapshotGeneratedAtMs: Math.trunc(snapshotGeneratedAtMs),
  };
}

export function getUtcMonthBounds(reportMonthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(reportMonthKey)) {
    throw new Error("INVALID_REPORT_MONTH_KEY");
  }
  const [year, month] = reportMonthKey.split("-").map(Number);
  if (month < 1 || month > 12) throw new Error("INVALID_REPORT_MONTH_KEY");
  const periodStartMs = Date.UTC(year, month - 1, 1);
  const periodEndExclusiveMs = Date.UTC(year, month, 1);
  if (new Date(periodStartMs).toISOString().slice(0, 7) !== reportMonthKey) {
    throw new Error("INVALID_REPORT_MONTH_KEY");
  }
  return { periodStartMs, periodEndExclusiveMs };
}

function buildAuthRow(
  row: MonthlyDiagnosticsAuthRow
): Record<AuthColumnKey, string> {
  return {
    checkedAtUtc: new Date(row.checkedAt).toISOString(),
    triggerSource: boundedDiagnosticCell(row.triggerSource, 16),
    overallStatus: boundedDiagnosticCell(row.overallStatus, 16),
    configStatus: boundedDiagnosticCell(row.configStatus, 16),
    databaseStatus: boundedDiagnosticCell(row.databaseStatus, 16),
    userSchemaStatus: boundedDiagnosticCell(row.userSchemaStatus, 16),
    magicLinkSchemaStatus: boundedDiagnosticCell(row.magicLinkSchemaStatus, 16),
    sessionStatus: boundedDiagnosticCell(row.sessionStatus, 16),
    emailProviderStatus: boundedDiagnosticCell(row.emailProviderStatus, 16),
    failureCode: boundedDiagnosticCell(row.failureCode, 64),
    durationMs: String(nonNegativeInteger(row.durationMs)),
  };
}

function serializedRowByteLength<Key extends string>(
  row: Record<Key, string>,
  columns: readonly PreparedCsvColumn<Key>[]
) {
  const line = columns
    .map(column => escapePreparedCsvCell(row[column.key]))
    .join(",");
  return Buffer.byteLength(`${line}\r\n`, "utf8");
}

function fitRowsToByteLimit<Key extends string>(
  rows: readonly Record<Key, string>[],
  columns: readonly PreparedCsvColumn<Key>[],
  byteLimit: number
) {
  const emptyCsv = serializePreparedCsvRows([], columns);
  let bytes = Buffer.byteLength(emptyCsv, "utf8");
  const fitted: Record<Key, string>[] = [];
  for (const row of rows) {
    const rowBytes = serializedRowByteLength(row, columns);
    if (bytes + rowBytes > byteLimit) break;
    fitted.push(row);
    bytes += rowBytes;
  }
  return fitted;
}

export function buildMonthlyDiagnosticsExport(input: {
  snapshotGeneratedAtMs: number;
  consent: MonthlyDiagnosticsConsentAggregate;
  authRows: MonthlyDiagnosticsAuthRow[];
  authTotalMatching: number;
}) {
  const window = deriveCompletedPreviousUtcMonth(input.snapshotGeneratedAtMs);
  const savedContactsTotal = nonNegativeInteger(
    input.consent.savedContactsTotal
  );
  const explicitConsentTotal = Math.min(
    savedContactsTotal,
    nonNegativeInteger(input.consent.explicitConsentTotal)
  );
  const optedOutTotal = Math.min(
    savedContactsTotal,
    nonNegativeInteger(input.consent.optedOutTotal)
  );
  const consentRow: Record<ConsentColumnKey, string> = {
    reportMonthUtc: window.reportMonthKey,
    snapshotGeneratedAtUtc: new Date(
      window.snapshotGeneratedAtMs
    ).toISOString(),
    savedContactsTotal: String(savedContactsTotal),
    explicitConsentTotal: String(explicitConsentTotal),
    withoutExplicitConsentTotal: String(
      savedContactsTotal - explicitConsentTotal
    ),
    optedOutTotal: String(optedOutTotal),
    explicitConsentPercent:
      savedContactsTotal === 0
        ? "0.00"
        : ((explicitConsentTotal / savedContactsTotal) * 100).toFixed(2),
  };
  const consentCsv = serializePreparedCsvRows([consentRow], CONSENT_COLUMNS);
  const consentByteLength = Buffer.byteLength(consentCsv, "utf8");
  if (consentByteLength > MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT) {
    throw new Error("CONSENT_ATTACHMENT_TOO_LARGE");
  }

  const orderedAuthRows = input.authRows
    .filter(
      row =>
        row.triggerSource === "scheduled" &&
        row.checkedAt >= window.periodStartMs &&
        row.checkedAt < window.periodEndExclusiveMs
    )
    .sort(
      (left, right) => right.checkedAt - left.checkedAt || right.id - left.id
    )
    .slice(0, MONTHLY_DIAGNOSTICS_AUTH_ROW_LIMIT)
    .map(buildAuthRow);
  const fittedAuthRows = fitRowsToByteLimit(
    orderedAuthRows,
    AUTH_COLUMNS,
    MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT
  );
  const authCsv = serializePreparedCsvRows(fittedAuthRows, AUTH_COLUMNS);
  const authByteLength = Buffer.byteLength(authCsv, "utf8");
  const authTotalMatching = Math.max(
    nonNegativeInteger(input.authTotalMatching),
    orderedAuthRows.length
  );
  const authTruncated =
    authTotalMatching > fittedAuthRows.length ||
    orderedAuthRows.length > fittedAuthRows.length;

  const attachments: [
    MonthlyDiagnosticsAttachment,
    MonthlyDiagnosticsAttachment,
  ] = [
    {
      filename: `getphame-consent-posture-${window.reportMonthKey}.csv`,
      mimeType: "text/csv",
      content: consentCsv,
      byteLength: consentByteLength,
    },
    {
      filename: `getphame-auth-health-${window.reportMonthKey}.csv`,
      mimeType: "text/csv",
      content: authCsv,
      byteLength: authByteLength,
    },
  ];

  return {
    window,
    attachments,
    metadata: {
      consent: {
        savedContactsTotal,
        explicitConsentTotal,
        withoutExplicitConsentTotal: savedContactsTotal - explicitConsentTotal,
        optedOutTotal,
        explicitConsentPercent: consentRow.explicitConsentPercent,
      },
      auth: {
        totalMatching: authTotalMatching,
        exportedRows: fittedAuthRows.length,
        truncated: authTruncated,
        rowLimit: MONTHLY_DIAGNOSTICS_AUTH_ROW_LIMIT,
        byteLimit: MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT,
      },
    },
  };
}

export const MONTHLY_DIAGNOSTICS_CONSENT_HEADERS = CONSENT_COLUMNS.map(
  column => column.csvHeader
);
export const MONTHLY_DIAGNOSTICS_AUTH_HEADERS = AUTH_COLUMNS.map(
  column => column.csvHeader
);
