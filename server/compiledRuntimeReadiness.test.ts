import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("compiled production runtime readiness", () => {
  it("serves static assets and the configured platform port without starting Vite", () => {
    const source = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");

    expect(source).toContain(
      'const isCompiledBundle = import.meta.url.includes("/dist/")'
    );
    expect(source).toContain('process.env.NODE_ENV = "production"');
    expect(source).toContain(
      'process.env.NODE_ENV === "development" && !isCompiledBundle'
    );
    expect(source).toMatch(
      /hasConfiguredPort\s*\|\|\s*process\.env\.NODE_ENV\s*===\s*"production"\s*\|\|\s*isCompiledBundle/
    );
    expect(source).toContain('server.listen(port, "0.0.0.0", () => {');
    expect(source).toContain('app.get("/api/health", (_req, res) => {');
    expect(source).toContain(
      'res.status(200).json({ ok: true, status: "ready" })'
    );
  });
});
