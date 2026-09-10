import { describe, expect, it } from "vitest";
import { buildFreeQuotaSummary } from "../shared/quota";
import {
  evaluateFreeQuotaAccess,
  formatFreeQuotaBlockedMessage,
  type FreeQuotaDataSource,
} from "./quotaEnforcement";

type PersistedRequest = { id: number; sentAt: Date };

function seededQuotaDataSource(
  rows: PersistedRequest[],
  now: Date,
  role = "user"
): FreeQuotaDataSource {
  return {
    async getUserRole() {
      return role;
    },
    async getQuota() {
      const orderedRows = [...rows].sort(
        (a, b) => a.sentAt.getTime() - b.sentAt.getTime() || a.id - b.id
      );
      const rollingCutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      const rollingRows = orderedRows
        .slice(10)
        .filter(row => row.sentAt.getTime() >= rollingCutoff);

      return buildFreeQuotaSummary({
        totalSent: orderedRows.length,
        rollingUsed: rollingRows.length,
        oldestRollingSentAt: rollingRows[0]?.sentAt ?? null,
      });
    },
  };
}

function persistedRows(daysAgo: number[]): PersistedRequest[] {
  const now = new Date("2026-07-14T12:00:00.000Z");
  return daysAgo.map((days, index) => ({
    id: index + 1,
    sentAt: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
  }));
}

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
    expect(quota.nextAvailableAt).toBe(
      new Date("2026-07-01T12:00:00.000Z").getTime()
    );
  });

  it("restores capacity when an old post-initial request leaves the window", () => {
    const quota = buildFreeQuotaSummary({ totalSent: 15, rollingUsed: 4 });
    expect(quota.phase).toBe("rolling");
    expect(quota.remaining).toBe(1);
    expect(quota.blocked).toBe(false);
    expect(quota.nextAvailableAt).toBeNull();
  });
});

describe("Free quota send enforcement integration", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("allows the tenth request while the account remains in its initial allowance", async () => {
    const decision = await evaluateFreeQuotaAccess(
      101,
      "free",
      seededQuotaDataSource(persistedRows(Array(9).fill(60)), now)
    );

    expect(decision.allowed).toBe(true);
    expect(decision.quota).toMatchObject({
      phase: "initial",
      remaining: 1,
      blocked: false,
    });
  });

  it("allows the eleventh request from a fresh five-send rolling allowance", async () => {
    const decision = await evaluateFreeQuotaAccess(
      101,
      "free",
      seededQuotaDataSource(persistedRows(Array(10).fill(60)), now)
    );

    expect(decision.allowed).toBe(true);
    expect(decision.quota).toMatchObject({
      phase: "rolling",
      used: 0,
      remaining: 5,
      blocked: false,
    });
  });

  it("blocks the sixteenth request and includes the rolling-window reset time", async () => {
    const decision = await evaluateFreeQuotaAccess(
      101,
      "free",
      seededQuotaDataSource(
        persistedRows([...Array(10).fill(60), 5, 4, 3, 2, 1]),
        now
      )
    );

    expect(decision.allowed).toBe(false);
    expect(decision.quota).toMatchObject({
      phase: "rolling",
      used: 5,
      remaining: 0,
      blocked: true,
    });
    expect(formatFreeQuotaBlockedMessage(decision.quota, "Blocked.")).toContain(
      "Next send available"
    );
  });

  it("restores one send after the oldest rolling request expires", async () => {
    const decision = await evaluateFreeQuotaAccess(
      101,
      "free",
      seededQuotaDataSource(
        persistedRows([...Array(10).fill(60), 31, 4, 3, 2, 1]),
        now
      )
    );

    expect(decision.allowed).toBe(true);
    expect(decision.quota).toMatchObject({
      phase: "rolling",
      used: 4,
      remaining: 1,
      blocked: false,
    });
  });

  it("bypasses the allowance for administrators on every send channel", async () => {
    const decision = await evaluateFreeQuotaAccess(
      101,
      "free",
      seededQuotaDataSource(
        persistedRows([...Array(10).fill(60), 5, 4, 3, 2, 1]),
        now,
        "admin"
      )
    );

    expect(decision).toEqual({ allowed: true, bypassed: true, quota: null });
  });
});
