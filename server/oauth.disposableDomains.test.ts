import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeOAuthState, OAUTH_STATE_COOKIE } from "../shared/const";

const mocks = vi.hoisted(() => ({
  exchangeCodeForToken: vi.fn(),
  getUserInfo: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  isHighConfidenceDisposableEmail: vi.fn(),
  issueSecuritySession: vi.fn(),
  sendUserWelcomeEmail: vi.fn(),
}));

vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "owner-open-id" } }));
vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: mocks.exchangeCodeForToken,
    getUserInfo: mocks.getUserInfo,
  },
}));
vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
  upsertUser: mocks.upsertUser,
}));
vi.mock("./disposableDomains", () => ({
  isHighConfidenceDisposableEmail: mocks.isHighConfidenceDisposableEmail,
}));
vi.mock("./security/passkeySessions", () => ({
  issueSecuritySession: mocks.issueSecuritySession,
}));
vi.mock("./smtp", () => ({ sendUserWelcomeEmail: mocks.sendUserWelcomeEmail }));

import { registerOAuthRoutes } from "./_core/oauth";

describe("framework OAuth disposable-domain enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForToken.mockResolvedValue({ accessToken: "oauth-access-token" });
    mocks.getUserInfo.mockResolvedValue({
      openId: "framework-user-123",
      email: "member@example.test",
      name: "Member",
      loginMethod: "oauth",
    });
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(true);
  });

  it("rejects a new high-confidence disposable OAuth identity before persistence", async () => {
    const app = express();
    registerOAuthRoutes(app);
    const nonce = "11111111-1111-4111-8111-111111111111";
    const state = encodeOAuthState({
      redirectUri: "https://getphame.app/api/oauth/callback",
      nonce,
    });

    const response = await request(app)
      .get("/api/oauth/callback")
      .set("Cookie", `${OAUTH_STATE_COOKIE}=${nonce}`)
      .query({ code: "oauth-code", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "/login?auth_error=disposable_email"
    );
    expect(mocks.upsertUser).not.toHaveBeenCalled();
    expect(mocks.issueSecuritySession).not.toHaveBeenCalled();
  });
});
