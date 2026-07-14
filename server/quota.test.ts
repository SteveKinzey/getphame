import { describe, expect, it } from "vitest";
import { buildFreeQuotaSummary } from "../shared/quota";

describe("buildFreeQuotaSummary", () => {
  it("starts every Free account with ten initial requests", () => {
    expect(buildFreeQuotaSummary({ totalSent: 0, rollingUsed: 0 })).toEqual({
      phase: "initial",
      limit: 10,
      used: 0,
      remaining: 10,
      totalSent: 0,
      blocked: false,
      nextAvailableAt: null,
    });
  });

  it("keeps the tenth initial request available", () => {
    const quota = buildFreeQuotaSummary({ totalSent: 9, rollingUsed: 0 });
    expect(quota.phase).toBe("initial");
    expect(quota.remaining).toBe(1);
    expect(quota.blocked).toBe(false);
  });

  it("opens a separate five-request rolling allowance after the initial ten", () => {
    const quota = buildFreeQuotaSummary({ totalSent: 10, rollingUsed: 0 });
    expect(quota.phase).toBe("rolling");
    expect(quota.limit).toBe(5);
    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(5);
    expect(quota.blocked).toBe(false);
  });

  it("blocks after five post-initial requests and reports the oldest send expiry", () => {
    const oldestRollingSentAt = new Date("2026-06-01T12:00:00.000Z");
    const quota = buildFreeQuotaSummary({
      totalSent: 15,
      rollingUsed: 5,
      oldestRollingSentAt,
    });

    expect(quota.phase).toBe("rolling");
    expect(quota.remaining).toBe(0);
    expect(quota.blocked).toBe(true);
    expect(quota.nextAvailableAt).toBe(new Date("2026-07-01T12:00:00.000Z").getTime());
  });

  it("restores capacity when an old post-initial request leaves the window", () => {
    const quota = buildFreeQuotaSummary({ totalSent: 15, rollingUsed: 4 });
    expect(quota.phase).toBe("rolling");
    expect(quota.remaining).toBe(1);
    expect(quota.blocked).toBe(false);
    expect(quota.nextAvailableAt).toBeNull();
  });
});
