import { describe, expect, it } from "vitest";
import {
  buildSourceImportPreview,
  hashSourceIdempotencyKey,
  hashSourceImportPayload,
  normalizeSourceContactRows,
} from "./sourceImportLogic";

describe("Sources import logic", () => {
  it("normalizes emails, rejects invalid rows, and deduplicates a payload", () => {
    const result = normalizeSourceContactRows([
      { name: " Alice ", email: " Alice@Example.com ", phone: " 123 " },
      { name: "Duplicate", email: "alice@example.com" },
      { name: "Invalid", email: "not-an-email" },
    ]);

    expect(result.rows).toEqual([{ name: "Alice", email: "alice@example.com", phone: "123", externalId: undefined }]);
    expect(result.duplicatesWithinPayload).toBe(1);
    expect(result.rejected).toBe(1);
  });

  it("reports existing contacts as duplicates without removing reviewed valid rows", () => {
    const result = buildSourceImportPreview([
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ], ["ALICE@example.com"]);

    expect(result.rows).toHaveLength(2);
    expect(result.stats).toEqual({ requested: 2, valid: 2, duplicates: 1, rejected: 0 });
  });

  it("creates stable payload hashes independent of row order and email casing", () => {
    const first = hashSourceImportPayload("csv", [
      { name: "Bob", email: "BOB@example.com" },
      { name: "Alice", email: "alice@example.com" },
    ]);
    const second = hashSourceImportPayload("csv", [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ]);
    expect(first).toBe(second);
    expect(hashSourceImportPayload("woocommerce", [{ name: "Alice", email: "alice@example.com" }])).not.toBe(first);
  });

  it("scopes idempotency hashes by owner and source", () => {
    const key = "client-generated-key";
    expect(hashSourceIdempotencyKey(1, "csv", key)).toBe(hashSourceIdempotencyKey(1, "csv", key));
    expect(hashSourceIdempotencyKey(1, "csv", key)).not.toBe(hashSourceIdempotencyKey(2, "csv", key));
    expect(hashSourceIdempotencyKey(1, "csv", key)).not.toBe(hashSourceIdempotencyKey(1, "woocommerce", key));
  });
});
