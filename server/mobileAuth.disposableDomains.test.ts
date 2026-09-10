import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  OAuth2: vi.fn(),
  getToken: vi.fn(),
  setCredentials: vi.fn(),
  getUserInfo: vi.fn(),
  verifyIdToken: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  isHighConfidenceDisposableEmail: vi.fn(),
  issueSecuritySession: vi.fn(),
  sendUserWelcomeEmail: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: mocks.OAuth2 },
    oauth2: vi.fn(() => ({ userinfo: { get: mocks.getUserInfo } })),
  },
}));
vi.mock("apple-signin-auth", () => ({
  default: { verifyIdToken: mocks.verifyIdToken },
}));
vi.mock("./_core/env", () => ({
  ENV: {
    googleClientId: "google-client-id",
    googleClientSecret: "google-client-secret",
    appleClientId: "app.getphame.signin",
    ownerOpenId: "owner-open-id",
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

import { registerMobileAuthRoutes } from "./mobileAuth";

function createApp() {
  const app = express();
  app.use(express.json());
  registerMobileAuthRoutes(app);
  return app;
}

describe("native disposable-domain enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.OAuth2.mockImplementation(function OAuth2Mock() {
      return { getToken: mocks.getToken, setCredentials: mocks.setCredentials };
    });
    mocks.getToken.mockResolvedValue({
      tokens: { access_token: "access-token" },
    });
    mocks.getUserInfo.mockResolvedValue({
      data: {
        id: "google-native-123",
        email: "member@example.test",
        name: "Member",
      },
    });
    mocks.verifyIdToken.mockResolvedValue({ sub: "apple-native-123" });
    mocks.getUserByOpenId.mockResolvedValue(undefined);
    mocks.isHighConfidenceDisposableEmail.mockResolvedValue(true);
  });

  it("rejects a new native Google identity before persistence", async () => {
    const response = await request(createApp())
      .post("/api/auth/mobile/google")
      .send({ code: "provider-code", redirectUri: "getphame://oauth" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "disposable_email" });
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("rejects a new native Apple identity before persistence", async () => {
    const response = await request(createApp())
      .post("/api/auth/mobile/apple")
      .send({ identityToken: "apple-token", email: "member@example.test" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "disposable_email" });
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });
});
