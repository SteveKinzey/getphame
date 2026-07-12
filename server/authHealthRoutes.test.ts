import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getRecentAuthHealthCheckByTaskUid: vi.fn(),
  runAuthHealthCheck: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({ getRecentAuthHealthCheckByTaskUid: mocks.getRecentAuthHealthCheckByTaskUid }));
vi.mock("./authOperations", () => ({
  redactAuthDiagnosticDetail: (error: unknown) => String(error).replace(/secret/gi, "[redacted]"),
  runAuthHealthCheck: mocks.runAuthHealthCheck,
}));

import { authHealthHandler } from "./authHealthRoutes";

function buildApp() {
  const app = express();
  app.post("/internal/auth-health", authHealthHandler);
  return app;
}

describe("scheduled authentication health callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects normal user sessions", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: null });
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.runAuthHealthCheck).not.toHaveBeenCalled();
  });

  it("deduplicates platform retries for the same task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    mocks.getRecentAuthHealthCheckByTaskUid.mockResolvedValue({ overallStatus: "ok", checkedAt: 1234 });
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, skipped: "recent-check-exists", checkedAt: 1234 });
    expect(mocks.runAuthHealthCheck).not.toHaveBeenCalled();
  });

  it("runs the scheduled check with the authenticated cron task UID", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-2" });
    mocks.getRecentAuthHealthCheckByTaskUid.mockResolvedValue(null);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "ok",
      checkedAt: 5678,
      durationMs: 42,
      failureCode: null,
    });
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, status: "ok", checkedAt: 5678, durationMs: 42 });
    expect(mocks.runAuthHealthCheck).toHaveBeenCalledWith({
      triggerSource: "scheduled",
      scheduleCronTaskUid: "task-2",
    });
  });
});
