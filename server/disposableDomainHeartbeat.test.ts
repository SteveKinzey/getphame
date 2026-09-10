import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeartbeatJobInfo } from "./_core/heartbeat";
import {
  DISPOSABLE_DOMAIN_CALLBACK_PATH,
  DISPOSABLE_DOMAIN_HEARTBEAT_NAME,
  reconcileDisposableDomainHeartbeat,
} from "./disposableDomainHeartbeat";
import { DISPOSABLE_DOMAIN_CRON } from "./disposableDomains";

function heartbeatJob(taskUid = "task_disposable_domains_1"): HeartbeatJobInfo {
  return {
    taskUid,
    name: DISPOSABLE_DOMAIN_HEARTBEAT_NAME,
    userId: "owner",
    description: "stale",
    cronExpression: "0 0 * * * *",
    callbackPath: "/api/scheduled/stale",
    callbackMethod: "POST",
    callbackPayload: "{}",
    isEnable: false,
  };
}

function createDeps() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getScheduler: vi.fn(),
    saveTaskUid: vi.fn(),
  };
}

describe("disposable-domain Heartbeat reconciliation", () => {
  let deps: ReturnType<typeof createDeps>;

  beforeEach(() => {
    deps = createDeps();
    deps.getScheduler.mockResolvedValue(null);
    deps.list.mockResolvedValue({ total: 0, actorUserId: "owner", jobs: [] });
    deps.create.mockResolvedValue({ taskUid: "task_disposable_domains_1" });
    deps.update.mockResolvedValue({});
    deps.saveTaskUid.mockResolvedValue(undefined);
  });

  it("skips all scheduler calls when reconciliation is disabled", async () => {
    await expect(
      reconcileDisposableDomainHeartbeat({ enabled: false, deps })
    ).resolves.toEqual({ status: "skipped" });
    expect(deps.getScheduler).not.toHaveBeenCalled();
    expect(deps.list).not.toHaveBeenCalled();
    expect(deps.create).not.toHaveBeenCalled();
  });

  it("creates and persists the project-owner nightly job when absent", async () => {
    await expect(
      reconcileDisposableDomainHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "created" });
    expect(deps.list).toHaveBeenCalledWith("", { page: 1, pageSize: 100 });
    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: DISPOSABLE_DOMAIN_HEARTBEAT_NAME,
        cron: DISPOSABLE_DOMAIN_CRON,
        path: DISPOSABLE_DOMAIN_CALLBACK_PATH,
        method: "POST",
        payload: {},
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_disposable_domains_1");
  });

  it("repairs schedule drift and adopts the existing owned job", async () => {
    deps.getScheduler.mockResolvedValue({
      scheduleCronTaskUid: "task_disposable_domains_1",
    });
    deps.list.mockResolvedValue({
      total: 1,
      actorUserId: "owner",
      jobs: [heartbeatJob()],
    });
    await expect(
      reconcileDisposableDomainHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.update).toHaveBeenCalledWith(
      "task_disposable_domains_1",
      expect.objectContaining({
        cron: DISPOSABLE_DOMAIN_CRON,
        path: DISPOSABLE_DOMAIN_CALLBACK_PATH,
        method: "POST",
        enable: true,
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_disposable_domains_1");
  });

  it("adopts a concurrently-created job after a duplicate-create race", async () => {
    deps.list
      .mockResolvedValueOnce({ total: 0, actorUserId: "owner", jobs: [] })
      .mockResolvedValueOnce({
        total: 1,
        actorUserId: "owner",
        jobs: [heartbeatJob("task_raced")],
      });
    deps.create.mockRejectedValue(new Error("duplicate name"));
    await expect(
      reconcileDisposableDomainHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });
    expect(deps.update).toHaveBeenCalledWith(
      "task_raced",
      expect.objectContaining({ enable: true }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_raced");
  });
});
