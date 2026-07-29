import { describe, expect, it } from "vitest";
import { readProjectFile } from "./testProjectFile";

describe("GitHub Actions quality gate", () => {
  it("uses Node 24-native actions and runs every required application gate", () => {
    const workflow = readProjectFile("../.github/workflows/quality.yml");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("actions/setup-node@v7");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("npm install --global pnpm@10.18.1");
    expect(workflow).not.toContain("pnpm/action-setup");
    expect(workflow).not.toMatch(/actions\/(?:checkout|setup-node)@v4/);
    expect(workflow).toContain(
      "group: quality-${{ github.workflow }}-${{ github.ref }}"
    );
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain(`- name: Type-check
        env:
          NODE_OPTIONS: --max-old-space-size=4096
        run: pnpm check`);
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain("pnpm build");
  });
});
