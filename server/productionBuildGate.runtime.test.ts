import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("production dependency audit gate", () => {
  it("keeps the production audit ahead of tests and compilation", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8")
    );

    expect(packageJson.scripts["audit:prod"]).toBe(
      "node scripts/audit-prod.mjs"
    );
    expect(packageJson.scripts.build).toMatch(
      /^pnpm audit:prod && pnpm test && vite build && esbuild /
    );
  });

  it("audits only installed production packages against OSV and fails on findings", () => {
    const source = readFileSync(
      resolve(root, "scripts/audit-prod.mjs"),
      "utf8"
    );

    expect(source).toContain('"--prod", "--json", "--depth", "Infinity"');
    expect(source).toContain("maxBuffer: 100 * 1024 * 1024");
    expect(source).toContain("Object.entries(");
    expect(source).toContain("visit(dependency, dependencyName)");
    expect(source).toContain("https://api.osv.dev/v1/querybatch");
    expect(source).toContain("visit(dependency, dependencyName)");
    expect(source).toContain("https://api.osv.dev/v1/querybatch");
    expect(source).toContain("MAX_ATTEMPTS = 3");
    expect(source).toContain("if (findings.length > 0)");
    expect(source).toContain("process.exitCode = 1");
  });
});
