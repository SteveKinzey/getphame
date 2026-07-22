import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { FREE_LIMIT_ERR_MSG } from "@shared/const";
import { formatFreeQuotaBlockedMessage } from "./quotaEnforcement";

const quota = {
  phase: "rolling" as const,
  limit: 5,
  used: 5,
  remaining: 0,
  totalSent: 15,
  blocked: true,
  nextAvailableAt: Date.UTC(2026, 6, 20, 12, 0, 0),
};

const mocks = vi.hoisted(() => ({
  evaluateFreeQuotaAccess: vi.fn(),
  getBusinessProfile: vi.fn(),
  getUserByApiKey: vi.fn(),
  getDb: vi.fn(),
  authenticateDeveloperApiKeyWithStatus: vi.fn(),
  checkDeveloperApiAbuse: vi.fn(),
  checkDeveloperApiRateLimit: vi.fn(),
  getAdaptiveSendStatus: vi.fn(),
}));

vi.mock("./quotaEnforcement", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./quotaEnforcement")>()),
  evaluateFreeQuotaAccess: mocks.evaluateFreeQuotaAccess,
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getBusinessProfile: mocks.getBusinessProfile,
  getUserByApiKey: mocks.getUserByApiKey,
  getDb: mocks.getDb,
}));

vi.mock("./developerApiKeys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./developerApiKeys")>()),
  authenticateDeveloperApiKeyWithStatus: mocks.authenticateDeveloperApiKeyWithStatus,
}));

vi.mock("./developerApiAbuse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./developerApiAbuse")>()),
  checkDeveloperApiAbuse: mocks.checkDeveloperApiAbuse,
}));

vi.mock("./developerApiImports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./developerApiImports")>()),
  checkDeveloperApiRateLimit: mocks.checkDeveloperApiRateLimit,
}));

vi.mock("./adaptiveSendLimits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adaptiveSendLimits")>()),
  getAdaptiveSendStatus: mocks.getAdaptiveSendStatus,
}));

import { appRouter } from "./routers";
import { registerPublicApiRoutes } from "./publicApi";

function context(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "quota-user",
      email: "quota@example.com",
      name: "Quota User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("runtime Free-plan quota parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.evaluateFreeQuotaAccess.mockResolvedValue({ allowed: false, quota, isAdmin: false });
    mocks.getBusinessProfile.mockResolvedValue({ tier: "free", monthlyCount: 0, monthlyResetDate: "2026-07" });
    mocks.getUserByApiKey.mockResolvedValue(42);
    mocks.authenticateDeveloperApiKeyWithStatus.mockResolvedValue({
      kind: "ok",
      principal: {
        apiKeyId: 1,
        userId: 42,
        label: "Quota runtime test",
        scopes: ["review_requests:send"],
        expiresAt: null,
        inactivityExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      },
    });
    mocks.checkDeveloperApiAbuse.mockResolvedValue({ allowed: true });
    mocks.checkDeveloperApiRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      retryAfterSeconds: 0,
    });
    mocks.getAdaptiveSendStatus.mockResolvedValue({ configured: true });
    mocks.getDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ id: 1 }] }),
        }),
      }),
    });
  });

  it("returns the shared blocked message from the in-app tRPC send boundary", async () => {
    const caller = appRouter.createCaller(context());
    const expected = formatFreeQuotaBlockedMessage(quota, FREE_LIMIT_ERR_MSG);

    await expect(caller.requests.send({
      customerName: "Blocked Customer",
      customerEmail: "blocked@example.com",
      method: "email",
    })).rejects.toMatchObject({ code: "FORBIDDEN", message: expected });
  });

  it("returns HTTP 429 with the same message from the public API send boundary", async () => {
    const app = express();
    app.use(express.json());
    registerPublicApiRoutes(app);
    const expected = formatFreeQuotaBlockedMessage(quota, FREE_LIMIT_ERR_MSG);

    const response = await request(app)
      .post("/api/public/send")
      .set("Authorization", "Bearer rl_quota_runtime_unique_key")
      .send({ customerName: "Blocked Customer", customerEmail: "blocked@example.com" });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: expected });
  });
});
