import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("../_core/cookies", () => ({
  getSessionCookieOptions: () => ({
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  }),
}));

import { COOKIE_NAME } from "../../shared/const";
import {
  SECURITY_SESSION_LIFETIME_MS,
  authenticateSecuritySession,
  hashSecurityValue,
  isSecuritySessionToken,
  issueSecuritySession,
  revokeSecuritySessionFromRequest,
} from "./passkeySessions";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const TOKEN_SECRET = "a".repeat(43);
const OAUTH_TOKEN = `oa.${UUID}.${TOKEN_SECRET}`;

function requestWith({ cookie, bearer }: { cookie?: string; bearer?: string } = {}): Request {
  return {
    cookies: cookie ? { [COOKIE_NAME]: cookie } : {},
    ip: "127.0.0.1",
    get(name: string) {
      if (name.toLowerCase() === "authorization" && bearer) return `Bearer ${bearer}`;
      if (name.toLowerCase() === "user-agent") return "GetPhame-Test/1.0";
      return undefined;
    },
  } as unknown as Request;
}

function selectChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function updateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  return { where, set };
}

function validSession(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: UUID,
    userId: 44,
    tokenHash: hashSecurityValue(OAUTH_TOKEN),
    authMethod: "oauth",
    assurance: "a1",
    authenticatedAt: now - 1_000,
    lastStepUpAt: null,
    expiresAt: now + 60_000,
    lastSeenAt: now,
    revokedAt: null,
    ...overrides,
  };
}

const user = {
  id: 44,
  openId: "google-user-44",
  name: "Steve",
  email: "steve@example.test",
  loginMethod: "google",
  role: "user",
};

describe("revocable interactive sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a 30-day opaque OAuth session, stores only its hash, and sets the browser cookie", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.getDb.mockResolvedValue({ insert: vi.fn(() => ({ values })) });
    const cookie = vi.fn();
    const res = { cookie } as unknown as Response;

    const result = await issueSecuritySession({
      userId: user.id,
      authMethod: "oauth",
      assurance: "a1",
      req: requestWith(),
      res,
    });

    expect(isSecuritySessionToken(result.token)).toBe(true);
    expect(result.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(result.maxAge).toBe(SECURITY_SESSION_LIFETIME_MS);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: user.id,
      authMethod: "oauth",
      assurance: "a1",
      tokenHash: hashSecurityValue(result.token),
    }));
    expect(values.mock.calls[0][0].tokenHash).not.toBe(result.token);
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, result.token, expect.objectContaining({
      httpOnly: true,
      maxAge: SECURITY_SESSION_LIFETIME_MS,
    }));
  });

  it("authenticates the same opaque format from a mobile Bearer header", async () => {
    mocks.getDb.mockResolvedValue({
      select: vi.fn()
        .mockImplementationOnce(() => selectChain([validSession()]))
        .mockImplementationOnce(() => selectChain([user])),
      update: vi.fn(),
    });

    const result = await authenticateSecuritySession(requestWith({ bearer: OAUTH_TOKEN }));

    expect(result).toEqual({
      user,
      securitySession: expect.objectContaining({ id: UUID, method: "oauth", assurance: "a1" }),
    });
  });

  it("rejects a missing, expired, or revoked backing record", async () => {
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => selectChain([])),
    });

    await expect(authenticateSecuritySession(requestWith({ cookie: OAUTH_TOKEN }))).resolves.toBeNull();
  });

  it("revokes a session that exceeds the seven-day idle window", async () => {
    const update = updateChain();
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => selectChain([validSession({
        lastSeenAt: Date.now() - (8 * 24 * 60 * 60 * 1000),
      })])),
      update: vi.fn(() => ({ set: update.set })),
    });

    const result = await authenticateSecuritySession(requestWith({ cookie: OAUTH_TOKEN }));

    expect(result).toBeNull();
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ revocationReason: "idle_timeout" }));
  });

  it("revokes the exact backing session during logout", async () => {
    const update = updateChain();
    mocks.getDb.mockResolvedValue({ update: vi.fn(() => ({ set: update.set })) });

    await expect(revokeSecuritySessionFromRequest(
      requestWith({ cookie: OAUTH_TOKEN }),
      "user_logout",
    )).resolves.toBe(true);
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ revocationReason: "user_logout" }));
    expect(update.where).toHaveBeenCalledOnce();
  });
});
