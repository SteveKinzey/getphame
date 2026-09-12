import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateDeveloperApiKeyWithStatus: vi.fn(),
  developerApiKeyHasScope: vi.fn(),
  recordDeveloperApiKeySuccessfulUse: vi.fn(),
  checkDeveloperApiRateLimit: vi.fn(),
  getDeveloperApiIdempotency: vi.fn(),
  hashDeveloperApiRequest: vi.fn(),
  logDeveloperApiImport: vi.fn(),
  saveDeveloperApiIdempotency: vi.fn(),
  checkDeveloperApiAbuse: vi.fn(),
  resolveSourceConnectionForPrincipal: vi.fn(),
  upsertApiContact: vi.fn(),
  fireWebhooks: vi.fn(),
}));

vi.mock("./developerApiKeys", () => ({
  authenticateDeveloperApiKeyWithStatus:
    mocks.authenticateDeveloperApiKeyWithStatus,
  developerApiKeyHasScope: mocks.developerApiKeyHasScope,
  recordDeveloperApiKeySuccessfulUse: mocks.recordDeveloperApiKeySuccessfulUse,
}));
vi.mock("./developerApiImports", () => ({
  checkDeveloperApiRateLimit: mocks.checkDeveloperApiRateLimit,
  getDeveloperApiIdempotency: mocks.getDeveloperApiIdempotency,
  hashDeveloperApiRequest: mocks.hashDeveloperApiRequest,
  logDeveloperApiImport: mocks.logDeveloperApiImport,
  saveDeveloperApiIdempotency: mocks.saveDeveloperApiIdempotency,
}));
vi.mock("./developerApiAbuse", () => ({
  checkDeveloperApiAbuse: mocks.checkDeveloperApiAbuse,
}));
vi.mock("./sourceConnections", () => ({
  resolveSourceConnectionForPrincipal:
    mocks.resolveSourceConnectionForPrincipal,
}));
vi.mock("./contacts", () => ({ upsertApiContact: mocks.upsertApiContact }));
vi.mock("./webhookHelpers", () => ({ fireWebhooks: mocks.fireWebhooks }));

import { registerPublicApiRoutes } from "./publicApi";

const principal = {
  userId: 17,
  apiKeyId: 23,
  label: "Zapier orders",
  scopes: ["contacts:write"],
  expiresAt: null,
  inactivityExpiresAt: Date.now() + 86_400_000,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  registerPublicApiRoutes(app);
  return app;
}

function permittedPayload() {
  return {
    name: "Permitted Customer",
    email: "customer@example.com",
    externalId: "order-123",
    sourceApp: "zapier",
    consent: {
      confirmed: true,
      basis: "customer_relationship",
      source: "Completed order",
    },
  };
}

describe("public import source attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateDeveloperApiKeyWithStatus.mockResolvedValue({
      kind: "ok",
      principal,
    });
    mocks.developerApiKeyHasScope.mockReturnValue(true);
    mocks.checkDeveloperApiRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
    });
    mocks.getDeveloperApiIdempotency.mockResolvedValue({
      kind: "new",
      keyHash: "idem-hash",
    });
    mocks.hashDeveloperApiRequest.mockReturnValue("request-hash");
    mocks.checkDeveloperApiAbuse.mockResolvedValue({ allowed: true });
    mocks.upsertApiContact.mockResolvedValue({ id: 77, created: true });
    mocks.logDeveloperApiImport.mockResolvedValue(undefined);
    mocks.saveDeveloperApiIdempotency.mockResolvedValue(undefined);
    mocks.recordDeveloperApiKeySuccessfulUse.mockResolvedValue(undefined);
    mocks.fireWebhooks.mockResolvedValue(undefined);
  });

  it("rejects a source identifier that is not owned by the authenticated API key", async () => {
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue(null);

    const response = await request(buildApp())
      .post("/api/v1/contacts")
      .set("Authorization", `Bearer gp_live_${"a".repeat(48)}`)
      .set("X-Get-Phame-Source", "src_foreign")
      .send(permittedPayload());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("SOURCE_CONNECTION_FORBIDDEN");
    expect(mocks.resolveSourceConnectionForPrincipal).toHaveBeenCalledWith({
      publicId: "src_foreign",
      userId: principal.userId,
      apiKeyId: principal.apiKeyId,
    });
    expect(mocks.logDeveloperApiImport).toHaveBeenCalledWith(
      expect.objectContaining({
        principal,
        status: "rejected",
        errorCode: "SOURCE_CONNECTION_FORBIDDEN",
      })
    );
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
  });

  it("attributes a successful import and its idempotency scope to the authorized source", async () => {
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue({
      id: 42,
      publicId: "src_zapier_orders",
      userId: principal.userId,
      apiKeyId: principal.apiKeyId,
      archivedAt: null,
    });

    const response = await request(buildApp())
      .post("/api/v1/contacts")
      .set("Authorization", `Bearer gp_live_${"b".repeat(48)}`)
      .set("X-Get-Phame-Source", "src_zapier_orders")
      .set("Idempotency-Key", "order-123")
      .send(permittedPayload());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      contactId: 77,
      created: true,
      deduplicated: false,
    });
    expect(mocks.getDeveloperApiIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({
        principal,
        idempotencyKey: "order-123",
        requestHash: "request-hash",
      })
    );
    expect(mocks.logDeveloperApiImport).toHaveBeenCalledWith(
      expect.objectContaining({
        principal,
        sourceConnectionId: 42,
        status: "success",
        sourceApp: "zapier",
        contactId: 77,
        created: true,
      })
    );
    expect(mocks.recordDeveloperApiKeySuccessfulUse).toHaveBeenCalledWith(
      principal
    );
  });
});
