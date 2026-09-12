import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_ERROR_ROW_NUMBERS,
  summarizeContactImportIssues,
} from "../shared/contactImportDiagnostics";

describe("summarizeContactImportIssues", () => {
  it("returns grouped, actionable row numbers without retaining contact data", () => {
    const result = summarizeContactImportIssues([
      { reason: "invalid_email", rowNumber: 4 },
      { reason: "duplicate_email", rowNumber: 9 },
      { reason: "missing_email", rowNumber: 2 },
      { reason: "duplicate_email", rowNumber: 11 },
    ]);

    expect(result).toEqual({
      totalRejected: 4,
      reasons: [
        {
          reason: "missing_email",
          count: 1,
          rowNumbers: [2],
          hasMoreRows: false,
        },
        {
          reason: "invalid_email",
          count: 1,
          rowNumbers: [4],
          hasMoreRows: false,
        },
        {
          reason: "duplicate_email",
          count: 2,
          rowNumbers: [9, 11],
          hasMoreRows: false,
        },
      ],
      reportIssues: [
        { reason: "missing_email", rowNumber: 2 },
        { reason: "invalid_email", rowNumber: 4 },
        { reason: "duplicate_email", rowNumber: 9 },
        { reason: "duplicate_email", rowNumber: 11 },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("@");
  });

  it("bounds displayed row numbers while retaining the full rejected-row count", () => {
    const result = summarizeContactImportIssues(
      Array.from({ length: MAX_IMPORT_ERROR_ROW_NUMBERS + 2 }, (_, index) => ({
        reason: "duplicate_email" as const,
        rowNumber: index + 2,
      }))
    );

    expect(result.totalRejected).toBe(MAX_IMPORT_ERROR_ROW_NUMBERS + 2);
    expect(result.reasons[0]).toMatchObject({
      reason: "duplicate_email",
      count: MAX_IMPORT_ERROR_ROW_NUMBERS + 2,
      rowNumbers: Array.from(
        { length: MAX_IMPORT_ERROR_ROW_NUMBERS },
        (_, index) => index + 2
      ),
      hasMoreRows: true,
    });
    expect(result.reportIssues).toHaveLength(MAX_IMPORT_ERROR_ROW_NUMBERS + 2);
    expect(result.reportIssues.at(-1)).toEqual({
      reason: "duplicate_email",
      rowNumber: MAX_IMPORT_ERROR_ROW_NUMBERS + 3,
    });
  });
});
