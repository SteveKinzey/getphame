import type { ContactImportIssue, ContactImportIssueReason } from "@shared/contactImportDiagnostics";

export type ContactImportErrorReportLabels = {
  rowNumber: string;
  reason: string;
  unavailableRow: string;
  reasonLabels: Record<ContactImportIssueReason, string>;
};

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function sortIssues(issues: ContactImportIssue[]): ContactImportIssue[] {
  return [...issues].sort((left, right) => {
    const rowDifference = (left.rowNumber ?? 0) - (right.rowNumber ?? 0);
    return rowDifference === 0 ? left.reason.localeCompare(right.reason) : rowDifference;
  });
}

export function buildContactImportErrorReportFilename(): string {
  return "get-phame-import-failed-rows.csv";
}

/**
 * Creates a local repair report using only row numbers and failure reasons.
 * Contact names, email addresses, phone numbers, and notes are never copied.
 */
export function serializeContactImportErrorReport(
  issues: ContactImportIssue[],
  labels: ContactImportErrorReportLabels,
): string {
  const rows = sortIssues(issues).map((issue) => [
    issue.rowNumber?.toString() ?? labels.unavailableRow,
    labels.reasonLabels[issue.reason],
  ]);

  return [[labels.rowNumber, labels.reason], ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}
