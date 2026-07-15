import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import { smtpAdminAuditLogs } from "../drizzle/schema";

export type SmtpAuditOutcomeFilter = "all" | "removed";

export type SmtpAuditFilters = {
  dateFrom?: number;
  dateTo?: number;
  adminId?: number;
  outcome: SmtpAuditOutcomeFilter;
};

export type SmtpAuditCsvEntry = {
  occurredAt: number;
  outcome: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
  smtpUser: string;
};

export function buildSmtpAuditWhere(filters: SmtpAuditFilters): SQL | undefined {
  const clauses = [
    filters.dateFrom === undefined ? undefined : gte(smtpAdminAuditLogs.occurredAt, filters.dateFrom),
    filters.dateTo === undefined ? undefined : lte(smtpAdminAuditLogs.occurredAt, filters.dateTo),
    filters.adminId === undefined ? undefined : eq(smtpAdminAuditLogs.actorUserId, filters.adminId),
    filters.outcome === "all" ? undefined : eq(smtpAdminAuditLogs.outcome, filters.outcome),
  ].filter((clause): clause is SQL => clause !== undefined);

  return clauses.length ? and(...clauses) : undefined;
}

function escapeCsvCell(value: string | number | null): string {
  const text = String(value ?? "");
  const spreadsheetSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
}

export function buildSmtpAuditCsv(entries: SmtpAuditCsvEntry[]): string {
  const header = [
    "Occurred at",
    "Administrator",
    "Administrator email",
    "Target account",
    "Target email",
    "SMTP user",
    "Action",
    "Outcome",
  ];
  const rows = entries.map((entry) => [
    new Date(entry.occurredAt).toISOString(),
    entry.actorName,
    entry.actorEmail,
    entry.targetName,
    entry.targetEmail,
    entry.smtpUser,
    entry.action,
    entry.outcome,
  ]);

  return `\uFEFF${[header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

export function buildSmtpAuditCsvFilename(now = new Date()): string {
  return `getphame-smtp-removal-audit-${now.toISOString().slice(0, 10)}.csv`;
}
