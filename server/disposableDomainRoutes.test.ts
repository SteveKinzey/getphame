import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  claimDisposableDomainSchedulerRun: vi.fn(),
  getDisposableDomainSchedulerByTaskUid: vi.fn(),
  getPacificScheduleDecision: vi.fn(),
  recordDisposableDomainSchedulerRun: vi.fn(),
  syncDisposableEmailDomains: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./disposableDomains", () => ({
  claimDisposableDomainSchedulerRun: mocks.claimDisposableDomainSchedulerRun,
  getDisposableDomainSchedulerByTaskUid: mocks.getDisposableDomainSchedulerByTaskUid,
  getPacificScheduleDecision: mocks.getPacificScheduleDecision,
  recordDisposableDomainSchedulerRun: mocks.recordDisposableDomainSchedulerRun,
  syncDisposableEmailDomains: mocks.syncDisposableEmailDomains,
}));

import { disposableDomainHandler } from "./disposableDomainRoutes";

const NORMAL_SCHEDULE = { dateKey: "2026-07-01", localHour: 2, isSpringForwardMakeup: false, shouldRun: true };

function buildApp() {
  const app = express();
  app.post("/api/scheduled/disposable-domains", disposableDomainHandler);
  return app;
}

describe("scheduled disposable-domain callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDisposableDomainSchedulerByTaskUid.mockResolvedValue({ scheduleCronTaskUid: "disposable-task-1" });
    mocks.getPacificScheduleDecision.mockReturnValue(NORMAL_SCHEDULE);
    mocks.claimDisposableDomainSchedulerRun.mockResolvedValue(true);
    mocks.syncDisposableEmailDomains.mockResolvedValue({ processed: 3, deactivated: 0 });
    mocks.recordDisposableDomainSchedulerRun.mockResolvedValue(undefined);
  });

  it("rejects non-cron sessions", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false, taskUid: null });
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.getDisposableDomainSchedulerByTaskUid).not.toHaveBeenCalled();
    expect(mocks.claimDisposableDomainSchedulerRun).not.toHaveBeenCalled();
  });

  it("stops retries for an orphaned scheduled task identity", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "unknown-task" });
    mocks.getDisposableDomainSchedulerByTaskUid.mockResolvedValue(null);
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "orphan" });
    expect(mocks.claimDisposableDomainSchedulerRun).not.toHaveBeenCalled();
    expect(mocks.syncDisposableEmailDomains).not.toHaveBeenCalled();
  });

  it("skips ordinary executions outside the Pacific 2 AM window", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "disposable-task-1" });
    mocks.getPacificScheduleDecision.mockReturnValue({ ...NORMAL_SCHEDULE, localHour: 3, shouldRun: false });
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "outside-pacific-2am-window", localHour: 3 });
    expect(mocks.claimDisposableDomainSchedulerRun).not.toHaveBeenCalled();
    expect(mocks.syncDisposableEmailDomains).not.toHaveBeenCalled();
  });

  it("uses the persisted claim to deduplicate platform retries", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "disposable-task-1" });
    mocks.claimDisposableDomainSchedulerRun.mockResolvedValue(false);
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "recent-run-exists" });
    expect(mocks.claimDisposableDomainSchedulerRun).toHaveBeenCalledWith("disposable-task-1");
    expect(mocks.syncDisposableEmailDomains).not.toHaveBeenCalled();
  });

  it("records a successful scheduled catalog synchronization", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "disposable-task-1" });
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, dateKey: "2026-07-01", processed: 3, deactivated: 0 });
    expect(mocks.recordDisposableDomainSchedulerRun).toHaveBeenCalledWith({
      taskUid: "disposable-task-1",
      status: "ok",
      dateKey: "2026-07-01",
      summary: { processed: 3, deactivated: 0 },
    });
  });

  it("records a generic failure without exposing upstream details", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "disposable-task-1" });
    mocks.syncDisposableEmailDomains.mockRejectedValue(new Error("upstream credential secret@example.test"));
    const response = await request(buildApp()).post("/api/scheduled/disposable-domains");
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("DISPOSABLE_DOMAIN_SYNC_FAILED");
    expect(JSON.stringify(response.body)).not.toContain("secret@example.test");
    expect(mocks.recordDisposableDomainSchedulerRun).toHaveBeenCalledWith({
      taskUid: "disposable-task-1",
      status: "failed",
      errorCode: "DISPOSABLE_DOMAIN_SYNC_FAILED",
    });
  });
});
