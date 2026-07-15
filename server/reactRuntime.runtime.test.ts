import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("React runtime resolution", () => {
  it("aliases, deduplicates, and prebundles one React dispatcher for all providers", () => {
    const viteConfig = fs.readFileSync(path.join(process.cwd(), "vite.config.ts"), "utf8");

    expect(viteConfig).toContain('"react": path.resolve(import.meta.dirname, "node_modules", "react")');
    expect(viteConfig).toContain('"react-dom": path.resolve(import.meta.dirname, "node_modules", "react-dom")');
    expect(viteConfig).toContain('dedupe: ["react", "react-dom"]');
    expect(viteConfig).toContain('"react/jsx-runtime"');
    expect(viteConfig).toContain('"react/jsx-dev-runtime"');
    expect(viteConfig).toContain('"@trpc/react-query"');
    expect(viteConfig).toContain('"@radix-ui/react-tooltip"');
  });
});
