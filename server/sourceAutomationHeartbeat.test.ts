import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeartbeatJobInfo } from "./_core/heartbeat";
import {
  SOURCE_AUTOMATION_CALLBACK_PATH,
  SOURCE_AUTOMATION_CRON,
  SOURCE_AUTOMATION_HEARTBEAT_NAME,
  reconcileSourceAutomationHeartbeat,
} from "./sourceAutomationHeartbeat";

function heartbeatJob(taskUid = "task_source_automation_1"): HeartbeatJobInfo {
  return {
    taskUid,
    name: SOURCE_AUTOMATION_HEARTBEAT_NAME,
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

describe("source automation Heartbeat reconciliation", () => {
  let deps: ReturnType<typeof createDeps>;

  beforeEach(() => {
    deps = createDeps();
    deps.list.mockResolvedValue({ total: 0, actorUserId: "owner", jobs: [] });
    deps.create.mockResolvedValue({ taskUid: "task_source_automation_1" });
    deps.update.mockResolvedValue({});
    deps.getScheduler.mockResolvedValue(null);
    deps.saveTaskUid.mockResolvedValue(undefined);
  });

  it("skips all external calls when disabled", async () => {
    await expect(
      reconcileSourceAutomationHeartbeat({ enabled: false, deps })
    ).resolves.toEqual({ status: "skipped" });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it("creates the single project-owned five-minute job", async () => {
    await expect(
      reconcileSourceAutomationHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "created" });
    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SOURCE_AUTOMATION_HEARTBEAT_NAME,
        cron: SOURCE_AUTOMATION_CRON,
        path: SOURCE_AUTOMATION_CALLBACK_PATH,
        method: "POST",
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_source_automation_1");
  });

  it("repairs schedule drift on the matching owned job", async () => {
    deps.getScheduler.mockResolvedValue({
      scheduleCronTaskUid: "task_source_automation_1",
    });
    deps.list.mockResolvedValue({
      total: 1,
      actorUserId: "owner",
      jobs: [heartbeatJob()],
    });
    await expect(
      reconcileSourceAutomationHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });
    expect(deps.update).toHaveBeenCalledWith(
      "task_source_automation_1",
      expect.objectContaining({
        cron: SOURCE_AUTOMATION_CRON,
        path: SOURCE_AUTOMATION_CALLBACK_PATH,
        enable: true,
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_source_automation_1");
  });

  it("adopts the job created by a concurrent cold start", async () => {
    deps.list
      .mockResolvedValueOnce({ total: 0, actorUserId: "owner", jobs: [] })
      .mockResolvedValueOnce({
        total: 1,
        actorUserId: "owner",
        jobs: [heartbeatJob("task_raced")],
      });
    deps.create.mockRejectedValue(new Error("duplicate name"));
    await expect(
      reconcileSourceAutomationHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled" });
    expect(deps.update).toHaveBeenCalledWith(
      "task_raced",
      expect.objectContaining({ enable: true }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("task_raced");
  });
});
