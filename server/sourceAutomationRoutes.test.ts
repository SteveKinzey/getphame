import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  claimDueSourceAutomationEvent: vi.fn(),
  claimSourceAutomationSchedulerRun: vi.fn(),
  completeSourceAutomationEvent: vi.fn(),
  getSourceAutomationSchedulerByTaskUid: vi.fn(),
  getSourceAutomationDeliveryContext: vi.fn(),
  recordSourceAutomationSchedulerRun: vi.fn(),
  retryOrFailSourceAutomationEvent: vi.fn(),
  deliverReviewRequest: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./sourceAutomation", () => ({
  claimDueSourceAutomationEvent: mocks.claimDueSourceAutomationEvent,
  claimSourceAutomationSchedulerRun: mocks.claimSourceAutomationSchedulerRun,
  completeSourceAutomationEvent: mocks.completeSourceAutomationEvent,
  getSourceAutomationSchedulerByTaskUid:
    mocks.getSourceAutomationSchedulerByTaskUid,
  getSourceAutomationDeliveryContext: mocks.getSourceAutomationDeliveryContext,
  recordSourceAutomationSchedulerRun: mocks.recordSourceAutomationSchedulerRun,
  retryOrFailSourceAutomationEvent: mocks.retryOrFailSourceAutomationEvent,
}));
vi.mock("./reviewRequestDelivery", () => ({
  deliverReviewRequest: mocks.deliverReviewRequest,
}));

import { sourceAutomationHeartbeatHandler } from "./sourceAutomationProcessor";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/scheduled/source-automation",
    sourceAutomationHeartbeatHandler
  );
  return app;
}

describe("source automation scheduled callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task_source_automation_1",
    });
    mocks.getSourceAutomationSchedulerByTaskUid.mockResolvedValue({
      scheduleCronTaskUid: "task_source_automation_1",
      lastRunAt: 1234,
    });
    mocks.claimSourceAutomationSchedulerRun.mockResolvedValue(true);
    mocks.claimDueSourceAutomationEvent.mockResolvedValue(null);
    mocks.recordSourceAutomationSchedulerRun.mockResolvedValue(undefined);
  });

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = await request(buildApp())
      .post("/api/scheduled/source-automation")
      .send({});
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.getSourceAutomationSchedulerByTaskUid).not.toHaveBeenCalled();
  });

  it("treats an unknown task UID as an orphan without doing work", async () => {
    mocks.getSourceAutomationSchedulerByTaskUid.mockResolvedValue(null);
    const response = await request(buildApp())
      .post("/api/scheduled/source-automation")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "orphan" });
    expect(mocks.claimSourceAutomationSchedulerRun).not.toHaveBeenCalled();
    expect(mocks.claimDueSourceAutomationEvent).not.toHaveBeenCalled();
  });

  it("deduplicates overlapping scheduled runs with the persisted atomic claim", async () => {
    mocks.claimSourceAutomationSchedulerRun.mockResolvedValue(false);
    const response = await request(buildApp())
      .post("/api/scheduled/source-automation")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      skipped: "recent-run-exists",
      checkedAt: 1234,
    });
    expect(mocks.claimDueSourceAutomationEvent).not.toHaveBeenCalled();
  });

  it("records a successful bounded run", async () => {
    const response = await request(buildApp())
      .post("/api/scheduled/source-automation")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      summary: {
        checked: 0,
        sent: 0,
        queued: 0,
        suppressed: 0,
        dryRun: 0,
        retried: 0,
        failed: 0,
      },
    });
    expect(mocks.recordSourceAutomationSchedulerRun).toHaveBeenCalledWith({
      taskUid: "task_source_automation_1",
      status: "ok",
    });
  });

  it("returns a generic 500 and persists only a stable error code", async () => {
    mocks.claimDueSourceAutomationEvent.mockRejectedValue(
      new Error("private-api-key-should-never-leak")
    );
    const response = await request(buildApp())
      .post("/api/scheduled/source-automation")
      .send({});
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("SOURCE_AUTOMATION_PROCESSING_FAILED");
    expect(JSON.stringify(response.body)).not.toContain(
      "private-api-key-should-never-leak"
    );
    expect(mocks.recordSourceAutomationSchedulerRun).toHaveBeenCalledWith({
      taskUid: "task_source_automation_1",
      status: "failed",
      errorCode: "SOURCE_AUTOMATION_PROCESSING_FAILED",
    });
  });
});
