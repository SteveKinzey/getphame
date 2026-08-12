import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("email template selector schema recovery", () => {
  it("declares every metadata column selected by the saved-template helpers", () => {
    const schema = read("drizzle/schema.ts");
    const requiredColumns = [
      "familyPublicId",
      "locale",
      "activeRevisionId",
      "provenance",
      "approvedAt",
    ];

    for (const column of requiredColumns) {
      expect(schema, column).toContain(`${column}:`);
    }
  });

  it("ships an additive repair for every selector metadata column", () => {
    const migration = read("drizzle/0051_email_template_selector_schema_repair.sql");
    for (const column of [
      "familyPublicId",
      "locale",
      "activeRevisionId",
      "provenance",
      "approvedAt",
    ]) {
      expect(migration, column).toContain(`ADD COLUMN IF NOT EXISTS \`${column}\``);
    }
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bUPDATE\b/i);
  });

  it("loads all saved templates through the authenticated selector query", () => {
    const helpers = read("server/templates.ts");
    const sendRequest = read("client/src/pages/SendRequest.tsx");

    expect(helpers).toContain("return db");
    expect(helpers).toContain(".select()");
    expect(helpers).toContain(".where(eq(emailTemplates.userId, userId))");
    expect(sendRequest).toContain("trpc.templates.list.useQuery()");
    expect(sendRequest).toContain("templates?.filter((tmpl) => !tmpl.isDefault).map((tmpl) => (");
  });
});
