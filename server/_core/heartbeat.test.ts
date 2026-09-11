import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_MAX_ATTEMPTS,
  isRetryableHeartbeatError,
  retryHeartbeatOperation,
} from "./heartbeat";

describe("heartbeat service retry backoff", () => {
  it("retries transient failures with bounded exponential delays", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "network" })
      )
      .mockRejectedValueOnce(
        new TRPCError({ code: "TOO_MANY_REQUESTS", message: "busy" })
      )
      .mockResolvedValue({ taskUid: "task_recovered" });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      retryHeartbeatOperation(operation, { sleep })
    ).resolves.toEqual({
      taskUid: "task_recovered",
    });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  it("fails fast for credential and validation failures", async () => {
    const unauthorized = new TRPCError({
      code: "UNAUTHORIZED",
      message: "invalid credential",
    });
    const operation = vi.fn().mockRejectedValue(unauthorized);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(retryHeartbeatOperation(operation, { sleep })).rejects.toBe(
      unauthorized
    );
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(isRetryableHeartbeatError(unauthorized)).toBe(false);
  });

  it("stops retrying after the bounded attempt limit", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "down" })
      );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(retryHeartbeatOperation(operation, { sleep })).rejects.toThrow(
      "down"
    );
    expect(operation).toHaveBeenCalledTimes(HEARTBEAT_MAX_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(HEARTBEAT_MAX_ATTEMPTS - 1);
  });
});
