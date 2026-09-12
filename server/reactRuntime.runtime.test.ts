import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("React runtime resolution", () => {
  it("aliases, deduplicates, and prebundles one React dispatcher for all providers", () => {
    const viteConfig = fs.readFileSync(
      path.join(process.cwd(), "vite.config.ts"),
      "utf8"
    );

    expect(viteConfig).toMatch(
      /react\s*:\s*path\.resolve\(\s*import\.meta\.dirname\s*,\s*["']node_modules["']\s*,\s*["']react["']\s*\)/
    );
    expect(viteConfig).toMatch(
      /["']react-dom["']\s*:\s*path\.resolve\(\s*import\.meta\.dirname\s*,\s*["']node_modules["']\s*,\s*["']react-dom["']\s*\)/
    );
    expect(viteConfig).toMatch(
      /dedupe\s*:\s*\[\s*["']react["']\s*,\s*["']react-dom["']\s*\]/
    );
    expect(viteConfig).toMatch(/["']react\/jsx-runtime["']/);
    expect(viteConfig).toMatch(/["']react\/jsx-dev-runtime["']/);
    expect(viteConfig).toMatch(/["']@trpc\/react-query["']/);
    expect(viteConfig).toMatch(/["']@radix-ui\/react-tooltip["']/);
  });
});
