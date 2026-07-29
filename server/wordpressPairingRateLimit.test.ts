import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ getDb: getDbMock }));

import {
  checkWordPressPairingStartRateLimit,
  getWordPressPairingRateLimitWindow,
  hashWordPressPairingClientIp,
  resetWordPressPairingRateLimitCleanupScheduleForTests,
} from "./wordpressPairingRateLimit";

function createDbReturning(requestCount: number, expiresAt: number) {
  const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
  const insert = vi.fn(() => ({ values }));
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const deleteFrom = vi.fn(() => ({ where: deleteWhere }));
  const limit = vi.fn().mockResolvedValue([{ requestCount, expiresAt }]);
  const selectWhere = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));
  return {
    db: { delete: deleteFrom, insert, select },
    deleteFrom,
    onDuplicateKeyUpdate,
    values,
  };
}

describe("shared WordPress pairing start limiter", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    resetWordPressPairingRateLimitCleanupScheduleForTests();
    process.env.JWT_SECRET = "wordpress-pairing-rate-limit-test-secret";
  });

  it("uses deterministic fixed windows and never returns the raw client IP as its dimension", () => {
    expect(getWordPressPairingRateLimitWindow(12_345, 10_000)).toEqual({
      windowStartedAt: 10_000,
      expiresAt: 20_000,
    });
    const first = hashWordPressPairingClientIp("198.51.100.10");
    const second = hashWordPressPairingClientIp("198.51.100.10");
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("198.51.100.10");
  });

  it("allows the twelfth request through one atomic upsert", async () => {
    const { db, onDuplicateKeyUpdate } = createDbReturning(12, 20_000);
    getDbMock.mockResolvedValue(db);

    await expect(checkWordPressPairingStartRateLimit("198.51.100.10", 12_345, {
      windowMs: 10_000,
      maxStarts: 12,
    })).resolves.toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
    expect(onDuplicateKeyUpdate).toHaveBeenCalledTimes(1);
  });

  it("denies the thirteenth request and returns the remaining fixed-window delay", async () => {
    const { db } = createDbReturning(13, 20_000);
    getDbMock.mockResolvedValue(db);

    await expect(checkWordPressPairingStartRateLimit("198.51.100.10", 12_345, {
      windowMs: 10_000,
      maxStarts: 12,
    })).resolves.toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 8 });
  });

  it("cleans expired windows at most once per cleanup interval in one process", async () => {
    const { db, deleteFrom } = createDbReturning(1, 20_000);
    getDbMock.mockResolvedValue(db);

    await checkWordPressPairingStartRateLimit("198.51.100.10", 12_345, {
      windowMs: 10_000,
      cleanupIntervalMs: 60_000,
    });
    await checkWordPressPairingStartRateLimit("198.51.100.10", 12_346, {
      windowMs: 10_000,
      cleanupIntervalMs: 60_000,
    });
    expect(deleteFrom).toHaveBeenCalledTimes(1);

    await checkWordPressPairingStartRateLimit("198.51.100.10", 72_345, {
      windowMs: 10_000,
      cleanupIntervalMs: 60_000,
    });
    expect(deleteFrom).toHaveBeenCalledTimes(2);
  });
});
