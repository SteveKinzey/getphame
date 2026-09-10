import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getAutomationDashboard: vi.fn(),
  getAutomationAlert: vi.fn(),
  acknowledgeAutomationAlert: vi.fn(),
  getAutomationRunsForDay: vi.fn(),
  getAutomationAlertAcknowledgementHistory: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./automationHealthDb", async importOriginal => ({
  ...(await importOriginal<typeof import("./automationHealthDb")>()),
  getAutomationDashboard: mocks.getAutomationDashboard,
  getAutomationAlert: mocks.getAutomationAlert,
  acknowledgeAutomationAlert: mocks.acknowledgeAutomationAlert,
  getAutomationRunsForDay: mocks.getAutomationRunsForDay,
  getAutomationAlertAcknowledgementHistory:
    mocks.getAutomationAlertAcknowledgementHistory,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 11 : 22,
      openId: `${role}-automation-health`,
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

describe("Automation Health administrator API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "automation-health-admin-test-secret-long-enough");
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ suspendedUntil: null }],
          }),
        }),
      })),
    });
    mocks.getAutomationDashboard.mockResolvedValue({ history: [], daily: [] });
    mocks.getAutomationAlert.mockResolvedValue({ active: false });
    mocks.acknowledgeAutomationAlert.mockResolvedValue({ acknowledged: true });
    mocks.getAutomationRunsForDay.mockResolvedValue([]);
    mocks.getAutomationAlertAcknowledgementHistory.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects every Automation Health operation for non-admin users", async () => {
    const caller = appRouter.createCaller(context("user"));

    await expect(caller.automationHealth.dashboard()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.automationHealth.alert()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.automationHealth.acknowledgeAlert({ eventId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.automationHealth.runDetails({
        date: "2026-07-01",
        kind: "drift_audit",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.automationHealth.acknowledgementHistory()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getAutomationDashboard).not.toHaveBeenCalled();
    expect(mocks.getAutomationAlert).not.toHaveBeenCalled();
    expect(mocks.acknowledgeAutomationAlert).not.toHaveBeenCalled();
    expect(mocks.getAutomationRunsForDay).not.toHaveBeenCalled();
    expect(
      mocks.getAutomationAlertAcknowledgementHistory
    ).not.toHaveBeenCalled();
  });

  it("forwards bounded date, kind, outcome, and history filters", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.automationHealth.dashboard({
      fromMs: 100,
      toMs: 999,
      kind: "drift_audit",
      result: "failure",
      limit: 25,
    });

    expect(mocks.getAutomationDashboard).toHaveBeenCalledWith({
      fromMs: 100,
      toMs: 999,
      kind: "drift_audit",
      result: "failure",
      limit: 25,
    });
  });

  it("rejects inverted, overlong, and out-of-bounds inputs before querying", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const dayMs = 24 * 60 * 60 * 1_000;

    await expect(
      caller.automationHealth.dashboard({ fromMs: 999, toMs: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.automationHealth.dashboard({ fromMs: 0, toMs: 367 * dayMs })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.automationHealth.dashboard({ limit: 101 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getAutomationDashboard).not.toHaveBeenCalled();
  });

  it("clamps a future upper boundary to server time", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const caller = appRouter.createCaller(context("admin"));
    await caller.automationHealth.dashboard({ fromMs: 100, toMs: 2_000 });

    expect(mocks.getAutomationDashboard).toHaveBeenCalledWith({
      fromMs: 100,
      toMs: 1_000,
      kind: undefined,
      result: undefined,
      limit: 50,
    });
  });

  it("scopes alert state and acknowledgement to the authenticated admin", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await caller.automationHealth.alert();
    await caller.automationHealth.acknowledgeAlert({ eventId: 7 });

    expect(mocks.getAutomationAlert).toHaveBeenCalledWith(11);
    expect(mocks.acknowledgeAutomationAlert).toHaveBeenCalledWith({
      eventId: 7,
      adminUserId: 11,
      acknowledgedAt: expect.any(Number),
    });
  });

  it("forwards bounded UTC-day run drilldowns and acknowledgement history", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 6, 31));
    const caller = appRouter.createCaller(context("admin"));

    await caller.automationHealth.runDetails({
      date: "2026-07-01",
      kind: "dependabot_merge",
      limit: 25,
    });
    await caller.automationHealth.acknowledgementHistory({ limit: 30 });

    expect(mocks.getAutomationRunsForDay).toHaveBeenCalledWith({
      date: "2026-07-01",
      kind: "dependabot_merge",
      limit: 25,
    });
    expect(mocks.getAutomationAlertAcknowledgementHistory).toHaveBeenCalledWith(
      30
    );
  });

  it("rejects future run days and out-of-bounds detail limits before querying", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 6, 31));
    const caller = appRouter.createCaller(context("admin"));

    await expect(
      caller.automationHealth.runDetails({
        date: "2026-08-01",
        kind: "drift_audit",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.automationHealth.runDetails({
        date: "2026-07-01",
        kind: "drift_audit",
        limit: 51,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.automationHealth.acknowledgementHistory({ limit: 101 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mocks.getAutomationRunsForDay).not.toHaveBeenCalled();
    expect(
      mocks.getAutomationAlertAcknowledgementHistory
    ).not.toHaveBeenCalled();
  });
});
