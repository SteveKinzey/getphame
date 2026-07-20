import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  createSmtpHealthSnapshot: vi.fn(),
  getRecentSmtpSnapshotForTask: vi.fn(),
  runSmtpHealthChecks: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./smtp", () => ({ runSmtpHealthChecks: mocks.runSmtpHealthChecks }));
vi.mock("./systemHealth", () => ({
  createSmtpHealthSnapshot: mocks.createSmtpHealthSnapshot,
  getRecentSmtpSnapshotForTask: mocks.getRecentSmtpSnapshotForTask,
}));

import { smtpHealthHandler } from "./smtpHealthRoutes";

function buildApp() {
  const app = express();
  app.post("/internal/smtp-health", smtpHealthHandler);
  return app;
}

describe("scheduled SMTP fleet health callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRecentSmtpSnapshotForTask.mockResolvedValue(null);
    mocks.createSmtpHealthSnapshot.mockResolvedValue(undefined);
  });

  it("rejects normal user sessions", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: null });
    const response = await request(buildApp()).post("/internal/smtp-health");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.runSmtpHealthChecks).not.toHaveBeenCalled();
  });

  it("deduplicates platform retries for the same task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "smtp-task-1" });
    mocks.getRecentSmtpSnapshotForTask.mockResolvedValue({
      totalAccounts: 4,
      healthyAccounts: 3,
      failedAccounts: 1,
      checkedAt: 1234,
    });
    const response = await request(buildApp()).post("/internal/smtp-health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      skipped: "recent-check-exists",
      totalAccounts: 4,
      failedAccounts: 1,
    });
    expect(mocks.runSmtpHealthChecks).not.toHaveBeenCalled();
    expect(mocks.createSmtpHealthSnapshot).not.toHaveBeenCalled();
  });

  it("persists only privacy-safe fleet aggregates", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "smtp-task-2" });
    mocks.runSmtpHealthChecks.mockResolvedValue({
      totalAccounts: 8,
      healthyAccounts: 8,
      failedAccounts: 0,
      durationMs: 320,
      checkedAt: 5678,
    });
    const response = await request(buildApp()).post("/internal/smtp-health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, totalAccounts: 8, healthyAccounts: 8 });
    expect(mocks.createSmtpHealthSnapshot).toHaveBeenCalledWith({
      triggerSource: "scheduled",
      scheduleCronTaskUid: "smtp-task-2",
      totalAccounts: 8,
      healthyAccounts: 8,
      failedAccounts: 0,
      durationMs: 320,
      checkedAt: 5678,
    });
  });

  it("returns a generic error without leaking provider credentials or diagnostics", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "smtp-task-3" });
    mocks.runSmtpHealthChecks.mockRejectedValue(new Error("smtp password secret-value"));
    const response = await request(buildApp()).post("/internal/smtp-health");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("SMTP health check failed");
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
  });
});
