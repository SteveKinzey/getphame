import { describe, expect, it, vi } from "vitest";
import {
  listAuthHealthChecksForExportWithDb,
  listAuthHealthChecksPage,
  normalizeAuthHealthHistoryQuery,
} from "./db";

function healthRow(id: number, checkedAt: number) {
  return {
    id,
    triggerSource: "manual" as const,
    scheduleCronTaskUid: null,
    overallStatus: "fail" as const,
    configStatus: "ok" as const,
    databaseStatus: "ok" as const,
    userSchemaStatus: "ok" as const,
    magicLinkSchemaStatus: "ok" as const,
    sessionStatus: "ok" as const,
    emailProviderStatus: "fail" as const,
    providerName: "Resend",
    failureCode: "provider_failed",
    failureDetail: "Provider unavailable",
    durationMs: 19,
    checkedAt,
  };
}

function pageDatabase(total: number, rows: ReturnType<typeof healthRow>[]) {
  const countWhere = vi.fn().mockResolvedValue([{ value: total }]);
  const countFrom = vi.fn(() => ({ where: countWhere }));
  const rowsOffset = vi.fn().mockResolvedValue(rows);
  const rowsLimit = vi.fn(() =>
    Object.assign(Promise.resolve(rows), { offset: rowsOffset })
  );
  const rowsOrderBy = vi.fn(() => ({ limit: rowsLimit }));
  const rowsWhere = vi.fn(() => ({ orderBy: rowsOrderBy }));
  const rowsFrom = vi.fn(() => ({ where: rowsWhere }));
  const select = vi
    .fn()
    .mockReturnValueOnce({ from: countFrom })
    .mockReturnValueOnce({ from: rowsFrom });
  return {
    db: { select },
    countWhere,
    rowsWhere,
    rowsOrderBy,
    rowsLimit,
    rowsOffset,
  };
}

function collectPrimitiveValues(
  value: unknown,
  seen = new Set<object>()
): string[] {
  if (value === null || value === undefined) return [];
  if (["string", "number", "boolean"].includes(typeof value))
    return [String(value)];
  if (typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap(entry =>
    collectPrimitiveValues(entry, seen)
  );
}

describe("auth health history data helpers", () => {
  it("preserves status/source filters and clamps paging/export limits", () => {
    expect(
      normalizeAuthHealthHistoryQuery({
        status: "fail",
        triggerSource: "manual",
        fromMs: 100.9,
        toMs: 999.9,
        page: -8,
        pageSize: 500,
        limit: 50_000,
      })
    ).toEqual({
      status: "fail",
      triggerSource: "manual",
      fromMs: 100,
      toMs: 999,
      page: 1,
      pageSize: 50,
      limit: 10_000,
    });
  });

  it("applies inclusive date boundaries to both page and export queries", async () => {
    const rows = [healthRow(8, 500)];
    const pageQuery = pageDatabase(1, rows);
    await listAuthHealthChecksPage(
      { fromMs: 100, toMs: 999, page: 1, pageSize: 20 },
      pageQuery.db as never
    );
    expect(
      collectPrimitiveValues(pageQuery.countWhere.mock.calls[0][0])
    ).toEqual(expect.arrayContaining(["100", "999"]));

    const exportQuery = pageDatabase(1, rows);
    await listAuthHealthChecksForExportWithDb(
      { fromMs: 100, toMs: 999, limit: 250 },
      exportQuery.db as never
    );
    expect(
      collectPrimitiveValues(exportQuery.countWhere.mock.calls[0][0])
    ).toEqual(expect.arrayContaining(["100", "999"]));
  });

  it("returns bounded page metadata and uses stable checked-at plus id ordering", async () => {
    const rows = [healthRow(43, 300), healthRow(42, 300), healthRow(41, 200)];
    const query = pageDatabase(43, rows);
    const result = await listAuthHealthChecksPage(
      { status: "fail", triggerSource: "manual", page: 99, pageSize: 20 },
      query.db as never
    );

    expect(result).toEqual({
      rows,
      page: 3,
      pageSize: 20,
      total: 43,
      pageCount: 3,
    });
    expect(query.countWhere).toHaveBeenCalledWith(expect.anything());
    const pageWhere = query.countWhere.mock.calls[0][0];
    expect(query.rowsWhere).toHaveBeenCalledWith(pageWhere);
    expect(collectPrimitiveValues(pageWhere)).toEqual(
      expect.arrayContaining(["fail", "manual"])
    );
    expect(query.rowsOrderBy.mock.calls[0]).toHaveLength(2);
    expect(query.rowsLimit).toHaveBeenCalledWith(20);
    expect(query.rowsOffset).toHaveBeenCalledWith(40);
    expect(result.rows.map(row => row.id)).toEqual([43, 42, 41]);
  });

  it("applies the same requested filters to the count and filtered export row query", async () => {
    const rows = [healthRow(8, 800)];
    const query = pageDatabase(1, rows);
    const result = await listAuthHealthChecksForExportWithDb(
      { status: "fail", triggerSource: "manual", limit: 250 },
      query.db as never
    );

    expect(result).toEqual({ rows, total: 1, truncated: false });
    expect(query.countWhere).toHaveBeenCalledWith(expect.anything());
    const exportWhere = query.countWhere.mock.calls[0][0];
    expect(query.rowsWhere).toHaveBeenCalledWith(exportWhere);
    expect(collectPrimitiveValues(exportWhere)).toEqual(
      expect.arrayContaining(["fail", "manual"])
    );
    expect(query.rowsOrderBy.mock.calls[0]).toHaveLength(2);
    expect(query.rowsLimit).toHaveBeenCalledWith(250);
    expect(query.rowsOffset).not.toHaveBeenCalled();
  });
});
