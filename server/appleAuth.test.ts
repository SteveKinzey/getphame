import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthorizationToken: vi.fn(),
  verifyIdToken: vi.fn(),
  getClientSecret: vi.fn(() => "signed-apple-client-secret"),
  getAuthorizationUrl: vi.fn(() => "https://appleid.apple.com/auth/authorize"),
  getUserByOpenId: vi.fn(),
  getUserByEmail: vi.fn(),
  linkUserIdentity: vi.fn(),
  upsertUser: vi.fn(),
  anonymiseUserByOpenId: vi.fn(),
  createSessionToken: vi.fn(),
  sendUserWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("apple-signin-auth", () => ({
  default: {
    getAuthorizationToken: mocks.getAuthorizationToken,
    verifyIdToken: mocks.verifyIdToken,
    getClientSecret: mocks.getClientSecret,
    getAuthorizationUrl: mocks.getAuthorizationUrl,
  },
}));

vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
  getUserByEmail: mocks.getUserByEmail,
  linkUserIdentity: mocks.linkUserIdentity,
  upsertUser: mocks.upsertUser,
  anonymiseUserByOpenId: mocks.anonymiseUserByOpenId,
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

vi.mock("./_core/env", () => ({
  ENV: {
    appleClientId: "app.getphame.signin",
    appleTeamId: "TEAM123456",
    appleKeyId: "KEY1234567",
    applePrivateKey: "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----",
    ownerOpenId: "owner-open-id",
  },
}));

vi.mock("./smtp", () => ({
  sendUserWelcomeEmail: mocks.sendUserWelcomeEmail,
}));

import { registerAppleAuthRoutes } from "./appleAuth";

function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  registerAppleAuthRoutes(app);
  return app;
}

describe("Apple Sign In callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://getphame.app";
    mocks.getAuthorizationToken.mockResolvedValue({ id_token: "verified-id-token" });
    mocks.verifyIdToken.mockResolvedValue({
      sub: "apple-user-123",
      email: "steve@example.test",
    });
    mocks.createSessionToken.mockResolvedValue("signed-session-token");
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.getUserByEmail.mockResolvedValue(undefined);
  });

  it("exchanges Apple's browser callback code for an identity token before verification", async () => {
    mocks.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 1, openId: "owner-open-id" });

    const response = await request(createApp())
      .post("/api/auth/apple/callback")
      .type("form")
      .send({
        code: "short-lived-authorization-code",
        user: JSON.stringify({
          email: "steve@example.test",
          name: { firstName: "Steve", lastName: "Kinzey" },
        }),
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/auth/apple/landing?return=%2F");
    expect(mocks.getAuthorizationToken).toHaveBeenCalledWith(
      "short-lived-authorization-code",
      expect.objectContaining({
        clientID: "app.getphame.signin",
        redirectUri: "https://getphame.app/api/auth/apple/callback",
        clientSecret: "signed-apple-client-secret",
      }),
    );
    expect(mocks.verifyIdToken).toHaveBeenCalledWith(
      "verified-id-token",
      expect.objectContaining({ audience: "app.getphame.signin" }),
    );
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      openId: "apple_apple-user-123",
      email: "steve@example.test",
      name: "Steve Kinzey",
      loginMethod: "apple",
    }));
    expect(mocks.createSessionToken).toHaveBeenCalledWith(
      "apple_apple-user-123",
      expect.any(Object),
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("signed-session-token");
  });

  it("links Apple identity to an existing matching-email account instead of creating a duplicate", async () => {
    const existingAccount = {
      id: 42,
      openId: "google-existing-steve",
      email: "steve@example.test",
      name: "Steve Existing",
      role: "admin",
    };
    mocks.getUserByEmail.mockResolvedValue(existingAccount);

    const response = await request(createApp())
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ code: "existing-user-code" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/auth/apple/landing?return=%2F");
    expect(mocks.linkUserIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      openId: "apple_apple-user-123",
      loginMethod: "apple",
    }));
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(mocks.createSessionToken).toHaveBeenCalledWith(
      "google-existing-steve",
      expect.objectContaining({ name: "Steve Existing" }),
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("signed-session-token");
  });

  it("returns a safe callback error when Apple does not provide an authorization code", async () => {
    const response = await request(createApp())
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ error: "access_denied", error_description: "The user cancelled" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?auth_error=apple_authorization_failed");
    expect(mocks.getAuthorizationToken).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("does not create or link an account when Apple's token exchange fails", async () => {
    mocks.getAuthorizationToken.mockRejectedValue(new Error("invalid_grant"));

    const response = await request(createApp())
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ code: "expired-or-reused-code" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?auth_error=apple_failed");
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(mocks.linkUserIdentity).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});
