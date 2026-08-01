import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getSecurityAuditDashboard: vi.fn(),
}));

vi.mock("./securityAuditReports", async importOriginal => ({
  ...(await importOriginal<typeof import("./securityAuditReports")>()),
  getSecurityAuditDashboard: mocks.getSecurityAuditDashboard,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 11 : 22,
      openId: `${role}-security-audits`,
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

describe("Security audit administrator API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "security-audit-admin-test-secret-long-enough");
    mocks.getSecurityAuditDashboard.mockResolvedValue({
      history: [],
      latest: null,
      counts: { total: 0, clean: 0, attention: 0, failed: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects security-audit history for non-admin users before any query", async () => {
    const caller = appRouter.createCaller(context("user"));

    await expect(caller.securityAudits.dashboard()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.getSecurityAuditDashboard).not.toHaveBeenCalled();
  });

  it("forwards bounded date, outcome, and history filters for administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.securityAudits.dashboard({
      fromMs: 100,
      toMs: 999,
      outcome: "attention",
      limit: 25,
    });

    expect(mocks.getSecurityAuditDashboard).toHaveBeenCalledWith({
      fromMs: 100,
      toMs: 999,
      outcome: "attention",
      limit: 25,
    });
  });

  it("rejects inverted, overlong, and out-of-bounds inputs before querying", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const dayMs = 24 * 60 * 60 * 1_000;

    await expect(
      caller.securityAudits.dashboard({ fromMs: 999, toMs: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.securityAudits.dashboard({ fromMs: 0, toMs: 367 * dayMs })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.securityAudits.dashboard({ limit: 101 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getSecurityAuditDashboard).not.toHaveBeenCalled();
  });

  it("clamps a future upper boundary to server time", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const caller = appRouter.createCaller(context("admin"));
    await caller.securityAudits.dashboard({ fromMs: 100, toMs: 2_000 });

    expect(mocks.getSecurityAuditDashboard).toHaveBeenCalledWith({
      fromMs: 100,
      toMs: 1_000,
      outcome: undefined,
      limit: 50,
    });
  });
});
