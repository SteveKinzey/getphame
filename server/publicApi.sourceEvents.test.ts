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
  findSavedContactByEmail: vi.fn(),
  fireWebhooks: vi.fn(),
  deliverReviewRequest: vi.fn(),
  validateReviewRequestDelivery: vi.fn(),
  attachContactToSourceAutomationEvent: vi.fn(),
  claimSourceAutomationEvent: vi.fn(),
  completeSourceAutomationEvent: vi.fn(),
  recordConsentEvidence: vi.fn(),
  retryOrFailSourceAutomationEvent: vi.fn(),
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
vi.mock("./contacts", () => ({
  upsertApiContact: mocks.upsertApiContact,
  findSavedContactByEmail: mocks.findSavedContactByEmail,
}));
vi.mock("./webhookHelpers", () => ({ fireWebhooks: mocks.fireWebhooks }));
vi.mock("./reviewRequestDelivery", () => ({
  deliverReviewRequest: mocks.deliverReviewRequest,
  validateReviewRequestDelivery: mocks.validateReviewRequestDelivery,
}));
vi.mock("./sourceAutomation", () => ({
  attachContactToSourceAutomationEvent:
    mocks.attachContactToSourceAutomationEvent,
  claimSourceAutomationEvent: mocks.claimSourceAutomationEvent,
  completeSourceAutomationEvent: mocks.completeSourceAutomationEvent,
  recordConsentEvidence: mocks.recordConsentEvidence,
  retryOrFailSourceAutomationEvent: mocks.retryOrFailSourceAutomationEvent,
}));

import { registerPublicApiRoutes } from "./publicApi";

const principal = {
  userId: 17,
  apiKeyId: 23,
  label: "Zapier orders",
  scopes: ["contacts:write", "review_requests:send"],
  expiresAt: null,
  inactivityExpiresAt: Date.now() + 86_400_000,
};

function sourceConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    publicId: "src_zapier_orders",
    userId: principal.userId,
    apiKeyId: principal.apiKeyId,
    provider: "zapier",
    automationEnabled: true,
    automationMode: "review_request",
    dryRun: false,
    sendDelayMinutes: 0,
    templateId: 3,
    platformId: 2,
    preferredLocale: "en",
    pausedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

function sourceEventPayload() {
  return {
    eventType: "review_request",
    sourceSubmissionId: "order-1001",
    sourceFormId: "checkout-complete",
    name: "Permitted Customer",
    email: "Customer@Example.com",
    preferredLocale: "en",
    sourceApp: "zapier",
    consent: {
      confirmed: true,
      basis: "customer_relationship",
      purpose: "review_outreach",
      channel: "email",
      capturedAt: "2026-08-01T12:00:00.000Z",
      source: "Completed order checkout",
      text: "I agree that this business may email me one review request.",
      version: "checkout-v1",
      privacyPolicyUrl: "https://example.com/privacy",
    },
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  registerPublicApiRoutes(app);
  return app;
}

function postSourceEvent(app = buildApp()) {
  return request(app)
    .post("/api/v1/source-events")
    .set("Authorization", `Bearer gp_live_${"a".repeat(48)}`)
    .set("X-Get-Phame-Source", "src_zapier_orders")
    .send(sourceEventPayload());
}

describe("public source-event review-request automation", () => {
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
      retryAfterSeconds: 0,
    });
    mocks.checkDeveloperApiAbuse.mockResolvedValue({ allowed: true });
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue(
      sourceConnection()
    );
    mocks.hashDeveloperApiRequest.mockReturnValue("request-hash");
    mocks.claimSourceAutomationEvent.mockResolvedValue({
      kind: "claimed",
      eventId: 55,
    });
    mocks.upsertApiContact.mockResolvedValue({
      id: 77,
      created: true,
      optedOut: 0,
    });
    mocks.attachContactToSourceAutomationEvent.mockResolvedValue(undefined);
    mocks.recordConsentEvidence.mockResolvedValue({ id: 88 });
    mocks.completeSourceAutomationEvent.mockResolvedValue(undefined);
    mocks.recordDeveloperApiKeySuccessfulUse.mockResolvedValue(undefined);
    mocks.fireWebhooks.mockResolvedValue(undefined);
    mocks.deliverReviewRequest.mockResolvedValue({
      requestId: 99,
      delivery: "sent",
      scheduledAt: null,
      preferredLocale: "en",
      templateRevisionId: 10,
      englishTemplateRevisionId: 10,
      platformId: 2,
      sendLimitStatus: null,
    });
    mocks.retryOrFailSourceAutomationEvent.mockResolvedValue({
      failed: false,
      scheduledAt: 1_785_665_100_000,
    });
  });

  it("rejects a source identifier that is not bound to the authenticated key", async () => {
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue(null);
    const response = await postSourceEvent();
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("SOURCE_CONNECTION_FORBIDDEN");
    expect(mocks.claimSourceAutomationEvent).not.toHaveBeenCalled();
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
  });

  it("returns the authoritative prior outcome for an idempotent replay", async () => {
    mocks.claimSourceAutomationEvent.mockResolvedValue({
      kind: "replay",
      event: { status: "sent", contactId: 77, customerRequestId: 99 },
    });
    const response = await postSourceEvent();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      idempotentReplay: true,
      status: "sent",
      contactId: 77,
      customerRequestId: 99,
    });
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
    expect(mocks.deliverReviewRequest).not.toHaveBeenCalled();
  });

  it("rejects reuse of a source submission ID with a different payload", async () => {
    mocks.claimSourceAutomationEvent.mockResolvedValue({
      kind: "conflict",
      event: { status: "sent" },
    });
    const response = await postSourceEvent();
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
  });

  it("persists consent and completes a direct delivery with source snapshots", async () => {
    const response = await postSourceEvent();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      status: "sent",
      contactId: 77,
      requestId: expect.any(String),
    });
    expect(mocks.upsertApiContact).toHaveBeenCalledWith(
      principal.userId,
      expect.objectContaining({
        email: "customer@example.com",
        consentPurpose: "review_outreach",
        consentChannel: "email",
        sourceSubmissionId: "order-1001",
      })
    );
    expect(mocks.recordConsentEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConnectionId: 42,
        sourceSubmissionId: "order-1001",
        contactId: 77,
      })
    );
    expect(mocks.deliverReviewRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConnectionId: 42,
        sourceEventId: "order-1001",
        contactId: 77,
        templateId: 3,
        platformId: 2,
      })
    );
    expect(mocks.completeSourceAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        customerRequestId: 99,
      })
    );
  });

  it("honors source dry-run mode without sending", async () => {
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue(
      sourceConnection({ dryRun: true })
    );
    const response = await postSourceEvent();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      status: "dry_run",
      contactId: 77,
    });
    expect(mocks.deliverReviewRequest).not.toHaveBeenCalled();
    expect(mocks.completeSourceAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dry_run" })
    );
  });

  it("schedules a configured delayed send without delivering in the request", async () => {
    mocks.resolveSourceConnectionForPrincipal.mockResolvedValue(
      sourceConnection({ sendDelayMinutes: 15 })
    );
    const response = await postSourceEvent();
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      success: true,
      status: "scheduled",
      contactId: 77,
    });
    expect(response.body.scheduledAt).toEqual(expect.any(Number));
    expect(mocks.deliverReviewRequest).not.toHaveBeenCalled();
    expect(mocks.completeSourceAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "scheduled",
        scheduledAt: expect.any(Number),
      })
    );
  });

  it("moves a recoverable SMTP failure into the bounded retry ledger", async () => {
    mocks.deliverReviewRequest.mockRejectedValue(
      new Error("SMTP not configured. Connect email.")
    );
    const response = await postSourceEvent();
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      success: true,
      status: "scheduled",
      eventId: "order-1001",
      reasonCode: "SMTP_NOT_READY",
      retryAt: expect.any(String),
    });
    expect(mocks.retryOrFailSourceAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: principal.userId,
        eventId: 55,
        attemptCount: 1,
        errorCode: "SMTP_NOT_READY",
      })
    );
  });
});
