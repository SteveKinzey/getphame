import { describe, expect, it } from "vitest";

const DEDICATED_SECRET_NAMES = [
  "SMTP_CREDENTIAL_ENCRYPTION_KEY",
  "EMAIL_TRACKING_SECRET",
  "UNSUBSCRIBE_SIGNING_SECRET",
] as const;

describe("dedicated production security secrets", () => {
  it("keeps encryption and public-link signing independent from JWT_SECRET", () => {
    const values = DEDICATED_SECRET_NAMES.map((name) => {
      const value = process.env[name];
      expect(value, `${name} must be configured`).toBeTypeOf("string");
      expect(value!.length, `${name} must contain at least 32 characters`).toBeGreaterThanOrEqual(32);
      expect(value, `${name} must not reuse JWT_SECRET`).not.toBe(process.env.JWT_SECRET);
      return value!;
    });

    expect(new Set(values).size, "Each dedicated secret must be unique").toBe(values.length);
  });
});
