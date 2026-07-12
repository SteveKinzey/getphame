import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  createSessionToken: vi.fn(),
  sendUserWelcomeEmail: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  getUserByOpenId: mocks.getUserByOpenId,
  upsertUser: mocks.upsertUser,
}));

vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: mocks.createSessionToken },
}));

vi.mock("./_core/cookies", () => ({
  getSessionCookieOptions: () => ({
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  }),
}));

vi.mock("./smtp", () => ({
  sendUserWelcomeEmail: mocks.sendUserWelcomeEmail,
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "owner" },
}));

import { registerEmailAuthRoutes } from "./auth-email";

describe("email magic-link verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not consume the token when session creation fails and permits a successful retry", async () => {
    const record = {
      id: 77,
      email: "steve@sk-america.com",
      token: "retryable-token",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    const consumeWhere = vi.fn().mockResolvedValue(undefined);
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([record]),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: consumeWhere })),
      })),
    };

    mocks.getDb.mockResolvedValue(database);
    mocks.getUserByOpenId.mockResolvedValue({ id: 12, openId: `email_${record.email}` });
    mocks.upsertUser.mockResolvedValue(undefined);
    mocks.createSessionToken
      .mockRejectedValueOnce(new Error("session signer unavailable"))
      .mockResolvedValueOnce("signed-session-token");

    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const failedAttempt = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(failedAttempt.status).toBe(302);
    expect(failedAttempt.headers.location).toBe("/login?auth_error=verification_failed");
    expect(database.update).not.toHaveBeenCalled();

    const successfulRetry = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(successfulRetry.status).toBe(302);
    expect(successfulRetry.headers.location).toBe("/");
    expect(database.update).toHaveBeenCalledTimes(1);
    expect(successfulRetry.headers["set-cookie"]?.[0]).toContain("signed-session-token");
  });
});
