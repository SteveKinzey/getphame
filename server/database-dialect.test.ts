import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("production database dialect", () => {
  it("uses the managed TiDB/MySQL adapter without insecure PostgreSQL SSL overrides", () => {
    const dbPath = fileURLToPath(new URL("./db.ts", import.meta.url));
    const source = readFileSync(dbPath, "utf8");

    expect(source).toContain('from "drizzle-orm/mysql2"');
    expect(source).toContain('mode: "default"');
    expect(source).toContain("onDuplicateKeyUpdate");
    expect(source).not.toContain('from "drizzle-orm/node-postgres"');
    expect(source).not.toContain("rejectUnauthorized: false");
    expect(source).not.toContain("onConflictDoUpdate");
  });
});
