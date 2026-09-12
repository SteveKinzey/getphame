import { describe, expect, it } from "vitest";
import {
  getDiagnosticSnapshotPresetRange,
  matchesDiagnosticSnapshotPreset,
} from "./diagnosticSnapshotPresets";

describe("diagnostic snapshot UTC presets", () => {
  it("returns inclusive seven- and thirty-day ranges ending on the current UTC day", () => {
    const now = new Date("2026-09-11T23:59:59.000Z");

    expect(getDiagnosticSnapshotPresetRange(7, now)).toEqual({
      startDate: "2026-09-05",
      endDate: "2026-09-11",
    });
    expect(getDiagnosticSnapshotPresetRange(30, now)).toEqual({
      startDate: "2026-08-13",
      endDate: "2026-09-11",
    });
  });

  it("uses UTC calendar arithmetic across a daylight-saving transition", () => {
    const now = new Date("2026-03-08T00:30:00.000Z");

    expect(getDiagnosticSnapshotPresetRange(7, now)).toEqual({
      startDate: "2026-03-02",
      endDate: "2026-03-08",
    });
  });

  it("matches only the selected preset range", () => {
    const now = new Date("2026-09-11T12:00:00.000Z");
    const range = getDiagnosticSnapshotPresetRange(7, now);

    expect(matchesDiagnosticSnapshotPreset(range, 7, now)).toBe(true);
    expect(matchesDiagnosticSnapshotPreset(range, 30, now)).toBe(false);
    expect(
      matchesDiagnosticSnapshotPreset(
        { startDate: "2026-09-04", endDate: "2026-09-11" },
        7,
        now
      )
    ).toBe(false);
  });
});
