import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  listAuthHealthChecksByTaskUid: vi.fn(),
  notifyOwner: vi.fn(),
  runAuthHealthCheck: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("./db", () => ({
  listAuthHealthChecksByTaskUid: mocks.listAuthHealthChecksByTaskUid,
}));
vi.mock("./authOperations", () => ({
  redactAuthDiagnosticDetail: (error: unknown) =>
    String(error).replace(/secret/gi, "[redacted]"),
  runAuthHealthCheck: mocks.runAuthHealthCheck,
}));

import { authHealthHandler } from "./authHealthRoutes";

function buildApp() {
  const app = express();
  app.post("/internal/auth-health", authHealthHandler);
  return app;
}

describe("scheduled authentication health callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyOwner.mockResolvedValue(true);
  });

  it("rejects normal user sessions", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: false,
      taskUid: null,
    });
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.runAuthHealthCheck).not.toHaveBeenCalled();
  });

  it("deduplicates platform retries for the same task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-1",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([
      { overallStatus: "ok", checkedAt: Date.now() },
    ]);
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      skipped: "recent-check-exists",
      status: "ok",
    });
    expect(mocks.runAuthHealthCheck).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("runs the scheduled check with the authenticated cron task UID", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-2",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([]);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "ok",
      configStatus: "ok",
      databaseStatus: "ok",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "ok",
      checkedAt: 5678,
      durationMs: 42,
      failureCode: null,
    });
    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      status: "ok",
      checkedAt: 5678,
      durationMs: 42,
    });
    expect(mocks.runAuthHealthCheck).toHaveBeenCalledWith({
      triggerSource: "scheduled",
      scheduleCronTaskUid: "task-2",
    });
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("sends one privacy-safe alert on the first failed scheduled run", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-fail",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([
      { overallStatus: "ok", checkedAt: 1 },
    ]);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "fail",
      configStatus: "ok",
      databaseStatus: "fail",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "fail",
      checkedAt: 10_000,
      durationMs: 37,
      failureCode: "database_unavailable",
    });

    const response = await request(buildApp()).post("/internal/auth-health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      status: "fail",
      alert: "failure",
    });
    expect(mocks.notifyOwner).toHaveBeenCalledOnce();
    const notification = mocks.notifyOwner.mock.calls[0][0];
    expect(notification.title).toContain("health alert");
    expect(notification.content).toContain("Database, Email provider");
    expect(notification.content).toContain("database_unavailable");
    expect(notification.content).not.toMatch(/@|token|secret/i);
  });

  it("suppresses alerts while the same failure remains open", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-open-failure",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([
      { overallStatus: "fail", checkedAt: 1 },
    ]);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "fail",
      configStatus: "ok",
      databaseStatus: "fail",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "ok",
      checkedAt: 10_000,
      durationMs: 15,
      failureCode: "database_unavailable",
    });

    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body.alert).toBeNull();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("sends one recovery alert when a failed service returns to health", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-recovery",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([
      { overallStatus: "fail", checkedAt: 1 },
    ]);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "ok",
      configStatus: "ok",
      databaseStatus: "ok",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "ok",
      checkedAt: 10_000,
      durationMs: 12,
      failureCode: null,
    });

    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(200);
    expect(response.body.alert).toBe("recovery");
    expect(mocks.notifyOwner).toHaveBeenCalledOnce();
    expect(mocks.notifyOwner.mock.calls[0][0].title).toContain("recovered");
  });

  it("returns 500 when a required transition alert cannot be delivered so Heartbeat retries", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task-retry-alert",
    });
    mocks.listAuthHealthChecksByTaskUid.mockResolvedValue([
      { overallStatus: "ok", checkedAt: 1 },
    ]);
    mocks.runAuthHealthCheck.mockResolvedValue({
      overallStatus: "fail",
      configStatus: "fail",
      databaseStatus: "ok",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "ok",
      checkedAt: 10_000,
      durationMs: 9,
      failureCode: "configuration_invalid",
    });
    mocks.notifyOwner.mockResolvedValue(false);

    const response = await request(buildApp()).post("/internal/auth-health");
    expect(response.status).toBe(500);
    expect(response.body.error).toContain("alert delivery failed");
  });
});
