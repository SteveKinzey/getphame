import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

describe("Button DOM nesting safeguards", () => {
  it("RecentActivityCard renders rows as accessible role=button divs rather than nested buttons", () => {
    const file = readProjectFile("./RecentActivityCard.tsx");

    // Row container must not be a button
    expect(file).not.toMatch(/<button\b[^>]*key=\{req\.id\}/);
    expect(file).toMatch(/<div\b[^>]*key=\{req\.id\}[^>]*role="button"/);
    expect(file).toMatch(/tabIndex=\{0\}/);
    expect(file).toMatch(/onKeyDown=/);

    // Inner single-item mark button remains a compliant button inside the role=button div
    expect(file).toMatch(
      /<button\b[^>]*onClick=\{e => handleMarkSingle\(e, req\.id\)\}/
    );
  });

  it("DeveloperIntegrations workspace components do not contain nested buttons", () => {
    const devPage = readProjectFile("../../pages/DeveloperIntegrations.tsx");
    const sourceOps = readProjectFile("../SourceOperationsPanel.tsx");
    const enrollment = readProjectFile("../DeveloperApiEnrollmentPanel.tsx");
    const setupGuide = readProjectFile("../SourceSetupGuide.tsx");

    // Ensure none of the developer components nest a button inside a button
    for (const content of [devPage, sourceOps, enrollment, setupGuide]) {
      const buttonMatches = content.match(/<button[\s\S]*?<\/button>/g) || [];
      for (const btn of buttonMatches) {
        const inner = btn.slice(7, -9);
        expect(inner).not.toMatch(/<button\b/i);
      }
    }
  });
});
