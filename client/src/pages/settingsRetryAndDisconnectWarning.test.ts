import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Settings SMTP retry and disconnect impact", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

  it("focuses the existing recipient field for a retry rather than recovering a masked recipient", () => {
    expect(source).toContain("retryFailedSmtpTestEmail");
    expect(source).toContain('document.getElementById("smtp-test-email-recipient")?.focus()');
    expect(source).toContain("onRetryFailedAttempt={retryFailedSmtpTestEmail}");
    expect(source).not.toContain("attempt.recipient");
  });

  it("warns that disconnecting pauses active automated review requests before reset", () => {
    expect(source).toContain("smtp.disconnectAutomationPauseWarning");
    expect(source).toContain("disconnectAcknowledged");
  });
});
