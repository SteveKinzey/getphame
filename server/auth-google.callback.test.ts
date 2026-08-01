import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  OAuth2: vi.fn(),
  getToken: vi.fn(),
  setCredentials: vi.fn(),
  generateAuthUrl: vi.fn(),
  getUserInfo: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserByEmail: vi.fn(),
  linkUserIdentity: vi.fn(),
  upsertUser: vi.fn(),
  issueSecuritySession: vi.fn(),
  sendUserWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  recordSignupRiskEvent: vi.fn().mockResolvedValue(undefined),
  isHighConfidenceDisposableEmail: vi.fn().mockResolvedValue(false),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: mocks.OAuth2 },
    oauth2: vi.fn(() => ({ userinfo: { get: mocks.getUserInfo } })),
  },
}));

vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
  getUserByEmail: mocks.getUserByEmail,
  linkUserIdentity: mocks.linkUserIdentity,
  upsertUser: mocks.upsertUser,
}));

vi.mock("./security/passkeySessions", () => ({ issueSecuritySession: mocks.issueSecuritySession }));
vi.mock("./smtp", () => ({ sendUserWelcomeEmail: mocks.sendUserWelcomeEmail }));
vi.mock("./disposableDomains", () => ({ isHighConfidenceDisposableEmail: mocks.isHighConfidenceDisposableEmail }));
vi.mock("./signupRisk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./signupRisk")>();
  return { ...actual, recordSignupRiskEvent: mocks.recordSignupRiskEvent };
});

import { registerGoogleAuthRoutes } from "./auth-google";
import { createProviderOAuthState } from "./security/passkeyEnrollmentIntent";

function createApp() {
  const app = express();
  app.use((req, _res, next) => {
    const cookie = String(req.headers.cookie ?? "");
    const state = cookie.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1];
    req.cookies = { google_oauth_state: state ? decodeURIComponent(state) : undefined };
    next();
  });
  registerGoogleAuthRoutes(app);
  return app;
}

function callbackRequest(app: express.Express, state: string) {
  return request(app)
    .get("/api/auth/google/callback")
    .set("Cookie", `google_oauth_state=${encodeURIComponent(state)}`)
    .query({ code: "provider-code", state });
}

describe("Google callback human-proof enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(false);
    process.env.JWT_SECRET = "google-callback-test-secret-with-sufficient-entropy";
    process.env.SIGNUP_RISK_HMAC_SECRET = "signup-risk-test-secret-with-sufficient-entropy";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.APP_BASE_URL = "https://getphame.app";
    mocks.OAuth2.mockImplementation(function OAuth2Mock() {
      return {
        getToken: mocks.getToken,
        setCredentials: mocks.setCredentials,
        generateAuthUrl: mocks.generateAuthUrl,
      };
    });
    mocks.getToken.mockResolvedValue({ tokens: { access_token: "access-token" } });
    mocks.getUserInfo.mockResolvedValue({
      data: { id: "google-user-123", email: "member@example.test", verified_email: true, name: "Member" },
    });
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.getUserByEmail.mockResolvedValue(undefined);
    mocks.issueSecuritySession.mockResolvedValue(undefined);
  });

  it("rejects a genuinely new provider account without a signed human proof", async () => {
    const state = createProviderOAuthState({});
    const response = await callbackRequest(createApp(), state);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login?auth_error=human_verification_required");
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.linkUserIdentity).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).not.toHaveBeenCalled();
  });

  it("links a verified canonical existing account without requiring a fresh human proof", async () => {
    const canonicalUser = {
      id: 42,
      openId: "apple-existing-member",
      email: "member@example.test",
      name: "Existing Member",
    };
    mocks.getUserByEmail.mockResolvedValue(canonicalUser);
    const state = createProviderOAuthState({});
    const response = await callbackRequest(createApp(), state);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
    expect(mocks.linkUserIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: canonicalUser.id,
      openId: "google_google-user-123",
      loginMethod: "google",
    }));
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(expect.objectContaining({
      userId: canonicalUser.id,
      authMethod: "oauth",
    }));
  });
});
