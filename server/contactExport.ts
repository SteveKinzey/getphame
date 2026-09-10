import type { SavedContact } from "../drizzle/schema";

export const CONTACT_CSV_EXPORT_LIMIT = 5_000;
export const CONTACT_PDF_EXPORT_LIMIT = 750;

export const CONTACT_EXPORT_COLUMNS = [
  "name",
  "email",
  "phone",
  "tags",
  "source",
  "consentStatus",
  "consentBasis",
  "consentCapturedAt",
  "totalSent",
  "lastSentAt",
  "suppressionStatus",
  "createdAt",
] as const;

export type ContactExportColumn = (typeof CONTACT_EXPORT_COLUMNS)[number];
export type ContactExportFormat = "csv" | "pdf";

export type ContactExportRow = Record<ContactExportColumn, string | number>;

const CONTACT_EXPORT_LABELS: Record<ContactExportColumn, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  tags: "Tags",
  source: "Source",
  consentStatus: "Consent Status",
  consentBasis: "Consent Basis",
  consentCapturedAt: "Consent Captured At",
  totalSent: "Send Count",
  lastSentAt: "Last Sent At",
  suppressionStatus: "Suppression Status",
  createdAt: "Created At",
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function toIso(value: Date | number | null): string {
  if (value === null) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function neutralizeSpreadsheetFormula(value: string): string {
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function toContactExportRow(contact: SavedContact): ContactExportRow {
  const consentRecorded =
    Boolean(contact.consentBasis?.trim()) && contact.consentCapturedAt !== null;
  return {
    name: neutralizeSpreadsheetFormula(contact.name),
    email: neutralizeSpreadsheetFormula(contact.email),
    phone: neutralizeSpreadsheetFormula(contact.phone ?? ""),
    tags: neutralizeSpreadsheetFormula(parseTags(contact.tags).join("; ")),
    source: neutralizeSpreadsheetFormula(contact.source),
    consentStatus: consentRecorded ? "Recorded" : "Not recorded",
    consentBasis: neutralizeSpreadsheetFormula(contact.consentBasis ?? ""),
    consentCapturedAt: toIso(contact.consentCapturedAt),
    totalSent: contact.totalSent,
    lastSentAt: toIso(contact.lastSentAt),
    suppressionStatus: contact.optedOut ? "Opted out" : "Active",
    createdAt: toIso(contact.createdAt),
  };
}

function escapeCsv(value: string | number): string {
  const text = String(value).replace(/\r\n?/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeContactExportCsv(rows: ContactExportRow[]): string {
  const header = CONTACT_EXPORT_COLUMNS.map(column =>
    escapeCsv(CONTACT_EXPORT_LABELS[column])
  ).join(",");
  const body = rows.map(row =>
    CONTACT_EXPORT_COLUMNS.map(column => escapeCsv(row[column])).join(",")
  );
  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}

function dateOnly(value: string, fallback: string): string {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : fallback;
}

export function buildContactExportFilename(
  rows: ContactExportRow[],
  format: ContactExportFormat,
  now = new Date()
): string {
  const fallback = now.toISOString().slice(0, 10);
  const dates = rows
    .map(row => String(row.createdAt))
    .filter(Boolean)
    .sort();
  const from = dates.length ? dateOnly(dates[0], fallback) : fallback;
  const to = dates.length
    ? dateOnly(dates[dates.length - 1], fallback)
    : fallback;
  return `get-phame-contacts-${from}_to_${to}.${format}`;
}

export function buildContactExportSnapshot(input: {
  contacts: SavedContact[];
  requestedIds: number[];
  format: ContactExportFormat;
  now?: Date;
}) {
  const limit =
    input.format === "pdf"
      ? CONTACT_PDF_EXPORT_LIMIT
      : CONTACT_CSV_EXPORT_LIMIT;
  const contactById = new Map(
    input.contacts.map(contact => [contact.id, contact])
  );
  const uniqueRequestedIds = Array.from(new Set(input.requestedIds));
  const authorizedContacts = uniqueRequestedIds
    .map(id => contactById.get(id))
    .filter((contact): contact is SavedContact => Boolean(contact));
  const exportedContacts = authorizedContacts.slice(0, limit);
  const rows = exportedContacts.map(toContactExportRow);
  const filename = buildContactExportFilename(rows, input.format, input.now);

  return {
    format: input.format,
    columns: CONTACT_EXPORT_COLUMNS,
    filename,
    requestedCount: uniqueRequestedIds.length,
    authorizedCount: authorizedContacts.length,
    exportedCount: rows.length,
    truncated: authorizedContacts.length > rows.length,
    rows,
    csv: input.format === "csv" ? serializeContactExportCsv(rows) : null,
  };
}
