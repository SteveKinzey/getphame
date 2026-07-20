import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("GitHub Actions quality gate", () => {
  it("runs locked installation, TypeScript, tests, and the production build for every push and pull request", () => {
    const workflow = readProjectFile("../.github/workflows/quality.yml");

    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("pnpm/action-setup@v4");
    expect(workflow).toContain("version: 10.18.1");
    expect(workflow).toContain("actions/setup-node@v4");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("pnpm check");
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain("pnpm build");
  });
});
