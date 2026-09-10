import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeartbeatJobInfo } from "./_core/heartbeat";
import {
  SOURCE_HEALTH_CALLBACK_PATH,
  SOURCE_HEALTH_HEARTBEAT_NAME,
  reconcileSourceHealthHeartbeat,
} from "./sourceHealthHeartbeat";
import { SOURCE_HEALTH_CRON } from "./sourceConnections";

function heartbeatJob(taskUid = "task_sources_1"): HeartbeatJobInfo {
  return {
    taskUid,
    name: SOURCE_HEALTH_HEARTBEAT_NAME,
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

describe("Sources Heartbeat reconciliation", () => {
  let deps: ReturnType<typeof createDeps>;

  beforeEach(() => {
    deps = createDeps();
    deps.getScheduler.mockResolvedValue(null);
    deps.list.mockResolvedValue({ total: 0, actorUserId: "owner", jobs: [] });
    deps.create.mockResolvedValue({ taskUid: "task_sources_1" });
    deps.update.mockResolvedValue({});
    deps.saveTaskUid.mockResolvedValue(undefined);
  });

  it("does not call the external scheduler when reconciliation is disabled", async () => {
    await expect(
      reconcileSourceHealthHeartbeat({ enabled: false, deps })
    ).resolves.toEqual({ status: "skipped" });
    expect(deps.list).not.toHaveBeenCalled();
    expect(deps.create).not.toHaveBeenCalled();
  });

  it("creates and persists the single project-owner 15-minute job when none exists", async () => {
    await expect(
      reconcileSourceHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "created" });

    expect(deps.list).toHaveBeenCalledWith("", { page: 1, pageSize: 100 });
    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SOURCE_HEALTH_HEARTBEAT_NAME,
        cron: SOURCE_HEALTH_CRON,
        path: SOURCE_HEALTH_CALLBACK_PATH,
        method: "POST",
        payload: {},
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_sources_1");
  });

  it("repairs schedule drift and adopts the matching owned job", async () => {
    deps.getScheduler.mockResolvedValue({
      scheduleCronTaskUid: "task_sources_1",
    });
    deps.list.mockResolvedValue({
      total: 1,
      actorUserId: "owner",
      jobs: [heartbeatJob()],
    });

    await expect(
      reconcileSourceHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });

    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.update).toHaveBeenCalledWith(
      "task_sources_1",
      expect.objectContaining({
        cron: SOURCE_HEALTH_CRON,
        path: SOURCE_HEALTH_CALLBACK_PATH,
        method: "POST",
        enable: true,
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_sources_1");
  });

  it("adopts the job created by a concurrent cold start after a duplicate-create race", async () => {
    deps.list
      .mockResolvedValueOnce({ total: 0, actorUserId: "owner", jobs: [] })
      .mockResolvedValueOnce({
        total: 1,
        actorUserId: "owner",
        jobs: [heartbeatJob("task_raced")],
      });
    deps.create.mockRejectedValue(new Error("duplicate name"));

    await expect(
      reconcileSourceHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });

    expect(deps.update).toHaveBeenCalledWith(
      "task_raced",
      expect.objectContaining({ enable: true }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_raced");
  });
});
