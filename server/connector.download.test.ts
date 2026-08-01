import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  findProfile: vi.fn(),
  findActiveComplimentaryAccess: vi.fn(),
  storageGet: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./storage")>()),
  storageGet: mocks.storageGet,
}));

vi.mock("./complimentaryAccess", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./complimentaryAccess")>()),
  findActiveComplimentaryAccess: mocks.findActiveComplimentaryAccess,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-connector-account`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("private connector download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const activeAccountQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ suspendedUntil: null }]),
    };
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => activeAccountQuery),
      query: { businessProfiles: { findFirst: mocks.findProfile } },
    });
    mocks.findActiveComplimentaryAccess.mockResolvedValue(null);
    mocks.storageGet.mockResolvedValue({
      key: "connectors/get-phame-connector.zip",
      url: "https://signed.example.com/get-phame-connector.zip",
    });
  });

  it("rejects free users before requesting a signed URL", async () => {
    mocks.findProfile.mockResolvedValue({ tier: "free", planExpiresAt: null });

    await expect(appRouter.createCaller(context("user")).connector.download())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.storageGet).not.toHaveBeenCalled();
  });

  it("allows administrators regardless of profile tier", async () => {
    mocks.findProfile.mockResolvedValue({ tier: "free", planExpiresAt: null });

    await expect(appRouter.createCaller(context("admin")).connector.download())
      .resolves.toEqual({
        url: "https://signed.example.com/get-phame-connector.zip",
        fileName: "get-phame-connector.zip",
      });
  });

  it("allows active paid users and rejects expired subscriptions", async () => {
    mocks.findProfile.mockResolvedValueOnce({ tier: "pro", planExpiresAt: Date.now() + 60_000 });
    await expect(appRouter.createCaller(context("user")).connector.download()).resolves.toMatchObject({
      fileName: "get-phame-connector.zip",
    });

    mocks.findProfile.mockResolvedValueOnce({ tier: "annual", planExpiresAt: Date.now() - 60_000 });
    await expect(appRouter.createCaller(context("user")).connector.download())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
