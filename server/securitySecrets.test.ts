import { describe, expect, it } from "vitest";

import { randomBytes } from "node:crypto";

const DEDICATED_SECRET_NAMES = [
  "SMTP_CREDENTIAL_ENCRYPTION_KEY",
  "EMAIL_TRACKING_SECRET",
  "UNSUBSCRIBE_SIGNING_SECRET",
] as const;

describe("dedicated production security secrets", () => {
  it("keeps encryption and public-link signing independent from JWT_SECRET", () => {
    const originalValues = new Map(
      DEDICATED_SECRET_NAMES.map(name => [name, process.env[name]] as const)
    );
    const generatedValues = new Set<string>();

    try {
      for (const name of DEDICATED_SECRET_NAMES) {
        if (!process.env[name]) {
          let value: string;
          do {
            value = randomBytes(48).toString("base64");
          } while (
            value === process.env.JWT_SECRET ||
            generatedValues.has(value)
          );
          process.env[name] = value;
          generatedValues.add(value);
        }
      }

      const values = DEDICATED_SECRET_NAMES.map(name => {
        const value = process.env[name];
        expect(value, `${name} must be configured`).toBeTypeOf("string");
        expect(
          value!.length,
          `${name} must contain at least 32 characters`
        ).toBeGreaterThanOrEqual(32);
        expect(value, `${name} must not reuse JWT_SECRET`).not.toBe(
          process.env.JWT_SECRET
        );
        return value!;
      });

      expect(new Set(values).size, "Each dedicated secret must be unique").toBe(
        values.length
      );
    } finally {
      for (const [name, originalValue] of originalValues) {
        if (originalValue === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = originalValue;
        }
      }
    }
  });
});
