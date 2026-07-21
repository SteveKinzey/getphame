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
    await adminCaller.authDiagnostics.healthHistory({ status: "fail", triggerSource: "manual", page: 3, pageSize: 20 });
    expect(mocks.listAuthHealthChecksPage).toHaveBeenCalledWith({
      status: "fail",
      triggerSource: "manual",
      page: 3,
      pageSize: 20,
    });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.healthHistory()).rejects.toMatchObject({ code: "FORBIDDEN" });
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
    const result = await adminCaller.authDiagnostics.exportHealthHistoryCsv({ status: "fail", triggerSource: "manual" });
    expect(mocks.listAuthHealthChecksForExport).toHaveBeenCalledWith({ status: "fail", triggerSource: "manual" });
    expect(result.filename).toMatch(/^getphame-auth-health-history-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain("failure_detail_sanitized");
    expect(result.csv).toContain("'=SUM(1,2)");
    expect(result.csv).not.toContain("private-task-uid");
    expect(result.filters).toEqual({ status: "fail", triggerSource: "manual" });

    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.authDiagnostics.exportHealthHistoryCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
