import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getSignupRiskReview: vi.fn(),
}));

vi.mock("./signupRisk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./signupRisk")>()),
  getSignupRiskReview: mocks.getSignupRiskReview,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-account`,
      email: `${role}@example.test`,
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

describe("administrator signup-risk review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSignupRiskReview.mockResolvedValue({
      summary: { total: 1, allowed: 0, verified: 1, restricted: 0, blocked: 0 },
      events: [{ id: 9, provider: "google", outcome: "verified", occurredAt: Date.UTC(2026, 6, 31, 12, 0, 0) }],
    });
  });

  it("rejects non-administrators before querying signup-risk records", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.signupRiskReview.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getSignupRiskReview).not.toHaveBeenCalled();
  });

  it("returns only the bounded safe status contract to administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.signupRiskReview.dashboard({ outcome: "verified", limit: 20 });

    expect(mocks.getSignupRiskReview).toHaveBeenCalledWith({ outcome: "verified", limit: 20 });
    expect(result).toEqual({
      summary: { total: 1, allowed: 0, verified: 1, restricted: 0, blocked: 0 },
      events: [{ id: 9, provider: "google", outcome: "verified", occurredAt: Date.UTC(2026, 6, 31, 12, 0, 0) }],
    });
    expect(JSON.stringify(result)).not.toMatch(/email|ip|device|fingerprint|secret/i);
  });

  it("rejects oversized review requests before the protected query", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.signupRiskReview.dashboard({ limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getSignupRiskReview).not.toHaveBeenCalled();
  });
});
