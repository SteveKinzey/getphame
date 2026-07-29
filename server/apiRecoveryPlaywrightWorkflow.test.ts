import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const workflow = readFileSync(
  resolve(root, ".github/workflows/api-recovery-e2e.yml"),
  "utf8"
);
const recoveryConfig = readFileSync(
  resolve(root, "playwright.recovery.config.ts"),
  "utf8"
);

describe("API recovery Playwright workflow", () => {
  it("is path-scoped, cancellable, least-privilege, and job-bounded", () => {
    expect(workflow).toContain("name: API Recovery Browser Check");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("paths:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).toContain("timeout-minutes: 10");
  });

  it("installs only Chromium and runs only the focused recovery specification", () => {
    expect(workflow).toContain("playwright install --with-deps chromium");
    expect(workflow).toContain(
      "playwright test e2e/api-recovery-reconnection.spec.ts"
    );
    expect(workflow).toContain("--project=chromium");
    expect(workflow).toContain("--workers=1");
    expect(workflow).toContain("--retries=1");
    expect(workflow).toContain("--timeout=30000");
    expect(workflow).toContain("--config=playwright.recovery.config.ts");
  });

  it("bounds startup polling and always tears down the development server", () => {
    expect(workflow).toContain("setsid pnpm dev");
    expect(workflow).toContain("for _ in {1..30}; do");
    expect(workflow).toContain(
      "curl --fail --silent --show-error --max-time 2"
    );
    expect(workflow).toContain("if: always()");
    expect(workflow).toContain('kill -TERM -- "-$(cat /tmp/getphame-dev.pid)"');
  });

  it("enforces a stub-only, unauthenticated recovery harness", () => {
    expect(workflow).toContain("Verify mock-only privacy contract");
    expect(workflow).toContain('grep -Fq "page.route("');
    expect(workflow).toContain('grep -Fq "route.fulfill"');
    expect(workflow).toContain("/__test/api-recovery?from_webdev=1");
    expect(workflow).toContain("storageState addCookies authorization cookie");
    expect(workflow).toContain("customer /api/trpc login sign-in");
  });

  it("disables raw browser artifacts and retains only sanitized failure text", () => {
    expect(recoveryConfig).toContain('reporter: [["line"]]');
    expect(recoveryConfig).toContain(
      'outputDir: "/tmp/api-recovery-test-results"'
    );
    expect(recoveryConfig).toContain('trace: "off"');
    expect(recoveryConfig).toContain('screenshot: "off"');
    expect(recoveryConfig).toContain('video: "off"');
    expect(workflow).toContain("if: failure()");
    expect(workflow).toContain("Upload sanitized failure diagnostics");
    expect(workflow).toContain("ci-artifacts/api-recovery-playwright.log");
    expect(workflow).toContain("<url-redacted>");
    expect(workflow).toContain("<email-redacted>");
    expect(workflow).toContain("<redacted>");
    expect(workflow).not.toContain("playwright-report/");
    expect(workflow).not.toContain("test-results/");
    expect(workflow).toContain("if-no-files-found: ignore");
    expect(workflow).toContain("retention-days: 3");
  });
});
