import { beforeEach, describe, expect, it } from "vitest";
import {
  checkSmtpTestEmailRateLimit,
  resetSmtpTestEmailRateLimitForTests,
} from "./rateLimiter";

describe("SMTP test-email rate limit", () => {
  beforeEach(() => resetSmtpTestEmailRateLimitForTests());

  it("allows a small bounded number of tenant-owned diagnostic sends", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() => checkSmtpTestEmailRateLimit(42)).not.toThrow();
    }
    expect(() => checkSmtpTestEmailRateLimit(42)).toThrow(
      "Test-email limit reached"
    );
  });

  it("keeps test-email limits isolated by authenticated user", () => {
    for (let attempt = 0; attempt < 5; attempt += 1)
      checkSmtpTestEmailRateLimit(42);
    expect(() => checkSmtpTestEmailRateLimit(99)).not.toThrow();
  });
});
