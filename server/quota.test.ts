/**
 * Quota logic unit tests — tests the pure rolling-window algorithm
 * without requiring a database connection.
 */
import { describe, it, expect } from "vitest";
import { QUOTA_ONBOARDING, QUOTA_WINDOW_SENDS, QUOTA_WINDOW_MS } from "./db";

// ── Pure quota logic (extracted for testability) ─────────────────────────────

function checkQuotaLogic(
  tier: string,
  lifetimeSendCount: number,
  quotaWindowStart: number | null,
  windowSendCount: number,
  count: number,
  now = Date.now()
): { allowed: true } | { allowed: false; reason: string; nextWindowAt: number | null } {
  if (tier !== "free") return { allowed: true };

  // Phase 1: onboarding
  if (lifetimeSendCount < QUOTA_ONBOARDING) {
    const remaining = QUOTA_ONBOARDING - lifetimeSendCount;
    if (count > remaining) return { allowed: false, reason: "onboarding_exhausted", nextWindowAt: null };
    return { allowed: true };
  }

  // Phase 2: rolling window
  let ws = quotaWindowStart;
  let wc = windowSendCount;
  if (ws !== null) {
    while (ws + QUOTA_WINDOW_MS <= now) { ws += QUOTA_WINDOW_MS; wc = 0; }
  }
  const windowRemaining = QUOTA_WINDOW_SENDS - wc;
  if (windowRemaining <= 0 || count > windowRemaining) {
    return { allowed: false, reason: "window_exhausted", nextWindowAt: ws !== null ? ws + QUOTA_WINDOW_MS : null };
  }
  return { allowed: true };
}

describe("Quota logic", () => {
  const NOW = Date.now();

  it("allows sends during onboarding (0 of 10 used)", () => {
    expect(checkQuotaLogic("free", 0, null, 0, 1, NOW).allowed).toBe(true);
  });

  it("allows the 10th send (9 used, sending 1)", () => {
    expect(checkQuotaLogic("free", 9, null, 0, 1, NOW).allowed).toBe(true);
  });

  it("blocks when trying to send more than remaining onboarding slots", () => {
    const r = checkQuotaLogic("free", 8, null, 0, 5, NOW); // only 2 remaining
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe("onboarding_exhausted");
  });

  it("allows first send in a fresh rolling window", () => {
    const ws = NOW - 1000;
    expect(checkQuotaLogic("free", 10, ws, 0, 1, NOW).allowed).toBe(true);
  });

  it("allows up to 5 sends in a rolling window", () => {
    const ws = NOW - 1000;
    expect(checkQuotaLogic("free", 14, ws, 4, 1, NOW).allowed).toBe(true);
  });

  it("blocks when rolling window is exhausted (5 of 5 used)", () => {
    const ws = NOW - 1000;
    const r = checkQuotaLogic("free", 15, ws, 5, 1, NOW);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.reason).toBe("window_exhausted");
      expect(r.nextWindowAt).toBe(ws + QUOTA_WINDOW_MS);
    }
  });

  it("allows sends after window expires (30 days later)", () => {
    const ws = NOW - (31 * 24 * 60 * 60 * 1000); // 31 days ago
    const r = checkQuotaLogic("free", 15, ws, 5, 1, NOW);
    expect(r.allowed).toBe(true); // window expired, count resets
  });

  it("free sends do not accumulate — only 5 per window regardless of prior window usage", () => {
    const ws = NOW - 1000;
    // User only sent 2 in previous window, but new window still only allows 5
    const r = checkQuotaLogic("free", 12, ws, 0, 6, NOW);
    expect(r.allowed).toBe(false); // can't send 6, only 5 allowed
    if (!r.allowed) expect(r.reason).toBe("window_exhausted");
  });

  it("paid users always allowed regardless of count", () => {
    expect(checkQuotaLogic("pro", 9999, null, 0, 100, NOW).allowed).toBe(true);
  });

  it("window advances by exactly 30 days, not from now", () => {
    // Window started 31 days ago, was exhausted. New window starts at ws + 30d.
    const ws = NOW - (31 * 24 * 60 * 60 * 1000);
    const r = checkQuotaLogic("free", 15, ws, 5, 1, NOW);
    expect(r.allowed).toBe(true);
    // After advancing, the new window start should be ws + 30d
    const newWs = ws + QUOTA_WINDOW_MS;
    const r2 = checkQuotaLogic("free", 20, newWs, 5, 1, NOW);
    // newWs is 1 day in the future (31d - 30d = 1d from now), so window is active and exhausted
    expect(r2.allowed).toBe(false);
  });
});

describe("Quota constants", () => {
  it("onboarding limit is 10", () => expect(QUOTA_ONBOARDING).toBe(10));
  it("window sends limit is 5", () => expect(QUOTA_WINDOW_SENDS).toBe(5));
  it("window duration is 30 days in ms", () => expect(QUOTA_WINDOW_MS).toBe(30 * 24 * 60 * 60 * 1000));
});
