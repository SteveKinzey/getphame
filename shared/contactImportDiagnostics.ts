export const CONTACT_IMPORT_ISSUE_REASONS = [
  "missing_email",
  "invalid_email",
  "duplicate_email",
] as const;

export type ContactImportIssueReason =
  (typeof CONTACT_IMPORT_ISSUE_REASONS)[number];

/** Intentionally contains no customer values or other PII. */
export type ContactImportIssue = {
  reason: ContactImportIssueReason;
  rowNumber?: number;
};

export type ContactImportErrorSummary = {
  totalRejected: number;
  reasons: Array<{
    reason: ContactImportIssueReason;
    count: number;
    rowNumbers: number[];
    hasMoreRows: boolean;
  }>;
  /** Full privacy-safe issue list for a local failed-row CSV report. */
  reportIssues: ContactImportIssue[];
};

export const MAX_IMPORT_ERROR_ROW_NUMBERS = 10;

/**
 * Converts raw import rejections into bounded, privacy-safe UI data. Do not add
 * names, emails, phone numbers, or notes here: row numbers are sufficient for
 * a customer to repair the source CSV without leaking contact data elsewhere.
 */
export function summarizeContactImportIssues(
  issues: ContactImportIssue[]
): ContactImportErrorSummary {
  const buckets = new Map<ContactImportIssueReason, number[]>();
  CONTACT_IMPORT_ISSUE_REASONS.forEach(reason => buckets.set(reason, []));

  for (const issue of issues) {
    const rows = buckets.get(issue.reason);
    if (!rows) continue;
    if (Number.isInteger(issue.rowNumber) && (issue.rowNumber ?? 0) > 0) {
      rows.push(issue.rowNumber as number);
    }
  }

  const counts = new Map<ContactImportIssueReason, number>();
  CONTACT_IMPORT_ISSUE_REASONS.forEach(reason => counts.set(reason, 0));
  for (const issue of issues) {
    counts.set(issue.reason, (counts.get(issue.reason) ?? 0) + 1);
  }

  return {
    totalRejected: issues.length,
    reasons: CONTACT_IMPORT_ISSUE_REASONS.flatMap(reason => {
      const count = counts.get(reason) ?? 0;
      if (count === 0) return [];
      const uniqueRows = Array.from(new Set(buckets.get(reason) ?? [])).sort(
        (a, b) => a - b
      );
      return [
        {
          reason,
          count,
          rowNumbers: uniqueRows.slice(0, MAX_IMPORT_ERROR_ROW_NUMBERS),
          hasMoreRows: uniqueRows.length > MAX_IMPORT_ERROR_ROW_NUMBERS,
        },
      ];
    }),
    reportIssues: [...issues].sort((left, right) => {
      const rowDifference = (left.rowNumber ?? 0) - (right.rowNumber ?? 0);
      return rowDifference === 0
        ? left.reason.localeCompare(right.reason)
        : rowDifference;
    }),
  };
}
