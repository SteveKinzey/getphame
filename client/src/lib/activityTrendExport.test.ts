import { describe, expect, it } from "vitest";
import {
  buildActivityTrendExportFilename,
  hasActivityTrendData,
  serializeActivityTrendCsv,
} from "./activityTrendExport";

const trend = [
  { date: "2026-07-03", sends: 4, opens: 2, clicks: 1 },
  { date: "2026-07-01", sends: 2, opens: 1, clicks: 0 },
];

describe("activityTrendExport", () => {
  it("creates a date-range filename for the active chart window", () => {
    expect(buildActivityTrendExportFilename(trend, "csv")).toBe(
      "get-phame-activity-trend-2026-07-01-to-2026-07-03.csv"
    );
    expect(buildActivityTrendExportFilename(trend, "png")).toBe(
      "get-phame-activity-trend-2026-07-01-to-2026-07-03.png"
    );
  });

  it("keeps custom-range filenames stable at single-day and 366-day boundaries", () => {
    expect(
      buildActivityTrendExportFilename(
        [{ date: "2026-07-31", sends: 1, opens: 0, clicks: 0 }],
        "csv"
      )
    ).toBe("get-phame-activity-trend-2026-07-31-to-2026-07-31.csv");

    expect(
      buildActivityTrendExportFilename(
        [
          { date: "2025-08-01", sends: 0, opens: 0, clicks: 0 },
          { date: "2026-07-31", sends: 1, opens: 1, clicks: 0 },
        ],
        "png"
      )
    ).toBe("get-phame-activity-trend-2025-08-01-to-2026-07-31.png");
  });

  it("serializes date, sent, open, and click data chronologically", () => {
    expect(serializeActivityTrendCsv(trend)).toBe(
      "Date,Sent,Opens,Clicks\n2026-07-01,2,1,0\n2026-07-03,4,2,1"
    );
  });

  it("does not offer exports for empty or all-zero chart data", () => {
    expect(buildActivityTrendExportFilename([], "csv")).toBeNull();
    expect(hasActivityTrendData([])).toBe(false);
    expect(
      hasActivityTrendData([
        { date: "2026-07-01", sends: 0, opens: 0, clicks: 0 },
      ])
    ).toBe(false);
  });
});
