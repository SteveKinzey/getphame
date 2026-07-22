import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listAuthDiagnosticEvents: vi.fn(),
  getAuthDiagnosticSummary: vi.fn(),
  listAuthHealthChecks: vi.fn(),
  listAuthHealthChecksPage: vi.fn(),
  listAuthHealthChecksForExport: vi.fn(),
  getAuthHealthUptimeSummary: vi.fn(),
  runAuthHealthCheck: vi.fn(),
  listAuthHealthHistoryPresets: vi.fn(),
  saveAuthHealthHistoryPreset: vi.fn(),
  deleteAuthHealthHistoryPreset: vi.fn(),
  duplicateAuthHealthHistoryPreset: vi.fn(),
  reorderAuthHealthHistoryPresets: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  listAuthDiagnosticEvents: mocks.listAuthDiagnosticEvents,
  getAuthDiagnosticSummary: mocks.getAuthDiagnosticSummary,
  listAuthHealthChecks: mocks.listAuthHealthChecks,
  listAuthHealthChecksPage: mocks.listAuthHealthChecksPage,
  listAuthHealthChecksForExport: mocks.listAuthHealthChecksForExport,
  getAuthHealthUptimeSummary: mocks.getAuthHealthUptimeSummary,
}));

vi.mock("./authOperations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authOperations")>()),
  runAuthHealthCheck: mocks.runAuthHealthCheck,
}));

vi.mock("./authHealthHistoryPresets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authHealthHistoryPresets")>()),
  listAuthHealthHistoryPresets: mocks.listAuthHealthHistoryPresets,
  saveAuthHealthHistoryPreset: mocks.saveAuthHealthHistoryPreset,
  deleteAuthHealthHistoryPreset: mocks.deleteAuthHealthHistoryPreset,
  duplicateAuthHealthHistoryPreset: mocks.duplicateAuthHealthHistoryPreset,
  reorderAuthHealthHistoryPresets: mocks.reorderAuthHealthHistoryPresets,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-account`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin authentication diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "admin-diagnostics-test-secret-long-enough");
    mocks.listAuthDiagnosticEvents.mockResolvedValue([]);
    mocks.getAuthDiagnosticSummary.mockResolvedValue({ total: 0, ok: 0, fail: 0 });
    mocks.listAuthHealthChecks.mockResolvedValue([]);
    mocks.listAuthHealthChecksPage.mockResolvedValue({ rows: [], page: 1, pageSize: 20, total: 0, pageCount: 1 });
    mocks.listAuthHealthChecksForExport.mockResolvedValue({ rows: [], total: 0, truncated: false });
    mocks.getAuthHealthUptimeSummary.mockResolvedValue({ runCount: 0, uptimePercent: null });
    mocks.listAuthHealthHistoryPresets.mockResolvedValue([]);
    mocks.saveAuthHealthHistoryPreset.mockResolvedValue({ outcome: "saved", id: 5, created: true });
    mocks.deleteAuthHealthHistoryPreset.mockResolvedValue(true);
    mocks.duplicateAuthHealthHistoryPreset.mockResolvedValue({ outcome: "duplicated", preset: { id: 6, name: "Manual failures copy", status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999 } });
    mocks.reorderAuthHealthHistoryPresets.mockResolvedValue({ outcome: "reordered", orderedIds: [6, 5] });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.authDiagnostics.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins and converts an exact email filter to a one-way fingerprint", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.authDiagnostics.dashboard({ email: "Person@Example.com", days: 7, limit: 20 });
    expect(mocks.listAuthDiagnosticEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        emailFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        limit: 20,
      }),
    );
    expect(JSON.stringify(mocks.listAuthDiagnosticEvents.mock.calls[0]?.[0])).not.toContain("person@example.com");
  });

  it("allows only administrators to trigger an immediate non-destructive health check", async () => {
    mocks.runAuthHealthCheck.mockResolvedValue({ overallStatus: "ok", checkedAt: 1, durationMs: 12 });

    const adminCaller = appRouter.createCaller(context("admin"));
    await adminCaller.authDiagnostics.runHealthCheck();
    expect(mocks.runAuthHealthCheck).toHaveBeenCalledWith({ triggerSource: "manual" });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.runHealthCheck()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("passes bounded status, source, and page filters to the protected health-history query", async () => {
    const adminCaller = appRouter.createCaller(context("admin"));
    await adminCaller.authDiagnostics.healthHistory({ status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999, page: 3, pageSize: 20 });
    expect(mocks.listAuthHealthChecksPage).toHaveBeenCalledWith({
      status: "fail",
      triggerSource: "manual",
      fromMs: 100,
      toMs: 999,
      page: 3,
      pageSize: 20,
    });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.healthHistory()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects inverted or excessively wide date ranges before querying history", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.authDiagnostics.healthHistory({ fromMs: 999, toMs: 100, page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.authDiagnostics.healthHistory({ fromMs: 1, toMs: 367 * 24 * 60 * 60 * 1000, page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.listAuthHealthChecksPage).not.toHaveBeenCalled();
  });

  it("exports only administrators' sanitized filtered health history", async () => {
    mocks.listAuthHealthChecksForExport.mockResolvedValue({
      rows: [{
        id: 7,
        triggerSource: "manual",
        scheduleCronTaskUid: "private-task-uid",
        overallStatus: "fail",
        configStatus: "ok",
        databaseStatus: "ok",
        userSchemaStatus: "ok",
        magicLinkSchemaStatus: "ok",
        sessionStatus: "ok",
        emailProviderStatus: "fail",
        providerName: "Resend",
        failureCode: "provider_unavailable",
        failureDetail: "=SUM(1,2)",
        durationMs: 45,
        checkedAt: Date.UTC(2026, 6, 21, 12, 0, 0),
      }],
      total: 1,
      truncated: false,
    });

    const adminCaller = appRouter.createCaller(context("admin"));
    const result = await adminCaller.authDiagnostics.exportHealthHistoryCsv({
      status: "fail",
      triggerSource: "manual",
      fromMs: 100,
      toMs: 999,
      fromDate: "2026-07-01",
      toDate: "2026-07-21",
      columns: ["recordId", "providerName", "failureDetailSanitized"],
      snapshotGeneratedAt: 900,
    });
    expect(mocks.listAuthHealthChecksForExport).toHaveBeenCalledWith({ status: "fail", triggerSource: "manual", fromMs: 100, toMs: 900 });
    expect(result.filename).toBe("getphame-auth-health-history-2026-07-01-to-2026-07-21.csv");
    expect(result.csv).toContain("record_id,provider_name,failure_detail_sanitized");
    expect(result.csv).not.toContain("overall_status");
    expect(result.csv).toContain("'=SUM(1,2)");
    expect(result.csv).not.toContain("private-task-uid");
    expect(result.rowCount).toBe(1);
    expect(result.totalMatching).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.snapshotToMs).toBe(900);
    expect(result.clipboardText).toBe(result.csv.slice(1));
    expect(result.availableColumns).toHaveLength(14);
    expect(result.preview).toMatchObject({
      rowCount: 1,
      limit: 25,
      truncated: false,
      rows: [{
        recordId: "7",
        triggerSource: "manual",
        overallStatus: "fail",
        failureDetailSanitized: "'=SUM(1,2)",
      }],
    });
    expect(result.preview.columns.map((column) => column.csvHeader)).toEqual(["record_id", "provider_name", "failure_detail_sanitized"]);
    expect(result.filters).toEqual({ status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999 });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.exportHealthHistoryCsv({ columns: ["recordId"] })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.listAuthHealthChecksForExport.mockClear();
    await expect(adminCaller.authDiagnostics.exportHealthHistoryCsv({ columns: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(adminCaller.authDiagnostics.exportHealthHistoryCsv({ columns: ["recordId", "privateColumn"] } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.listAuthHealthChecksForExport).not.toHaveBeenCalled();
  });

  it("keeps saved health-history presets administrator-only and owner-scoped", async () => {
    const adminCaller = appRouter.createCaller(context("admin"));
    await adminCaller.authDiagnostics.healthHistoryPresets();
    expect(mocks.listAuthHealthHistoryPresets).toHaveBeenCalledWith(1);

    await adminCaller.authDiagnostics.saveHealthHistoryPreset({
      name: "Manual failures",
      status: "fail",
      triggerSource: "manual",
      fromMs: 100,
      toMs: 999,
    });
    expect(mocks.saveAuthHealthHistoryPreset).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Manual failures", status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999 }));

    await adminCaller.authDiagnostics.deleteHealthHistoryPreset({ id: 5 });
    expect(mocks.deleteAuthHealthHistoryPreset).toHaveBeenCalledWith(1, 5);

    await adminCaller.authDiagnostics.duplicateHealthHistoryPreset({ id: 5 });
    expect(mocks.duplicateAuthHealthHistoryPreset).toHaveBeenCalledWith(1, 5);

    await adminCaller.authDiagnostics.reorderHealthHistoryPresets({ orderedIds: [6, 5] });
    expect(mocks.reorderAuthHealthHistoryPresets).toHaveBeenCalledWith(1, { orderedIds: [6, 5] });

    await adminCaller.authDiagnostics.reorderHealthHistoryPresets({ orderedIds: [5, 6] });
    expect(mocks.reorderAuthHealthHistoryPresets).toHaveBeenLastCalledWith(1, { orderedIds: [5, 6] });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.healthHistoryPresets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.authDiagnostics.saveHealthHistoryPreset({ name: "Denied" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.authDiagnostics.deleteHealthHistoryPreset({ id: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.authDiagnostics.duplicateHealthHistoryPreset({ id: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.authDiagnostics.reorderHealthHistoryPresets({ orderedIds: [6, 5] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
