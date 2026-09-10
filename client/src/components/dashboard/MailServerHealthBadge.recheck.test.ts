import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "client/src/components/dashboard/MailServerHealthBadge.tsx"
  ),
  "utf8"
);

describe("Mail server health recheck", () => {
  it("offers an in-place saved-server test only for needs-attention state", () => {
    expect(source).toContain('health === "attention"');
    expect(source).toContain(
      'data-testid="dashboard-mail-health-test-connection"'
    );
    expect(source).toContain("onTestConnection");
    expect(source).toContain("isTesting");
  });

  it("keeps the troubleshooting deep link alongside the recheck control", () => {
    expect(source).toContain('href="/settings?focus=smtp#smtp-settings"');
    expect(source).toContain(
      'data-testid="dashboard-mail-health-troubleshoot"'
    );
  });
});
