import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeartbeatJobInfo } from "./_core/heartbeat";
import {
  STRIPE_LIFECYCLE_CALLBACK_PATH,
  STRIPE_LIFECYCLE_CRON,
  STRIPE_LIFECYCLE_HEARTBEAT_NAME,
  reconcileStripeLifecycleHeartbeat,
} from "./stripeLifecycleHeartbeat";

function heartbeatJob(taskUid = "task_stripe_1"): HeartbeatJobInfo {
  return {
    taskUid,
    name: STRIPE_LIFECYCLE_HEARTBEAT_NAME,
    userId: "owner",
    description: "stale",
    cronExpression: "0 0 * * * *",
    callbackPath: "/api/scheduled/stale",
    callbackMethod: "POST",
    callbackPayload: "{}",
    isEnable: false,
  };
}

function deps() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getScheduler: vi.fn(),
    saveTaskUid: vi.fn(),
  };
}

describe("Stripe lifecycle Heartbeat reconciliation", () => {
  let mock: ReturnType<typeof deps>;

  beforeEach(() => {
    mock = deps();
    mock.list.mockResolvedValue({ total: 0, actorUserId: "owner", jobs: [] });
    mock.create.mockResolvedValue({ taskUid: "task_stripe_1" });
    mock.update.mockResolvedValue({});
    mock.getScheduler.mockResolvedValue(null);
    mock.saveTaskUid.mockResolvedValue(undefined);
  });

  it("makes no external call while production reconciliation is disabled", async () => {
    await expect(
      reconcileStripeLifecycleHeartbeat({ enabled: false, deps: mock })
    ).resolves.toEqual({ status: "skipped" });
    expect(mock.list).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });

  it("describes one named five-minute job when explicitly enabled", async () => {
    await expect(
      reconcileStripeLifecycleHeartbeat({ enabled: true, deps: mock })
    ).resolves.toEqual({ status: "created" });
    expect(mock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: STRIPE_LIFECYCLE_HEARTBEAT_NAME,
        cron: STRIPE_LIFECYCLE_CRON,
        path: STRIPE_LIFECYCLE_CALLBACK_PATH,
        method: "POST",
      }),
      ""
    );
    expect(mock.saveTaskUid).toHaveBeenCalledWith("task_stripe_1");
  });

  it("adopts and repairs only the matching owned job", async () => {
    mock.getScheduler.mockResolvedValue({
      scheduleCronTaskUid: "task_stripe_1",
    });
    mock.list.mockResolvedValue({
      total: 2,
      actorUserId: "owner",
      jobs: [
        heartbeatJob(),
        { ...heartbeatJob("task_other"), name: "other-job" },
      ],
    });
    await expect(
      reconcileStripeLifecycleHeartbeat({ enabled: true, deps: mock })
    ).resolves.toEqual({ status: "reconciled" });
    expect(mock.update).toHaveBeenCalledTimes(1);
    expect(mock.update).toHaveBeenCalledWith(
      "task_stripe_1",
      expect.objectContaining({
        cron: STRIPE_LIFECYCLE_CRON,
        path: STRIPE_LIFECYCLE_CALLBACK_PATH,
        enable: true,
      }),
      ""
    );
  });
});
