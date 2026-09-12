import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getIntegrationHealthSchedulerByTaskUid: vi.fn(),
  claimIntegrationHealthSchedulerRun: vi.fn(),
  recordIntegrationHealthSchedulerRun: vi.fn(),
  getIntegrationHealthSnapshot: vi.fn(),
  recordIntegrationHealthSample: vi.fn(),
  dispatchIntegrationHealthAlerts: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));

vi.mock("./integrationHealthSchedule", () => ({
  getIntegrationHealthSchedulerByTaskUid:
    mocks.getIntegrationHealthSchedulerByTaskUid,
  claimIntegrationHealthSchedulerRun: mocks.claimIntegrationHealthSchedulerRun,
  recordIntegrationHealthSchedulerRun:
    mocks.recordIntegrationHealthSchedulerRun,
}));

vi.mock("./integrationHealth", () => ({
  getIntegrationHealthSnapshot: mocks.getIntegrationHealthSnapshot,
}));

vi.mock("./integrationHealthPersistence", () => ({
  recordIntegrationHealthSample: mocks.recordIntegrationHealthSample,
}));

vi.mock("./integrationHealthAlerts", () => ({
  dispatchIntegrationHealthAlerts: mocks.dispatchIntegrationHealthAlerts,
}));

import { integrationHealthHandler } from "./integrationHealthRoutes";

function buildApp() {
  const app = express();
  app.post("/api/scheduled/integration-health", integrationHealthHandler);
  return app;
}

describe("scheduled integration health callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-cron requests", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });

    const response = await request(buildApp()).post(
      "/api/scheduled/integration-health"
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
  });

  it("skips execution cleanly if the schedule task is orphaned", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-unknown",
    });
    mocks.getIntegrationHealthSchedulerByTaskUid.mockResolvedValue(null);

    const response = await request(buildApp()).post(
      "/api/scheduled/integration-health"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "orphan" });
  });

  it("samples and alerts in an atomic run without leaking details", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-known",
    });
    mocks.getIntegrationHealthSchedulerByTaskUid.mockResolvedValue({
      scheduleKey: "integration_health",
      lastRunAt: 1000,
    });
    mocks.claimIntegrationHealthSchedulerRun.mockResolvedValue(true);
    mocks.getIntegrationHealthSnapshot.mockResolvedValue({
      checkedAt: 5000,
      overallStatus: "healthy",
      durationMs: 40,
    });
    mocks.recordIntegrationHealthSample.mockResolvedValue(true);
    mocks.dispatchIntegrationHealthAlerts.mockResolvedValue({
      considered: 1,
      delivered: 1,
    });
    mocks.recordIntegrationHealthSchedulerRun.mockResolvedValue(undefined);

    const response = await request(buildApp()).post(
      "/api/scheduled/integration-health"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      checkedAt: 5000,
      overallStatus: "healthy",
      sampleStored: true,
      alertsDelivered: 1,
    });
    expect(mocks.recordIntegrationHealthSchedulerRun).toHaveBeenCalledWith({
      taskUid: "task-known",
      status: "ok",
    });
  });
});
