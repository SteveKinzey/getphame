import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceConnection } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  notifyOwner: vi.fn(),
  claimSourceHealthSchedulerRun: vi.fn(),
  getDueSourceConnections: vi.fn(),
  getSourceEventWindow: vi.fn(),
  getSourceHealthSchedulerByTaskUid: vi.fn(),
  listPendingSourceHealthAlerts: vi.fn(),
  markSourceHealthAlertDelivered: vi.fn(),
  persistSourceHealthEvaluation: vi.fn(),
  pruneExpiredSourceHealthHistory: vi.fn(),
  recordSourceHealthSchedulerRun: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./sourceConnections", () => ({
  SOURCE_HEALTH_BATCH_SIZE: 100,
  claimSourceHealthSchedulerRun: mocks.claimSourceHealthSchedulerRun,
  getDueSourceConnections: mocks.getDueSourceConnections,
  getSourceEventWindow: mocks.getSourceEventWindow,
  getSourceHealthSchedulerByTaskUid: mocks.getSourceHealthSchedulerByTaskUid,
  listPendingSourceHealthAlerts: mocks.listPendingSourceHealthAlerts,
  markSourceHealthAlertDelivered: mocks.markSourceHealthAlertDelivered,
  persistSourceHealthEvaluation: mocks.persistSourceHealthEvaluation,
  pruneExpiredSourceHealthHistory: mocks.pruneExpiredSourceHealthHistory,
  recordSourceHealthSchedulerRun: mocks.recordSourceHealthSchedulerRun,
}));

import {
  evaluateSourceHealthState,
  sourceHealthHandler,
} from "./sourceHealthRoutes";

const MINUTE_MS = 60_000;

function sourceConnection(overrides: Partial<SourceConnection> = {}) {
  return {
    id: 12,
    publicId: "src_safe_identifier",
    userId: 7,
    apiKeyId: 3,
    provider: "zapier",
    label: "Completed orders",
    expectedIntervalMinutes: 60,
    monitoringEnabled: true,
    status: "setup",
    lastEventAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCode: null,
    lastEvaluatedAt: null,
    nextEvaluationAt: 0,
    consecutiveFailures: 0,
    failureAlertOpen: false,
    lastFailureAlertAt: null,
    lastRecoveryAlertAt: null,
    archivedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as SourceConnection;
}

function emptyWindow() {
  return {
    attempts: 0,
    failures: 0,
    lastEventAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorCode: null,
  };
}

function buildApp() {
  const app = express();
  app.post("/internal/source-health", sourceHealthHandler);
  return app;
}

describe("source connection health evaluation", () => {
  it("keeps a newly created connection in setup while awaiting its first import", () => {
    const checkedAt = 30 * MINUTE_MS;
    const result = evaluateSourceHealthState(sourceConnection(), emptyWindow(), checkedAt);

    expect(result).toMatchObject({
      status: "setup",
      reasonCode: "awaiting_first_import",
      consecutiveFailures: 0,
      failureAlertOpen: false,
      openedFailureIncident: false,
    });
    expect(result.nextEvaluationAt).toBe(checkedAt + 15 * MINUTE_MS);
  });

  it("opens one incident only after the second consecutive overdue evaluation", () => {
    const result = evaluateSourceHealthState(
      sourceConnection({ consecutiveFailures: 1, createdAt: 0 }),
      emptyWindow(),
      3 * 60 * MINUTE_MS,
    );

    expect(result).toMatchObject({
      status: "delayed",
      reasonCode: "no_imports_observed",
      consecutiveFailures: 2,
      failureAlertOpen: true,
      openedFailureIncident: true,
      recoveredIncident: false,
    });
  });

  it("classifies a newer failed import as failing with a bounded reason code", () => {
    const checkedAt = 10 * 60 * MINUTE_MS;
    const result = evaluateSourceHealthState(sourceConnection(), {
      attempts: 4,
      failures: 1,
      lastEventAt: checkedAt - MINUTE_MS,
      lastSuccessAt: checkedAt - 3 * MINUTE_MS,
      lastFailureAt: checkedAt - MINUTE_MS,
      lastErrorCode: "CONSENT_REQUIRED",
    }, checkedAt);

    expect(result).toMatchObject({
      status: "failing",
      reasonCode: "error_consent_required",
      consecutiveFailures: 1,
    });
  });

  it("closes an open incident when imports recover", () => {
    const checkedAt = 10 * 60 * MINUTE_MS;
    const result = evaluateSourceHealthState(sourceConnection({
      failureAlertOpen: true,
      consecutiveFailures: 3,
    }), {
      attempts: 2,
      failures: 1,
      lastEventAt: checkedAt - MINUTE_MS,
      lastSuccessAt: checkedAt - MINUTE_MS,
      lastFailureAt: checkedAt - 2 * MINUTE_MS,
      lastErrorCode: "RATE_LIMITED",
    }, checkedAt);

    expect(result).toMatchObject({
      status: "healthy",
      reasonCode: "recovered_after_error",
      consecutiveFailures: 0,
      failureAlertOpen: false,
      openedFailureIncident: false,
      recoveredIncident: true,
    });
  });
});

describe("scheduled source health callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.getSourceHealthSchedulerByTaskUid.mockResolvedValue({ lastRunAt: null });
    mocks.claimSourceHealthSchedulerRun.mockResolvedValue(true);
    mocks.getDueSourceConnections.mockResolvedValue([]);
    mocks.listPendingSourceHealthAlerts.mockResolvedValue([]);
    mocks.pruneExpiredSourceHealthHistory.mockResolvedValue(undefined);
    mocks.recordSourceHealthSchedulerRun.mockResolvedValue(undefined);
  });

  it("rejects non-cron sessions", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: null });
    const response = await request(buildApp()).post("/internal/source-health");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.claimSourceHealthSchedulerRun).not.toHaveBeenCalled();
  });

  it("stops retries for an orphaned task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "unknown-task" });
    mocks.getSourceHealthSchedulerByTaskUid.mockResolvedValue(null);
    const response = await request(buildApp()).post("/internal/source-health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "orphan" });
    expect(mocks.getDueSourceConnections).not.toHaveBeenCalled();
  });

  it("uses an atomic persisted claim to deduplicate platform retries", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "source-task-1" });
    mocks.getSourceHealthSchedulerByTaskUid.mockResolvedValue({ lastRunAt: 1234 });
    mocks.claimSourceHealthSchedulerRun.mockResolvedValue(false);
    const response = await request(buildApp()).post("/internal/source-health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "recent-run-exists", checkedAt: 1234 });
    expect(mocks.claimSourceHealthSchedulerRun).toHaveBeenCalledWith("source-task-1", 5 * MINUTE_MS);
    expect(mocks.getDueSourceConnections).not.toHaveBeenCalled();
  });

  it("records a successful bounded scheduled run", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "source-task-2" });
    const response = await request(buildApp()).post("/internal/source-health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      checked: 0,
      healthy: 0,
      setup: 0,
      delayed: 0,
      failing: 0,
      alertsDelivered: 0,
      hasMore: false,
    });
    expect(mocks.recordSourceHealthSchedulerRun).toHaveBeenCalledWith({
      taskUid: "source-task-2",
      status: "ok",
    });
  });

  it("returns and persists only a generic failure code", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "source-task-secret" });
    mocks.getDueSourceConnections.mockRejectedValue(new Error("credential secret@example.com"));
    const response = await request(buildApp()).post("/internal/source-health");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("SOURCE_HEALTH_RUN_FAILED");
    expect(JSON.stringify(response.body)).not.toMatch(/secret@example|source-task-secret|\/internal\/source-health/i);
    expect(mocks.recordSourceHealthSchedulerRun).toHaveBeenCalledWith({
      taskUid: "source-task-secret",
      status: "failed",
      errorCode: "SOURCE_HEALTH_RUN_FAILED",
    });
  });
});
