import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const legacyEvidence = readFileSync(resolve(projectRoot, "drizzle/legacyLiveTables.ts"), "utf8");
const additiveMigration = readFileSync(
  resolve(projectRoot, "drizzle/manual-pending/20260812_add_runtime_schema_contracts.sql"),
  "utf8",
);

describe("A1b application-first schema reconciliation", () => {
  it("preserves the fourteen live-only tables as read-only schema evidence", () => {
    const tableDeclarations = legacyEvidence.match(/mysqlTable\(/g) ?? [];
    expect(tableDeclarations).toHaveLength(14);
    expect(legacyEvidence).toContain("excluded from the active generator schema");
    expect(legacyEvidence).toContain("signup_risk_events");
    expect(legacyEvidence).toContain("webauthn_challenges");
  });

  it("keeps the runtime-table proposal additive-only and scoped", () => {
    const executableSql = additiveMigration
      .split("\n")
      .filter(line => !line.trimStart().startsWith("--"))
      .join("\n");

    expect(additiveMigration).toContain("CREATE TABLE IF NOT EXISTS `contact_consent_evidence`");
    expect(additiveMigration).toContain("CREATE TABLE IF NOT EXISTS `email_template_revisions`");
    expect(additiveMigration).toContain("CREATE TABLE IF NOT EXISTS `source_automation_events`");
    expect(additiveMigration).toContain("CREATE TABLE IF NOT EXISTS `source_automation_schedulers`");
    expect(executableSql).not.toMatch(/\b(DROP|DELETE|UPDATE|ALTER)\b/i);
    expect(executableSql).not.toMatch(/__drizzle_migrations/i);
  });
});
