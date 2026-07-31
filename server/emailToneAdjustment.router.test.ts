import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { UNAUTHED_ERR_MSG, UNPAID_ERR_MSG } from "@shared/const";

const mocks = vi.hoisted(() => ({
  adjustEmailTone: vi.fn(),
  findActiveComplimentaryAccess: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./emailToneAdjustment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./emailToneAdjustment")>()),
  adjustEmailTone: mocks.adjustEmailTone,
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./complimentaryAccess", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./complimentaryAccess")>()),
  findActiveComplimentaryAccess: mocks.findActiveComplimentaryAccess,
}));

import { appRouter } from "./routers";

const input = {
  subject: "A quick request from {{businessName}}",
  body: "Hi {{customerName}}, please share feedback at {{platformLinks}}. Reply unsubscribe to opt out.",
  businessName: "Acme Services",
  tone: "warmer" as const,
};

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const entitledUser = {
  id: 501,
  openId: "tone-test-user",
  email: "tone@example.com",
  name: "Tone Test User",
  loginMethod: "email",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("email.adjustTone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findActiveComplimentaryAccess.mockResolvedValue(null);
    mocks.getDb.mockResolvedValue({
      query: {
        businessProfiles: {
          findFirst: vi.fn(),
        },
      },
    });
  });

  it("rejects unauthenticated callers before invoking the assistant", async () => {
    const caller = appRouter.createCaller(context(null));

    await expect(caller.email.adjustTone(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
    expect(mocks.adjustEmailTone).not.toHaveBeenCalled();
  });

  it("rejects free-tier callers before invoking the assistant", async () => {
    const profileLookup = vi.fn().mockResolvedValue({ tier: "free", planExpiresAt: null });
    mocks.getDb.mockResolvedValue({
      query: { businessProfiles: { findFirst: profileLookup } },
    });
    const caller = appRouter.createCaller(context(entitledUser));

    await expect(caller.email.adjustTone(input)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: UNPAID_ERR_MSG,
    });
    expect(mocks.adjustEmailTone).not.toHaveBeenCalled();
  });

  it("runs for an entitled tenant and scopes the rewrite to the authenticated user", async () => {
    const profileLookup = vi.fn().mockResolvedValue({ tier: "pro", planExpiresAt: null });
    mocks.getDb.mockResolvedValue({
      query: { businessProfiles: { findFirst: profileLookup } },
    });
    mocks.adjustEmailTone.mockResolvedValue({
      subject: "A warm request from {{businessName}}",
      body: "Hi {{customerName}}, please share feedback at {{platformLinks}}. Reply unsubscribe to opt out.",
      rationales: [{ field: "subject", rationale: "Uses a friendlier opening." }],
    });
    const caller = appRouter.createCaller(context(entitledUser));

    await expect(caller.email.adjustTone(input)).resolves.toMatchObject({
      subject: "A warm request from {{businessName}}",
      rationales: [{ field: "subject", rationale: "Uses a friendlier opening." }],
    });
    expect(mocks.adjustEmailTone).toHaveBeenCalledWith({
      ...input,
      userId: entitledUser.id,
    });
  });
});
