import { describe, expect, it } from "vitest";
import {
  buildContactImportErrorReportFilename,
  serializeContactImportErrorReport,
} from "./contactImportErrorReport";

const labels = {
  rowNumber: "CSV row",
  reason: "Reason",
  unavailableRow: "Unavailable",
  reasonLabels: {
    missing_email: "Missing email",
    invalid_email: "Invalid email",
    duplicate_email: "Duplicate email",
  },
};

describe("contact import failed-row report", () => {
  it("uses a stable, privacy-safe filename", () => {
    expect(buildContactImportErrorReportFilename()).toBe("get-phame-import-failed-rows.csv");
  });

  it("serializes every failed row in source order without contact details", () => {
    const csv = serializeContactImportErrorReport([
      { reason: "duplicate_email", rowNumber: 9 },
      { reason: "missing_email", rowNumber: 2 },
      { reason: "invalid_email", rowNumber: 4 },
    ], labels);

    expect(csv).toBe([
      "CSV row,Reason",
      "2,Missing email",
      "4,Invalid email",
      "9,Duplicate email",
    ].join("\n"));
    expect(csv).not.toContain("@");
  });
});
