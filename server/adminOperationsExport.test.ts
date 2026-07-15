import { describe, expect, it } from "vitest";
import {
  escapeAdminOperationsCsvCell,
  serializeAdminOperationsCsv,
  type AdminOperationsCsvRow,
} from "./adminOperationsExport";

describe("administrator operations CSV", () => {
  it("escapes quotes, commas, line breaks, and spreadsheet formulas", () => {
    expect(escapeAdminOperationsCsvCell('Revenue, "monthly"')).toBe('"Revenue, ""monthly"""');
    expect(escapeAdminOperationsCsvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeAdminOperationsCsvCell("=1+1")).toBe("'=1+1");
  });

  it("produces an Excel-compatible, explicitly sectioned document", () => {
    const rows: AdminOperationsCsvRow[] = [{
      section: "reminders",
      metric: "success_rate",
      period: "all_time_attributed",
      value: 42.5,
      unit: "percent",
      details: "stage=1; low_sample=false",
    }];

    const csv = serializeAdminOperationsCsv(rows);
    expect(csv.startsWith("\uFEFFsection,metric,period,value,unit,details\r\n")).toBe(true);
    expect(csv).toContain("reminders,success_rate,all_time_attributed,42.5,percent,stage=1; low_sample=false");
  });
});
