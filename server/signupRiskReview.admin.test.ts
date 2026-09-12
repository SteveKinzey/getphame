import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSignupRiskReview: vi.fn(),
  getDisposableDomainReviewQueue: vi.fn(),
  resolveDisposableDomainReview: vi.fn(),
  runDisposableDomainManualSync: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./signupRisk", async importOriginal => ({
  ...(await importOriginal<typeof import("./signupRisk")>()),
  getSignupRiskReview: mocks.getSignupRiskReview,
}));
vi.mock("./disposableDomains", () => ({
  getDisposableDomainReviewQueue: mocks.getDisposableDomainReviewQueue,
  resolveDisposableDomainReview: mocks.resolveDisposableDomainReview,
  runDisposableDomainManualSync: mocks.runDisposableDomainManualSync,
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
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ suspendedUntil: null }],
          }),
        }),
      })),
    });
    mocks.getSignupRiskReview.mockResolvedValue({
      summary: { total: 1, allowed: 0, verified: 1, restricted: 0, blocked: 0 },
      events: [
        {
          id: 9,
          provider: "google",
          outcome: "verified",
          occurredAt: Date.UTC(2026, 6, 31, 12, 0, 0),
        },
      ],
    });
    mocks.getDisposableDomainReviewQueue.mockResolvedValue({
      summary: { total: 1, pending: 1, dismissed: 0, resolved: 0 },
      reviews: [
        {
          id: 21,
          userId: 42,
          domain: "temporary-mail.example",
          confidenceScore: 100,
          status: "pending",
          detectedAt: Date.UTC(2026, 6, 31, 12, 0, 0),
          lastDetectedAt: Date.UTC(2026, 6, 31, 12, 0, 0),
          resolvedAt: null,
          adminNote: null,
        },
      ],
    });
    mocks.runDisposableDomainManualSync.mockResolvedValue({
      status: "ok",
      summary: {
        feedCount: 2,
        normalizedDomains: 1,
        mxChecked: 1,
        accountReviews: 0,
      },
    });
  });

  it("rejects non-administrators before querying signup-risk records", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.signupRiskReview.dashboard()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.getSignupRiskReview).not.toHaveBeenCalled();
  });

  it("returns only the bounded safe status contract to administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.signupRiskReview.dashboard({
      outcome: "verified",
      limit: 20,
    });

    expect(mocks.getSignupRiskReview).toHaveBeenCalledWith({
      outcome: "verified",
      limit: 20,
    });
    expect(result).toEqual({
      summary: { total: 1, allowed: 0, verified: 1, restricted: 0, blocked: 0 },
      events: [
        {
          id: 9,
          provider: "google",
          outcome: "verified",
          occurredAt: Date.UTC(2026, 6, 31, 12, 0, 0),
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /email|ip|device|fingerprint|secret/i
    );
  });

  it("rejects oversized review requests before the protected query", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(
      caller.signupRiskReview.dashboard({ limit: 101 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getSignupRiskReview).not.toHaveBeenCalled();
  });

  it("keeps the disposable-domain review queue administrator-only", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(
      caller.signupRiskReview.disposableDomainQueue()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.signupRiskReview.resolveDisposableDomainReview({
        reviewId: 21,
        status: "dismissed",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getDisposableDomainReviewQueue).not.toHaveBeenCalled();
    expect(mocks.resolveDisposableDomainReview).not.toHaveBeenCalled();
    await expect(
      caller.signupRiskReview.syncDisposableDomainCatalog()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.runDisposableDomainManualSync).not.toHaveBeenCalled();
  });

  it("returns the bounded review contract and records the resolving administrator", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.signupRiskReview.disposableDomainQueue({
      status: "pending",
      limit: 20,
    });
    await caller.signupRiskReview.resolveDisposableDomainReview({
      reviewId: 21,
      status: "dismissed",
      adminNote: "Verified legitimate customer address.",
    });

    expect(mocks.getDisposableDomainReviewQueue).toHaveBeenCalledWith({
      status: "pending",
      limit: 20,
    });
    expect(result).toEqual(
      expect.objectContaining({
        summary: { total: 1, pending: 1, dismissed: 0, resolved: 0 },
      })
    );
    expect(JSON.stringify(result)).not.toMatch(
      /email|ip|device|fingerprint|secret/i
    );
    expect(mocks.resolveDisposableDomainReview).toHaveBeenCalledWith({
      reviewId: 21,
      status: "dismissed",
      adminNote: "Verified legitimate customer address.",
      adminUserId: 1,
    });
  });

  it("allows an administrator to trigger the cooldown-protected initial catalog synchronization", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(
      caller.signupRiskReview.syncDisposableDomainCatalog()
    ).resolves.toMatchObject({
      status: "ok",
      summary: { normalizedDomains: 1 },
    });
    expect(mocks.runDisposableDomainManualSync).toHaveBeenCalledTimes(1);
  });
});
