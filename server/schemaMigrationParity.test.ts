import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const linterScript = resolve(root, "scripts/lint-schema-migrations.mjs");

describe("schema migration column parity linter", () => {
  it("verifies every pgTable column has a matching durable SQL migration", () => {
    const output = execFileSync("node", [linterScript], {
      cwd: root,
      encoding: "utf8",
    });

    expect(output).toContain("Schema/migration column parity passed");
  });
});
