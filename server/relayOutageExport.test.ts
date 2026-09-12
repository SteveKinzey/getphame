import { describe, expect, it } from "vitest";
import {
  RELAY_OUTAGE_CSV_PREVIEW_LIMIT,
  RELAY_OUTAGE_EXPORT_COLUMNS,
  buildRelayOutageCsvExport,
  buildRelayOutageExportRows,
} from "./relayOutageExport";
import type { OutageRecord } from "./relayHealth";

describe("relay outage CSV export", () => {
  it("sanitizes causes, shields formulas, and exposes canonical CSV columns", () => {
    const outages: OutageRecord[] = [
      {
        id: 1,
        startedAt: Date.UTC(2026, 8, 9, 10, 0, 0),
        resolvedAt: Date.UTC(2026, 8, 9, 10, 45, 0),
        durationMinutes: 45,
        cause:
          '=HYPERLINK("https://attacker.test") Connection refused for owner@getphame.app password=secret-token',
        status: "resolved",
        triggerSource: "scheduled_heartbeat",
      },
      {
        id: 2,
        startedAt: Date.UTC(2026, 8, 9, 12, 0, 0),
        resolvedAt: null,
        durationMinutes: 15,
        cause: "@temporary failure on primary relay",
        status: "ongoing",
        triggerSource: "outbound_send",
      },
    ];

    const exportRows = buildRelayOutageExportRows(outages);
    expect(exportRows).toHaveLength(2);
    expect(exportRows[0]?.causeSanitized).toBe(
      '\'=HYPERLINK("[redacted-url]") Connection refused for [redacted-email] password: [redacted]'
    );
    expect(exportRows[1]?.causeSanitized).toBe(
      "'@temporary failure on primary relay"
    );

    const snapshot = buildRelayOutageCsvExport({
      outages,
      totalMatching: 2,
      truncated: false,
      snapshotToMs: Date.UTC(2026, 8, 9, 12, 15, 0),
      generatedAt: Date.UTC(2026, 8, 9, 12, 15, 0),
    });

    expect(snapshot.filename).toBe(
      "getphame-email-relay-outages-2026-09-09.csv"
    );
    expect(snapshot.availableColumns).toEqual(
      RELAY_OUTAGE_EXPORT_COLUMNS.map(({ key, csvHeader }) => ({
        key,
        csvHeader,
      }))
    );
    expect(snapshot.csv).toContain(
      "outage_id,started_at_utc,resolved_at_utc,status,duration_minutes,trigger_source,cause_sanitized"
    );
    expect(snapshot.csv).toContain("2026-09-09T10:00:00.000Z");
    expect(snapshot.csv).toContain("[redacted-email]");
    expect(snapshot.clipboardText).toBe(snapshot.csv.slice(1));
    expect(snapshot.preview.rows).toHaveLength(2);
    expect(snapshot.preview.limit).toBe(RELAY_OUTAGE_CSV_PREVIEW_LIMIT);
  });
});
