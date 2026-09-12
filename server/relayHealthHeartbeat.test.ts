import { describe, expect, it, vi } from "vitest";
import {
  RELAY_HEALTH_CALLBACK_PATH,
  RELAY_HEALTH_CRON,
  RELAY_HEALTH_HEARTBEAT_NAME,
  reconcileRelayHealthHeartbeat,
} from "./relayHealthHeartbeat";

describe("relay health heartbeat reconciliation", () => {
  it("skips reconciliation outside production unless explicitly enabled", async () => {
    const deps = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as any;

    await expect(
      reconcileRelayHealthHeartbeat({ enabled: false, deps })
    ).resolves.toEqual({ status: "skipped" });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it("creates a project-owned 15-minute protected relay heartbeat", async () => {
    const deps = {
      list: vi.fn().mockResolvedValue({ jobs: [] }),
      create: vi.fn().mockResolvedValue({ taskUid: "relay-cron-1" }),
      update: vi.fn(),
    } as any;

    await expect(
      reconcileRelayHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "created", taskUid: "relay-cron-1" });

    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: RELAY_HEALTH_HEARTBEAT_NAME,
        cron: RELAY_HEALTH_CRON,
        path: RELAY_HEALTH_CALLBACK_PATH,
        method: "POST",
      }),
      ""
    );
  });

  it("repairs the existing named heartbeat without duplication", async () => {
    const deps = {
      list: vi.fn().mockResolvedValue({
        jobs: [
          {
            taskUid: "relay-cron-2",
            name: RELAY_HEALTH_HEARTBEAT_NAME,
          },
        ],
      }),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    } as any;

    await expect(
      reconcileRelayHealthHeartbeat({ enabled: true, deps })
    ).resolves.toEqual({ status: "reconciled", taskUid: "relay-cron-2" });

    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.update).toHaveBeenCalledWith(
      "relay-cron-2",
      expect.objectContaining({
        cron: RELAY_HEALTH_CRON,
        path: RELAY_HEALTH_CALLBACK_PATH,
        enable: true,
      }),
      ""
    );
  });
});
