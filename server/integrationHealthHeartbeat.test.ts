import { describe, expect, it, vi } from "vitest";
import {
  INTEGRATION_HEALTH_CALLBACK_PATH,
  INTEGRATION_HEALTH_HEARTBEAT_NAME,
  reconcileIntegrationHealthHeartbeat,
} from "./integrationHealthHeartbeat";
import { INTEGRATION_HEALTH_CRON } from "./integrationHealthSchedule";

describe("integration health heartbeat reconciliation", () => {
  it("skips reconciliation when disabled", async () => {
    const deps = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      persist: vi.fn(),
    } as any;

    await expect(
      reconcileIntegrationHealthHeartbeat({ enabled: false, deps })
    ).resolves.toEqual({ status: "skipped" });

    expect(deps.list).not.toHaveBeenCalled();
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.persist).not.toHaveBeenCalled();
  });

  it("creates and persists the five-minute heartbeat when no job exists", async () => {
    const deps = {
      list: vi.fn().mockResolvedValue({ jobs: [] }),
      create: vi.fn().mockResolvedValue({ taskUid: "integration-cron-1" }),
      update: vi.fn(),
      getScheduler: vi.fn().mockResolvedValue(null),
      saveTaskUid: vi.fn().mockResolvedValue(undefined),
    } as any;

    await expect(
      reconcileIntegrationHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "created", taskUid: "integration-cron-1" });

    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: INTEGRATION_HEALTH_HEARTBEAT_NAME,
        cron: INTEGRATION_HEALTH_CRON,
        path: INTEGRATION_HEALTH_CALLBACK_PATH,
        method: "POST",
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("integration-cron-1");
  });

  it("repairs and re-persists an existing named heartbeat without creating duplicates", async () => {
    const deps = {
      list: vi.fn().mockResolvedValue({
        jobs: [
          {
            taskUid: "integration-cron-2",
            name: INTEGRATION_HEALTH_HEARTBEAT_NAME,
          },
        ],
      }),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      getScheduler: vi
        .fn()
        .mockResolvedValue({ scheduleCronTaskUid: "integration-cron-old" }),
      saveTaskUid: vi.fn().mockResolvedValue(undefined),
    } as any;

    await expect(
      reconcileIntegrationHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled", taskUid: "integration-cron-2" });

    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.update).toHaveBeenCalledWith(
      "integration-cron-2",
      expect.objectContaining({
        cron: INTEGRATION_HEALTH_CRON,
        path: INTEGRATION_HEALTH_CALLBACK_PATH,
        enable: true,
      }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("integration-cron-2");
  });

  it("adopts an existing heartbeat if create races against an identical concurrent task", async () => {
    const deps = {
      list: vi
        .fn()
        .mockResolvedValueOnce({ jobs: [] })
        .mockResolvedValueOnce({
          jobs: [
            {
              taskUid: "integration-cron-adopted",
              name: INTEGRATION_HEALTH_HEARTBEAT_NAME,
            },
          ],
        }),
      create: vi.fn().mockRejectedValue(new Error("Job name already exists")),
      update: vi.fn().mockResolvedValue({}),
      getScheduler: vi.fn().mockResolvedValue(null),
      saveTaskUid: vi.fn().mockResolvedValue(undefined),
    } as any;

    await expect(
      reconcileIntegrationHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({
      status: "reconciled",
      taskUid: "integration-cron-adopted",
    });

    expect(deps.update).toHaveBeenCalledWith(
      "integration-cron-adopted",
      expect.objectContaining({ enable: true }),
      ""
    );
    expect(deps.saveTaskUid).toHaveBeenCalledWith("integration-cron-adopted");
  });
});
