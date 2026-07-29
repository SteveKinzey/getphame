import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

describe("GitHub Actions configuration", () => {
  it("runs a bounded, read-only actionlint gate for every workflow change", () => {
    const workflow = readProjectFile("../.github/workflows/actionlint.yml");

    expect(workflow).toContain("name: Validate GitHub Actions");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain('- ".github/workflows/**"');
    expect(workflow).toContain(`permissions:
  contents: read`);
    expect(workflow).toContain(
      "group: actionlint-${{ github.workflow }}-${{ github.ref }}"
    );
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).toContain("timeout-minutes: 5");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("docker://rhysd/actionlint:1.7.12");
    expect(workflow).toContain("args: -color");
    expect(workflow).not.toContain("@latest");
    expect(workflow).not.toMatch(/actions\/checkout@v[1-6]/);
  });

  it("updates GitHub Actions weekly through one controlled Dependabot entry", () => {
    const dependabot = readProjectFile("../.github/dependabot.yml");
    const actionsEntries =
      dependabot.match(/package-ecosystem: "github-actions"/g) ?? [];
    const actionsBlock = dependabot.slice(
      dependabot.indexOf('package-ecosystem: "github-actions"')
    );

    expect(actionsEntries).toHaveLength(1);
    expect(actionsBlock).toContain('directory: "/"');
    expect(actionsBlock).toContain('interval: "weekly"');
    expect(actionsBlock).toContain('day: "monday"');
    expect(actionsBlock).toContain('time: "09:00"');
    expect(actionsBlock).toContain('timezone: "America/Los_Angeles"');
    expect(actionsBlock).toContain("open-pull-requests-limit: 5");
    expect(actionsBlock).toContain(`github-actions:
        patterns:
          - "*"`);
    expect(actionsBlock).toContain('- "github-actions"');
    expect(actionsBlock).toContain('prefix: "chore(ci)"');
    expect(actionsBlock).toContain('- "SteveKinzey"');
  });

  it("shows the protected-main Quality Gate result in the README", () => {
    const readme = readProjectFile("../README.md");
    const badge =
      "[![Quality Gate](https://github.com/SteveKinzey/getphame/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/SteveKinzey/getphame/actions/workflows/quality.yml?query=branch%3Amain)";

    expect(readme).toContain(badge);
    expect(readme.indexOf(badge)).toBeLessThan(readme.indexOf("## What"));
  });
});
