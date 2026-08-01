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
  createProviderHumanVerificationAttempt: vi.fn(),
  consumeProviderHumanVerificationAttempt: vi.fn(),
  verifyProviderStartHumanToken: vi.fn(),
  isHighConfidenceDisposableEmail: vi.fn(),
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

vi.mock("./security/passkeySessions", () => ({
  issueSecuritySession: mocks.issueSecuritySession,
}));
vi.mock("./smtp", () => ({ sendUserWelcomeEmail: mocks.sendUserWelcomeEmail }));
vi.mock("./signupRisk", async importOriginal => {
  const actual = await importOriginal<typeof import("./signupRisk")>();
  return {
    ...actual,
    recordSignupRiskEvent: mocks.recordSignupRiskEvent,
    createProviderHumanVerificationAttempt:
      mocks.createProviderHumanVerificationAttempt,
    consumeProviderHumanVerificationAttempt:
      mocks.consumeProviderHumanVerificationAttempt,
  };
});
vi.mock("./security/humanVerification", () => ({
  verifyProviderStartHumanToken: mocks.verifyProviderStartHumanToken,
}));
vi.mock("./disposableDomains", () => ({
  isHighConfidenceDisposableEmail: mocks.isHighConfidenceDisposableEmail,
}));

import { registerGoogleAuthRoutes } from "./auth-google";
import {
  createProviderOAuthState,
  verifyProviderOAuthState,
} from "./security/passkeyEnrollmentIntent";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const cookie = String(req.headers.cookie ?? "");
    const state = cookie.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1];
    req.cookies = {
      google_oauth_state: state ? decodeURIComponent(state) : undefined,
    };
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
    process.env.JWT_SECRET =
      "google-callback-test-secret-with-sufficient-entropy";
    process.env.SIGNUP_RISK_HMAC_SECRET =
      "signup-risk-test-secret-with-sufficient-entropy";
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
    mocks.getToken.mockResolvedValue({
      tokens: { access_token: "access-token" },
    });
    mocks.getUserInfo.mockResolvedValue({
      data: {
        id: "google-user-123",
        email: "member@example.test",
        verified_email: true,
        name: "Member",
      },
    });
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.getUserByEmail.mockResolvedValue(undefined);
    mocks.issueSecuritySession.mockResolvedValue(undefined);
    mocks.verifyProviderStartHumanToken.mockResolvedValue(true);
    mocks.createProviderHumanVerificationAttempt.mockResolvedValue(
      "11111111-1111-4111-8111-111111111111"
    );
    mocks.consumeProviderHumanVerificationAttempt.mockResolvedValue(false);
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(false);
    mocks.generateAuthUrl.mockImplementation(
      ({ state }: { state: string }) =>
        `https://accounts.google.test/authorize?state=${encodeURIComponent(state)}`
    );
  });

  it("starts Google OAuth only after Turnstile verification and binds the one-time attempt into signed state", async () => {
    const response = await request(createApp())
      .post("/api/auth/google/start")
      .send({ token: "turnstile-token-that-is-long-enough" });

    expect(response.status).toBe(200);
    expect(response.body.url).toContain(
      "https://accounts.google.test/authorize"
    );
    expect(mocks.verifyProviderStartHumanToken).toHaveBeenCalledWith(
      expect.anything(),
      "turnstile-token-that-is-long-enough"
    );
    expect(mocks.createProviderHumanVerificationAttempt).toHaveBeenCalledWith(
      "google"
    );
    const generatedState = mocks.generateAuthUrl.mock.calls[0]?.[0]?.state;
    expect(
      verifyProviderOAuthState(generatedState)?.humanVerificationAttemptId
    ).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects a genuinely new provider account without a signed human proof", async () => {
    const state = createProviderOAuthState({});
    const response = await callbackRequest(createApp(), state);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "/login?auth_error=human_verification_required"
    );
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
    expect(mocks.linkUserIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: canonicalUser.id,
        openId: "google_google-user-123",
        loginMethod: "google",
      })
    );
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.sendUserWelcomeEmail).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: canonicalUser.id,
        authMethod: "oauth",
      })
    );
    expect(
      mocks.consumeProviderHumanVerificationAttempt
    ).not.toHaveBeenCalled();
  });

  it("creates a new Google account only once from a consumed provider-bound attempt", async () => {
    const attemptId = "22222222-2222-4222-8222-222222222222";
    const createdUser = {
      id: 77,
      openId: "google_google-user-123",
      email: "member@example.test",
    };
    mocks.consumeProviderHumanVerificationAttempt
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mocks.getUserByOpenId
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createdUser)
      .mockResolvedValueOnce(undefined);
    const state = createProviderOAuthState({
      humanVerificationAttemptId: attemptId,
    });

    const accepted = await callbackRequest(createApp(), state);
    const replayed = await callbackRequest(createApp(), state);

    expect(accepted.status).toBe(302);
    expect(accepted.headers.location).toBe("/onboarding");
    expect(replayed.status).toBe(302);
    expect(replayed.headers.location).toBe(
      "/login?auth_error=human_verification_required"
    );
    expect(
      mocks.consumeProviderHumanVerificationAttempt
    ).toHaveBeenNthCalledWith(1, attemptId, "google");
    expect(
      mocks.consumeProviderHumanVerificationAttempt
    ).toHaveBeenNthCalledWith(2, attemptId, "google");
    expect(mocks.upsertUser).toHaveBeenCalledTimes(1);
  });

  it("rejects a high-confidence disposable Google identity before persistence", async () => {
    const state = createProviderOAuthState({
      humanVerificationAttemptId: "11111111-1111-4111-8111-111111111111",
    });
    mocks.consumeProviderHumanVerificationAttempt.mockResolvedValue(true);
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(true);

    const response = await callbackRequest(createApp(), state);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "/login?auth_error=disposable_email"
    );
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});
