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
  issueSecuritySession: vi.fn(),
  sendUserWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  recordSignupRiskEvent: vi.fn().mockResolvedValue(undefined),
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

vi.mock("./security/passkeySessions", () => ({
  issueSecuritySession: mocks.issueSecuritySession,
}));

vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-cookie-signing-secret",
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

vi.mock("./signupRisk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./signupRisk")>();
  return { ...actual, recordSignupRiskEvent: mocks.recordSignupRiskEvent };
});

import { registerAppleAuthRoutes } from "./appleAuth";
import { createSignedHumanProof } from "./signupRisk";

function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  registerAppleAuthRoutes(app);
  return app;
}

async function createAppleRequestState(app = createApp(), humanProof?: string) {
  const response = await request(app).get(humanProof
    ? `/api/auth/apple?human_proof=${encodeURIComponent(humanProof)}`
    : "/api/auth/apple");
  const authorizationUrl = new URL(response.headers.location);
  return {
    app,
    state: authorizationUrl.searchParams.get("state"),
    nonce: authorizationUrl.searchParams.get("nonce"),
    authorizationUrl,
  };
}

describe("Apple Sign In callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://getphame.app";
    process.env.SIGNUP_RISK_HMAC_SECRET = "test-signup-risk-secret-which-is-long-enough";
    mocks.getAuthorizationToken.mockResolvedValue({ id_token: "verified-id-token" });
    mocks.verifyIdToken.mockResolvedValue({
      sub: "apple-user-123",
      email: "steve@example.test",
      email_verified: true,
    });
    mocks.issueSecuritySession.mockImplementation(async ({ res }: { res: express.Response }) => {
      res.cookie("app_session_id", "revocable-session-token", { httpOnly: true, secure: true });
      return { id: "session-id", token: "revocable-session-token", maxAge: 30 * 24 * 60 * 60 * 1000 };
    });
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.getUserByEmail.mockResolvedValue(undefined);
  });

  it("requests and verifies Apple's signed identity token directly from the form-post callback", async () => {
    mocks.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 77, openId: "apple_apple-user-123" });
    const { app, state, nonce, authorizationUrl } = await createAppleRequestState(
      createApp(),
      createSignedHumanProof("provider-oauth"),
    );

    expect(authorizationUrl.searchParams.get("response_type")).toBe("code id_token");
    expect(authorizationUrl.searchParams.get("response_mode")).toBe("form_post");
    expect(state).toBeTruthy();
    expect(nonce).toBeTruthy();

    const response = await request(app)
      .post("/api/auth/apple/callback")
      .type("form")
      .send({
        code: "short-lived-authorization-code",
        id_token: "callback-id-token",
        state,
        user: JSON.stringify({
          email: "steve@example.test",
          name: { firstName: "Steve", lastName: "Kinzey" },
        }),
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/auth/apple/landing?return=%2F");
    expect(mocks.getAuthorizationToken).not.toHaveBeenCalled();
    expect(mocks.verifyIdToken).toHaveBeenCalledWith(
      "callback-id-token",
      expect.objectContaining({
        audience: "app.getphame.signin",
        nonce,
      }),
    );
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
      openId: "apple_apple-user-123",
      email: "steve@example.test",
      name: "Steve Kinzey",
      loginMethod: "apple",
    }));
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 77,
      authMethod: "oauth",
      assurance: "a1",
    }));
    expect(response.headers["set-cookie"]?.[0]).toContain("revocable-session-token");
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
    mocks.getUserByOpenId.mockImplementation(async (openId: string) =>
      openId === existingAccount.openId ? existingAccount : undefined,
    );
    const { app, state } = await createAppleRequestState();

    const response = await request(app)
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ code: "existing-user-code", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/auth/apple/landing?return=%2F");
    expect(mocks.linkUserIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      openId: "apple_apple-user-123",
      loginMethod: "apple",
    }));
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(expect.objectContaining({
      userId: existingAccount.id,
      authMethod: "oauth",
      assurance: "a1",
    }));
    expect(response.headers["set-cookie"]?.[0]).toContain("revocable-session-token");
  });

  it("returns a safe callback error when Apple does not provide an authorization code", async () => {
    const { app, state } = await createAppleRequestState();
    const response = await request(app)
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ error: "access_denied", error_description: "The user cancelled", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?auth_error=apple_authorization_failed");
    expect(mocks.getAuthorizationToken).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("does not create or link an account when Apple's token exchange fails", async () => {
    mocks.getAuthorizationToken.mockResolvedValue({ error: "invalid_grant" });
    const { app, state } = await createAppleRequestState();

    const response = await request(app)
      .post("/api/auth/apple/callback")
      .type("form")
      .send({ code: "expired-or-reused-code", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?auth_error=apple_token_exchange_failed");
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(mocks.linkUserIdentity).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("rejects a tampered signed state before verifying or exchanging tokens", async () => {
    const { app, state } = await createAppleRequestState();

    const response = await request(app)
      .post("/api/auth/apple/callback")
      .type("form")
      .send({
        code: "authorization-code",
        id_token: "callback-id-token",
        state: `${state}tampered`,
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/?auth_error=apple_state_mismatch");
    expect(mocks.getAuthorizationToken).not.toHaveBeenCalled();
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});
