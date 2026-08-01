import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  issueSecuritySession: vi.fn(),
  sendUserWelcomeEmail: vi.fn(),
  recordAuthLifecycleEvent: vi.fn().mockResolvedValue(null),
  findAuthRequestByToken: vi.fn().mockResolvedValue(null),
  isHighConfidenceDisposableEmail: vi.fn().mockResolvedValue(false),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  getUserByEmail: mocks.getUserByEmail,
  getUserByOpenId: mocks.getUserByOpenId,
  upsertUser: mocks.upsertUser,
}));

vi.mock("./security/passkeySessions", () => ({
  issueSecuritySession: mocks.issueSecuritySession,
}));

vi.mock("./disposableDomains", () => ({
  isHighConfidenceDisposableEmail: mocks.isHighConfidenceDisposableEmail,
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

vi.mock("./authOperations", () => ({
  classifyAuthDiagnosticError: () => "operation_failed",
  findAuthRequestByToken: mocks.findAuthRequestByToken,
  maskDiagnosticEmail: (email: string) => email,
  recordAuthLifecycleEvent: mocks.recordAuthLifecycleEvent,
  redactAuthDiagnosticDetail: (error: unknown) => String(error),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "owner" },
}));

import { registerEmailAuthRoutes } from "./auth-email";

describe("email magic-link verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(false);
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
    mocks.issueSecuritySession
      .mockRejectedValueOnce(new Error("session signer unavailable"))
      .mockResolvedValueOnce({ token: "signed-session-token", maxAge: 30 * 24 * 60 * 60 * 1000 });

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
    expect(mocks.issueSecuritySession).toHaveBeenLastCalledWith(expect.objectContaining({
      userId: 12,
      authMethod: "magic_link",
      assurance: "a1",
    }));
    expect(mocks.recordAuthLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "verification_failed",
        outcome: "fail",
        token: record.token,
      }),
    );
    expect(mocks.recordAuthLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "verification_succeeded",
        outcome: "ok",
        token: record.token,
      }),
    );
  });

  it("prefers the canonical normalized-email account over a stale direct-email identity", async () => {
    const record = {
      id: 88,
      email: "steve@example.test",
      token: "existing-account-token",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([record]) })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
    };
    const existingAccount = {
      id: 42,
      openId: "google-existing-steve",
      email: record.email,
      name: "Steve Existing",
      role: "user",
    };
    const staleEmailAccount = {
      id: 84,
      openId: `email_${record.email}`,
      email: record.email,
      name: null,
      role: "user",
    };

    mocks.getDb.mockResolvedValue(database);
    mocks.getUserByOpenId.mockResolvedValue(existingAccount);
    mocks.getUserByEmail.mockResolvedValue(existingAccount);
    mocks.upsertUser.mockResolvedValue(undefined);
    mocks.issueSecuritySession.mockResolvedValue({
      token: "existing-account-session",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const response = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      openId: existingAccount.openId,
      email: record.email,
    }));
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(expect.objectContaining({
      userId: existingAccount.id,
      authMethod: "magic_link",
      assurance: "a1",
    }));
    expect(mocks.getUserByOpenId).toHaveBeenCalledWith(existingAccount.openId);
    expect(mocks.getUserByOpenId).not.toHaveBeenCalledWith(staleEmailAccount.openId);
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects a genuinely new account without a signed human proof while preserving the token", async () => {
    const record = {
      id: 90,
      email: "new-account@example.test",
      token: "new-account-without-proof",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([record]) })),
        })),
      })),
      update: vi.fn(),
    };

    mocks.getDb.mockResolvedValue(database);
    mocks.getUserByEmail.mockResolvedValue(undefined);
    mocks.getUserByOpenId.mockResolvedValue(undefined);

    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const response = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login?auth_error=human_verification_required");
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("rejects a genuinely new high-confidence disposable-domain account without consuming the token", async () => {
    const record = {
      id: 91,
      email: "new-account@disposable.test",
      token: "new-disposable-account",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([record]) })),
        })),
      })),
      update: vi.fn(),
    };

    mocks.getDb.mockResolvedValue(database);
    mocks.getUserByEmail.mockResolvedValue(undefined);
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(true);

    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const response = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login?auth_error=disposable_email");
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("falls back to the normalized email when an existing account has no usable display name", async () => {
    const record = {
      id: 99,
      email: "steve@sk-america.com",
      token: "missing-name-token",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([record]) })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
    };
    const existingAccount = {
      id: 12,
      openId: "apple-existing-steve",
      email: record.email,
      name: "   ",
      role: "admin",
    };

    mocks.getDb.mockResolvedValue(database);
    mocks.getUserByOpenId.mockResolvedValue(existingAccount);
    mocks.getUserByEmail.mockResolvedValue(existingAccount);
    mocks.upsertUser.mockResolvedValue(undefined);
    mocks.issueSecuritySession.mockResolvedValue({
      token: "valid-named-session",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const response = await request(app)
      .get("/api/auth/magic-link/verify")
      .query({ token: record.token });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(expect.objectContaining({
      userId: existingAccount.id,
      authMethod: "magic_link",
      assurance: "a1",
    }));
    expect(response.headers["set-cookie"]?.[0]).toContain("valid-named-session");
  });
});
