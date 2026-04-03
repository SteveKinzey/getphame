import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db and gmail modules so tests don't need a real DB or Google OAuth
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getBusinessProfile: vi.fn().mockResolvedValue(null),
  upsertBusinessProfile: vi.fn().mockResolvedValue(undefined),
  createCustomerRequest: vi.fn().mockResolvedValue({ id: 1 }),
  getCustomerRequests: vi.fn().mockResolvedValue([]),
  getMonthlyRequestCount: vi.fn().mockResolvedValue(0),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./gmail", () => ({
  buildGmailAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=1"),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
  deleteGmailTokens: vi.fn().mockResolvedValue(undefined),
  sendViaGmail: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-42",
    email: "owner@example.com",
    name: "Test Owner",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("gmail.authUrl", () => {
  it("returns a Google OAuth URL for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gmail.authUrl({ origin: "https://example.com" });
    expect(result.url).toContain("accounts.google.com");
  });
});

describe("gmail.status", () => {
  it("returns connected: false when no token is stored", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gmail.status();
    expect(result.connected).toBe(false);
    expect(result.gmailEmail).toBeNull();
  });
});

describe("gmail.disconnect", () => {
  it("successfully disconnects Gmail tokens", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gmail.disconnect();
    expect(result.success).toBe(true);
  });
});

describe("profile.get", () => {
  it("returns null when no profile exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profile.get();
    expect(result).toBeNull();
  });
});

describe("profile.upsert", () => {
  it("throws when reviewLink is not a valid URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.profile.upsert({ businessName: "Test Biz", reviewLink: "not-a-url" })
    ).rejects.toThrow();
  });
});

describe("requests.stats", () => {
  it("returns zero stats when no requests exist", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.requests.stats();
    expect(result.total).toBe(0);
    expect(result.thisMonth).toBe(0);
    expect(result.recent).toHaveLength(0);
  });
});
