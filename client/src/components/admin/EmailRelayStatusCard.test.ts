import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";

describe("EmailRelayStatusCard UI component", () => {
  it("exports a valid component function", async () => {
    const { EmailRelayStatusCard } = await import("./EmailRelayStatusCard");
    expect(typeof EmailRelayStatusCard).toBe("function");
  });

  it("includes an administrator Slack test action and a bounded sanitized diagnostics view", () => {
    const source = fs.readFileSync(new URL("./EmailRelayStatusCard.tsx", import.meta.url), "utf8");
    expect(source).toContain("testRelaySlackWebhook");
    expect(source).toContain("admin.emailRelay.slackTest");
    expect(source).toContain("admin.emailRelay.diagnosticsTitle");
    expect(source).toContain("recentDiagnostics.map");
    expect(source).toContain("admin.emailRelay.sanitizedDiagnostic");
  });
});
