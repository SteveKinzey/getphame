import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  listDeveloperApiKeys: vi.fn(),
  findSavedContactByEmail: vi.fn(),
  validateReviewRequestDelivery: vi.fn(),
  getSourceConnectionForUser: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./developerApiKeys", async importOriginal => ({
  ...(await importOriginal<typeof import("./developerApiKeys")>()),
  listDeveloperApiKeys: mocks.listDeveloperApiKeys,
}));

vi.mock("./contacts", async importOriginal => ({
  ...(await importOriginal<typeof import("./contacts")>()),
  findSavedContactByEmail: mocks.findSavedContactByEmail,
}));

vi.mock("./reviewRequestDelivery", async importOriginal => ({
  ...(await importOriginal<typeof import("./reviewRequestDelivery")>()),
  validateReviewRequestDelivery: mocks.validateReviewRequestDelivery,
}));

vi.mock("./sourceConnections", async importOriginal => ({
  ...(await importOriginal<typeof import("./sourceConnections")>()),
  getSourceConnectionForUser: mocks.getSourceConnectionForUser,
}));

import { sourceOperationsRouter } from "./routers/sourceOperations";

const user = {
  id: 701,
  openId: "source-preflight-user",
  email: "owner@example.com",
  name: "Source Owner",
  loginMethod: "email",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(currentUser: TrpcContext["user"]): TrpcContext {
  return {
    user: currentUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function activeAccountDatabase() {
  const accountQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ suspendedUntil: null }]),
  };
  return { select: vi.fn(() => accountQuery) };
}

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: 31,
    publicId: "src_public_31",
    userId: user.id,
    apiKeyId: 44,
    automationEnabled: false,
    automationMode: "review_request",
    dryRun: true,
    dryRunCompletedAt: null,
    sendDelayMinutes: 60,
    templateId: 12,
    platformId: 18,
    preferredLocale: "fr",
    ...overrides,
  };
}

describe("sourceOperations.preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockResolvedValue(activeAccountDatabase());
    mocks.getSourceConnectionForUser.mockResolvedValue(source());
    mocks.listDeveloperApiKeys.mockResolvedValue([
      {
        id: 44,
        status: "active",
        scopes: ["contacts:write", "review_requests:send"],
      },
    ]);
    mocks.findSavedContactByEmail.mockResolvedValue(null);
    mocks.validateReviewRequestDelivery.mockResolvedValue({
      valid: true,
      preferredLocale: "fr",
      templateId: 12,
      templateRevisionId: 120,
      englishTemplateRevisionId: 119,
      platformId: 18,
      platformType: "google",
      platformName: "Main location",
    });
  });

  it("rejects unauthenticated callers before reading source configuration", async () => {
    const caller = sourceOperationsRouter.createCaller(context(null));

    await expect(
      caller.preflight({
        id: 31,
        customerName: "Test Customer",
        customerEmail: "customer@example.com",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getSourceConnectionForUser).not.toHaveBeenCalled();
  });

  it("reports dry-run readiness while withholding customer and credential values", async () => {
    const caller = sourceOperationsRouter.createCaller(context(user));
    const result = await caller.preflight({
      id: 31,
      customerName: "Test Customer",
      customerEmail: "customer@example.com",
    });

    expect(result).toMatchObject({
      configurationReady: true,
      readyForDryRun: true,
      readyForLive: false,
      checks: {
        sourceBinding: "ready",
        sendScope: "ready",
        automationMode: "ready",
        suppression: "ready",
        delivery: "ready",
        dryRun: "required",
      },
      delivery: {
        preferredLocale: "fr",
        templateRevisionId: 120,
        englishTemplateRevisionId: 119,
      },
    });
    expect(mocks.getSourceConnectionForUser).toHaveBeenCalledWith(user.id, 31);
    expect(mocks.validateReviewRequestDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        customerName: "Test Customer",
        customerEmail: "customer@example.com",
        preferredLocale: "fr",
        templateId: 12,
        platformId: 18,
        sourceConnectionId: 31,
      })
    );
    expect(JSON.stringify(result)).not.toContain("customer@example.com");
    expect(JSON.stringify(result)).not.toContain("Authorization");
  });

  it("blocks suppressed contacts even when delivery configuration is otherwise ready", async () => {
    mocks.findSavedContactByEmail.mockResolvedValue({ id: 91, optedOut: true });
    const caller = sourceOperationsRouter.createCaller(context(user));

    await expect(
      caller.preflight({
        id: 31,
        customerName: "Suppressed Customer",
        customerEmail: "suppressed@example.com",
      })
    ).resolves.toMatchObject({
      configurationReady: false,
      readyForDryRun: false,
      readyForLive: false,
      checks: { suppression: "blocked" },
    });
  });

  it("maps sender-readiness failures to stable UI codes without returning raw errors", async () => {
    mocks.validateReviewRequestDelivery.mockRejectedValue(
      new Error(
        "SMTP not configured. Connect your email account in Get Phame Settings."
      )
    );
    const caller = sourceOperationsRouter.createCaller(context(user));
    const result = await caller.preflight({
      id: 31,
      customerName: "Test Customer",
      customerEmail: "customer@example.com",
    });

    expect(result).toMatchObject({
      configurationReady: false,
      deliveryCode: "SMTP_NOT_CONFIGURED",
      delivery: null,
      checks: { delivery: "blocked" },
    });
    expect(JSON.stringify(result)).not.toContain("Connect your email account");
  });

  it("reports live readiness only after durable dry-run completion evidence exists", async () => {
    mocks.getSourceConnectionForUser.mockResolvedValue(
      source({
        dryRun: false,
        dryRunCompletedAt: 1_785_700_000_000,
      })
    );
    const caller = sourceOperationsRouter.createCaller(context(user));

    await expect(
      caller.preflight({
        id: 31,
        customerName: "Test Customer",
        customerEmail: "customer@example.com",
      })
    ).resolves.toMatchObject({
      configurationReady: true,
      readyForDryRun: true,
      readyForLive: true,
      checks: { dryRun: "ready" },
    });
  });
});
