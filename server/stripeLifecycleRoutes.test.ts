import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  assertSystemMailConfigured: vi.fn(),
  claimDueLifecycleEmail: vi.fn(),
  claimStripeLifecycleSchedulerRun: vi.fn(),
  finishLifecycleEmail: vi.fn(),
  getLifecycleEmailContext: vi.fn(),
  getStripeLifecycleSchedulerByTaskUid: vi.fn(),
  recordStripeLifecycleSchedulerRun: vi.fn(),
  sendSystemEmailOnce: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./sendgrid", () => ({
  assertSystemMailConfigured: mocks.assertSystemMailConfigured,
  sendSystemEmailOnce: mocks.sendSystemEmailOnce,
}));
vi.mock("./stripeLifecycle", () => ({
  claimDueLifecycleEmail: mocks.claimDueLifecycleEmail,
  claimStripeLifecycleSchedulerRun: mocks.claimStripeLifecycleSchedulerRun,
  finishLifecycleEmail: mocks.finishLifecycleEmail,
  getLifecycleEmailContext: mocks.getLifecycleEmailContext,
  getStripeLifecycleSchedulerByTaskUid:
    mocks.getStripeLifecycleSchedulerByTaskUid,
  recordStripeLifecycleSchedulerRun: mocks.recordStripeLifecycleSchedulerRun,
}));

import { stripeLifecycleHeartbeatHandler } from "./stripeLifecycleProcessor";

function app() {
  const instance = express();
  instance.use(express.json());
  instance.post(
    "/api/scheduled/stripe-lifecycle",
    stripeLifecycleHeartbeatHandler
  );
  return instance;
}

describe("Stripe lifecycle scheduled callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({
      isCron: true,
      taskUid: "task_stripe_1",
    });
    mocks.getStripeLifecycleSchedulerByTaskUid.mockResolvedValue({
      scheduleCronTaskUid: "task_stripe_1",
      lastRunAt: 1234,
    });
    mocks.claimStripeLifecycleSchedulerRun.mockResolvedValue(true);
    mocks.assertSystemMailConfigured.mockReturnValue("sendgrid");
    mocks.claimDueLifecycleEmail.mockResolvedValue(null);
    mocks.recordStripeLifecycleSchedulerRun.mockResolvedValue(undefined);
  });

  it("rejects non-cron callers", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = await request(app())
      .post("/api/scheduled/stripe-lifecycle")
      .send({});
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.getStripeLifecycleSchedulerByTaskUid).not.toHaveBeenCalled();
  });

  it("returns a safe no-op for an unknown task UID", async () => {
    mocks.getStripeLifecycleSchedulerByTaskUid.mockResolvedValue(null);
    const response = await request(app())
      .post("/api/scheduled/stripe-lifecycle")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "orphan" });
    expect(mocks.claimStripeLifecycleSchedulerRun).not.toHaveBeenCalled();
  });

  it("deduplicates overlapping scheduler callbacks", async () => {
    mocks.claimStripeLifecycleSchedulerRun.mockResolvedValue(false);
    const response = await request(app())
      .post("/api/scheduled/stripe-lifecycle")
      .send({});
    expect(response.body).toEqual({
      ok: true,
      skipped: "recent-run-exists",
      checkedAt: 1234,
    });
    expect(mocks.claimDueLifecycleEmail).not.toHaveBeenCalled();
  });

  it("records successful bounded processing", async () => {
    const response = await request(app())
      .post("/api/scheduled/stripe-lifecycle")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      summary: { checked: 0, sent: 0, failed: 0 },
    });
    expect(mocks.recordStripeLifecycleSchedulerRun).toHaveBeenCalledWith({
      taskUid: "task_stripe_1",
      status: "ok",
    });
  });
});
