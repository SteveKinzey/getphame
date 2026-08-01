import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./db", () => ({ getDb: mocks.getDb }));

import {
  consumeProviderHumanVerificationAttempt,
  createProviderHumanVerificationAttempt,
} from "./signupRisk";

describe("provider human-verification attempts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores a short-lived provider-bound attempt with no reusable proof material", async () => {
    const cleanupWhere = vi.fn().mockResolvedValue(undefined);
    const insertValues = vi.fn().mockResolvedValue(undefined);
    mocks.getDb.mockResolvedValue({
      delete: vi.fn(() => ({ where: cleanupWhere })),
      insert: vi.fn(() => ({ values: insertValues })),
    });

    const now = 1_000_000;
    const attemptId = await createProviderHumanVerificationAttempt(
      "google",
      now
    );

    expect(attemptId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(insertValues).toHaveBeenCalledWith({
      id: attemptId,
      provider: "google",
      expiresAt: now + 10 * 60 * 1000,
      consumedAt: null,
      createdAt: now,
    });
  });

  it("reports success only for the single atomic update that consumes an unexpired matching attempt", async () => {
    const updateWhere = vi
      .fn()
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    mocks.getDb.mockResolvedValue({
      update: vi.fn(() => ({ set: updateSet })),
    });
    const attemptId = "44444444-4444-4444-8444-444444444444";

    await expect(
      consumeProviderHumanVerificationAttempt(attemptId, "apple", 2_000_000)
    ).resolves.toBe(true);
    await expect(
      consumeProviderHumanVerificationAttempt(attemptId, "apple", 2_000_001)
    ).resolves.toBe(false);
    expect(updateSet).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed attempt identifiers before touching persistence", async () => {
    await expect(
      consumeProviderHumanVerificationAttempt("not-an-attempt", "google")
    ).resolves.toBe(false);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
