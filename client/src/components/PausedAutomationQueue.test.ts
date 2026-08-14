import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/components/PausedAutomationQueue.tsx"), "utf8");

describe("Paused automation recovery UI", () => {
  it("renders the root warning only for a non-empty paused tenant queue and links to Settings", () => {
    expect(source).toContain("if (!queue?.paused || queue.total < 1) return null");
    expect(source).toContain('href="/settings?focus=paused-automation#paused-automation-queue"');
    expect(source).toContain('data-testid="paused-automation-banner"');
  });

  it("shows safe request labels and timestamps without rendering recipient email or message content", () => {
    expect(source).toContain("item.label");
    expect(source).toContain("item.scheduledAt");
    expect(source).not.toContain("recipientEmail");
    expect(source).not.toContain("customerEmail");
    expect(source).not.toContain("item.html");
  });
});
