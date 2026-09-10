import { describe, expect, it } from "vitest";
import {
  AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT,
  AUTH_HEALTH_HISTORY_EXPORT_COLUMN_KEYS,
  buildAuthHealthHistoryCsvExport,
  buildAuthHealthHistoryCsvFilename,
  buildAuthHealthHistoryExportRows,
  serializeAuthHealthHistoryCsv,
} from "./authHealthHistoryExport";
import {
  buildAuthHealthHistorySearchResultsCsvFilename,
  filterPreparedCsvRows,
  normalizePreparedCsvSearchQuery,
  serializePreparedCsvRows,
} from "../shared/authHealthHistoryCsv";

describe("auth health history CSV", () => {
  it("whitelists sanitized columns, blocks formula injection, and excludes scheduler identifiers", () => {
    const csv = serializeAuthHealthHistoryCsv([
      {
        id: 9,
        triggerSource: "scheduled",
        scheduleCronTaskUid: "cron-secret-reference",
        overallStatus: "fail",
        configStatus: "ok",
        databaseStatus: "ok",
        userSchemaStatus: "ok",
        magicLinkSchemaStatus: "ok",
        sessionStatus: "ok",
        emailProviderStatus: "fail",
        providerName: "+Provider",
        failureCode: "provider_failed",
        failureDetail:
          "user@example.com token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
        durationMs: 17,
        checkedAt: Date.UTC(2026, 6, 21, 13, 0, 0),
      },
    ]);

    expect(csv).toContain(
      "record_id,checked_at_utc,trigger_source,overall_status"
    );
    expect(csv).toContain("'+Provider");
    expect(csv).toContain("[redacted-email]");
    expect(csv).toContain("[redacted-token]");
    expect(csv).not.toContain("cron-secret-reference");
    expect(csv).not.toContain("user@example.com");
  });

  it("includes exact active local date labels in filesystem-safe filenames", () => {
    expect(
      buildAuthHealthHistoryCsvFilename({
        fromDate: "2026-07-01",
        toDate: "2026-07-21",
      })
    ).toBe("getphame-auth-health-history-2026-07-01-to-2026-07-21.csv");
    expect(buildAuthHealthHistoryCsvFilename({ fromDate: "2026-07-01" })).toBe(
      "getphame-auth-health-history-from-2026-07-01.csv"
    );
    expect(buildAuthHealthHistoryCsvFilename({ toDate: "2026-07-21" })).toBe(
      "getphame-auth-health-history-through-2026-07-21.csv"
    );
    expect(
      buildAuthHealthHistoryCsvFilename({}, new Date("2026-07-21T23:59:00Z"))
    ).toBe("getphame-auth-health-history-2026-07-21.csv");
    expect(
      buildAuthHealthHistoryCsvFilename(
        { fromDate: "../../bad", toDate: "2026-07-21" },
        new Date("2026-07-22T00:00:00Z")
      )
    ).toBe("getphame-auth-health-history-through-2026-07-21.csv");
  });

  it("builds preview rows and the download from the same bounded sanitized snapshot", () => {
    const rows = Array.from(
      { length: AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT + 1 },
      (_, index) => ({
        id: index + 1,
        triggerSource: "manual" as const,
        scheduleCronTaskUid: `private-schedule-${index + 1}`,
        overallStatus: "fail" as const,
        configStatus: "ok" as const,
        databaseStatus: "ok" as const,
        userSchemaStatus: "ok" as const,
        magicLinkSchemaStatus: "ok" as const,
        sessionStatus: "ok" as const,
        emailProviderStatus: "fail" as const,
        providerName: index === 0 ? "+Provider" : "Provider",
        failureCode: index === 0 ? "@provider_failed" : "provider_failed",
        failureDetail:
          index === 0
            ? '=HYPERLINK("https://example.com") user@example.com token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
            : "Provider unavailable",
        durationMs: 20 + index,
        checkedAt: Date.UTC(2026, 6, 21, 13, 0, index),
      })
    );

    const snapshot = buildAuthHealthHistoryCsvExport({
      rows,
      total: 80,
      truncated: true,
      status: "fail",
      triggerSource: "manual",
      fromMs: Date.UTC(2026, 6, 1),
      toMs: Date.UTC(2026, 6, 22),
      fromDate: "2026-07-01",
      toDate: "2026-07-21",
      generatedAt: Date.UTC(2026, 6, 21, 14, 0, 0),
    });
    const sanitizedRows = buildAuthHealthHistoryExportRows(rows);

    expect(snapshot.filename).toBe(
      "getphame-auth-health-history-2026-07-01-to-2026-07-21.csv"
    );
    expect(snapshot.rowCount).toBe(rows.length);
    expect(snapshot.totalMatching).toBe(80);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.preview.rowCount).toBe(
      AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT
    );
    expect(snapshot.preview.limit).toBe(AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT);
    expect(snapshot.preview.truncated).toBe(true);
    expect(snapshot.preview.rows).toEqual(
      sanitizedRows.slice(0, AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT)
    );
    expect(snapshot.searchRows).toEqual(sanitizedRows);
    expect(snapshot.searchRows).toHaveLength(rows.length);
    expect(snapshot.csv).toBe(serializeAuthHealthHistoryCsv(rows));
    expect(snapshot.preview.rows[0]).toMatchObject({
      providerName: "'+Provider",
      failureCode: "'@provider_failed",
    });
    expect(snapshot.preview.rows[0].failureDetailSanitized).toContain(
      "[redacted-email]"
    );
    expect(snapshot.preview.rows[0].failureDetailSanitized).toContain(
      "[redacted-token]"
    );
    expect(snapshot.csv).not.toContain("private-schedule-");
    expect(snapshot.csv).not.toContain("user@example.com");
    expect(snapshot.filters).toEqual({
      status: "fail",
      triggerSource: "manual",
      fromMs: Date.UTC(2026, 6, 1),
      toMs: Date.UTC(2026, 6, 22),
    });
  });

  it("projects allowlisted columns in canonical order across preview, clipboard, and download", () => {
    const rows = [
      {
        id: 9,
        triggerSource: "manual" as const,
        scheduleCronTaskUid: "private-schedule",
        overallStatus: "fail" as const,
        configStatus: "ok" as const,
        databaseStatus: "ok" as const,
        userSchemaStatus: "ok" as const,
        magicLinkSchemaStatus: "ok" as const,
        sessionStatus: "ok" as const,
        emailProviderStatus: "fail" as const,
        providerName: "+Provider",
        failureCode: "@provider_failed",
        failureDetail:
          "user@example.com token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
        durationMs: 17,
        checkedAt: Date.UTC(2026, 6, 21, 13, 0, 0),
      },
    ];

    const snapshot = buildAuthHealthHistoryCsvExport({
      rows,
      total: 1,
      truncated: false,
      selectedColumns: ["failureCode", "recordId", "providerName", "recordId"],
      snapshotToMs: Date.UTC(2026, 6, 21, 13, 5, 0),
      generatedAt: Date.UTC(2026, 6, 21, 13, 6, 0),
    });

    expect(snapshot.availableColumns.map(column => column.key)).toEqual(
      AUTH_HEALTH_HISTORY_EXPORT_COLUMN_KEYS
    );
    expect(snapshot.preview.columns).toEqual([
      { key: "recordId", csvHeader: "record_id" },
      { key: "providerName", csvHeader: "provider_name" },
      { key: "failureCode", csvHeader: "failure_code" },
    ]);
    expect(snapshot.csv).toBe(
      "\uFEFFrecord_id,provider_name,failure_code\r\n9,'+Provider,'@provider_failed\r\n"
    );
    expect(snapshot.clipboardText).toBe(
      "record_id,provider_name,failure_code\r\n9,'+Provider,'@provider_failed\r\n"
    );
    expect(snapshot.csv.slice(1)).toBe(snapshot.clipboardText);
    expect(snapshot.preview.rows[0].failureDetailSanitized).toContain(
      "[redacted-email]"
    );
    expect(snapshot.preview.rows[0].failureDetailSanitized).toContain(
      "[redacted-token]"
    );
    expect(snapshot.searchRows[0]).toEqual(snapshot.preview.rows[0]);
    expect(snapshot.snapshotToMs).toBe(Date.UTC(2026, 6, 21, 13, 5, 0));
    expect(snapshot.csv).not.toContain("private-schedule");
    expect(snapshot.csv).not.toContain("user@example.com");
  });

  it("exports every complete-snapshot search match using selected columns and a distinct filename", () => {
    const columns = [
      { key: "recordId", csvHeader: "record_id" },
      { key: "failureCode", csvHeader: "failure_code" },
    ] as const;
    const rows = Array.from(
      { length: AUTH_HEALTH_HISTORY_CSV_PREVIEW_LIMIT + 3 },
      (_, index) => ({
        recordId: String(index + 1),
        failureCode:
          index % 2 === 1
            ? index === 27
              ? "=NEEDLE"
              : "Needle match"
            : "healthy",
        providerName:
          index === 0
            ? "needle appears only in an excluded column"
            : "Provider",
      })
    );

    expect(normalizePreparedCsvSearchQuery("  NeEdLe  ")).toBe("needle");
    const matchingRows = filterPreparedCsvRows(rows, columns, "  NeEdLe  ");
    expect(matchingRows).toHaveLength(14);
    expect(matchingRows[0]?.recordId).toBe("2");
    expect(matchingRows.at(-1)?.recordId).toBe("28");
    expect(matchingRows.some(row => row.recordId === "1")).toBe(false);

    const csv = serializePreparedCsvRows(matchingRows, columns);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(
      matchingRows.length + 1
    );
    expect(csv).toContain("28,'=NEEDLE");
    expect(csv).not.toContain("providerName");
    expect(csv).not.toContain("excluded column");
    expect(
      buildAuthHealthHistorySearchResultsCsvFilename(
        "getphame-auth-health-history-2026-07-22.csv"
      )
    ).toBe("getphame-auth-health-history-2026-07-22-search-results.csv");
    expect(buildAuthHealthHistorySearchResultsCsvFilename("  ")).toBe(
      "getphame-auth-health-history-search-results.csv"
    );
  });
});
