import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceManifest = readFileSync(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8");
const lockfile = readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");

describe("nanoid dependency security", () => {
  it("replaces the vulnerable 3.3.17 transitive resolution with nanoid 3.3.18", () => {
    expect(workspaceManifest).toContain('tailwindcss>nanoid: "3.3.18"');
    expect(workspaceManifest).toContain('postcss>nanoid: "3.3.18"');
    expect(lockfile).toContain("nanoid@3.3.18:");
    expect(lockfile).not.toContain("nanoid@3.3.17:");
    expect(lockfile).not.toMatch(/nanoid:\s+3\.3\.17\b/);
  });
});
