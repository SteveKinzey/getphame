import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const recoveryExperiencePath = fileURLToPath(new URL("../client/src/components/ApiRecoveryExperience.tsx", import.meta.url));
const appPath = fileURLToPath(new URL("../client/src/App.tsx", import.meta.url));
const errorBoundaryPath = fileURLToPath(new URL("../client/src/components/ErrorBoundary.tsx", import.meta.url));

describe("API recovery experience", () => {
  it("shows a quiet reconnecting indicator only while active transient retries exist", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");

    expect(source).toContain("useActiveTransientQueryRetries");
    expect(source).toContain('data-testid="api-reconnecting-indicator"');
    expect(source).toContain("Reconnecting…");
  });

  it("gates the authenticated dashboard with a manual retry after readiness retries exhaust", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");
    const appSource = readFileSync(appPath, "utf8");

    expect(source).toContain('fetch("/api/health"');
    expect(source).toContain("retry: shouldRetryQuery");
    expect(source).toContain('data-testid="api-recovery-retry"');
    expect(source).toContain("readiness.refetch()");
    expect(appSource).toContain("<DashboardReadinessGate readiness={dashboardReadiness}>");
    expect(appSource).toContain("enabled: !!user && dashboardReadiness.data?.ok === true");
  });

  it("keeps the root boundary user-facing and retryable without rendering stack traces", () => {
    const source = readFileSync(errorBoundaryPath, "utf8");

    expect(source).toContain('data-testid="app-error-boundary-retry"');
    expect(source).toContain("Try again");
    expect(source).not.toContain("this.state.error?.stack");
  });
});
