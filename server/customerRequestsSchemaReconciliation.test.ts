import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(
  resolve(process.cwd(), "drizzle/manual-pending/20260813_reconcile_customer_requests_query.sql"),
  "utf8",
);

describe("customer request schema reconciliation", () => {
  it("keeps every field selected by the home-page customer request query in the schema and durable migration", () => {
    const fields = [
      "sourceConnectionId",
      "sourceEventId",
      "preferredLocale",
      "templateRevisionId",
      "englishTemplateRevisionId",
    ];

    for (const field of fields) {
      expect(schemaSource).toContain(`${field}:`);
      expect(migrationSource).toContain(`ADD COLUMN IF NOT EXISTS ${field}`);
    }
  });

  it("retains the schema-declared source-event uniqueness guard after reconciling legacy tables", () => {
    expect(schemaSource).toContain("customer_requests_source_event_unique");
    expect(migrationSource).toContain("CREATE UNIQUE INDEX IF NOT EXISTS customer_requests_source_event_unique");
  });
});
