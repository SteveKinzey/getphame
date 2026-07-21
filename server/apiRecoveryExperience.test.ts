import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";

const recoveryExperiencePath = fileURLToPath(new URL("../client/src/components/ApiRecoveryExperience.tsx", import.meta.url));
const appPath = fileURLToPath(new URL("../client/src/App.tsx", import.meta.url));
const errorBoundaryPath = fileURLToPath(new URL("../client/src/components/ErrorBoundary.tsx", import.meta.url));
const retrySubscriptionHookPath = fileURLToPath(
  new URL("../client/src/hooks/useActiveTransientQueryRetries.ts", import.meta.url),
);
const stylePath = fileURLToPath(new URL("../client/src/index.css", import.meta.url));
const hapticsPath = fileURLToPath(new URL("../client/src/hooks/useHaptics.ts", import.meta.url));
const e2ePath = fileURLToPath(new URL("../e2e/api-recovery-reconnection.spec.ts", import.meta.url));
const iosInfoPath = fileURLToPath(new URL("../ios/App/App/Info.plist", import.meta.url));
const androidStringsPath = fileURLToPath(new URL("../android/app/src/main/res/values/strings.xml", import.meta.url));
const submissionChecklistPath = fileURLToPath(new URL("../docs/mobile-store-submission-checklist.md", import.meta.url));
const translationPath = (locale: string) =>
  fileURLToPath(new URL(`../client/public/locales/${locale}/translation.json`, import.meta.url));

describe("API recovery experience", () => {
  it("shows a quiet reconnecting indicator only while active transient retries exist", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");

    expect(source).toContain("useActiveTransientQueryRetries");
    expect(source).toContain('data-testid="api-reconnecting-indicator"');
    expect(source).toContain("api-recovery-signal");
    expect(source).toContain('apiRecovery.reconnecting');
  });

  it("gives offline users practical recovery guidance and confirms a recovered connection with a success toast", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");

    expect(source).toContain("useNetworkStatus");
    expect(source).toContain('data-testid="api-recovery-offline-illustration"');
    expect(source).toContain('data-testid="api-recovery-offline-guidance"');
    expect(source).toContain("refetchOnReconnect: true");
    expect(source).toContain("toast.success");
    expect(source).toContain("apiRecovery.reconnected");
  });

  it("keeps reconnecting motion subtle, reduced-motion-safe, and translated in every supported locale", () => {
    const styles = readFileSync(stylePath, "utf8");

    expect(styles).toContain("@keyframes api-recovery-signal");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");

    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const recoveryCopy = directKeyFallbackResources[locale]?.apiRecovery as Record<string, string> | undefined;
      const shippedRecoveryCopy = JSON.parse(readFileSync(translationPath(locale), "utf8")).apiRecovery as
        | Record<string, string>
        | undefined;

      expect(recoveryCopy?.reconnecting).toBeTruthy();
      expect(recoveryCopy?.offlineTitle).toBeTruthy();
      expect(recoveryCopy?.reconnected).toBeTruthy();
      expect(recoveryCopy?.retryNow).toBeTruthy();
      expect(shippedRecoveryCopy?.reconnecting).toBeTruthy();
      expect(shippedRecoveryCopy?.offlineTitle).toBeTruthy();
      expect(shippedRecoveryCopy?.reconnected).toBeTruthy();
      expect(shippedRecoveryCopy?.retryNow).toBeTruthy();
    }
  });

  it("subscribes to retry-state changes through React's render-safe external-store API", () => {
    const source = readFileSync(retrySubscriptionHookPath, "utf8");

    expect(source).toContain("useSyncExternalStore");
    expect(source).toContain("queryClient.getQueryCache().subscribe(onStoreChange)");
    expect(source).toContain("return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)");
    expect(source).not.toContain("useState");
    expect(source).not.toContain("setRetryCount");
    expect(source).not.toContain("update();");
  });

  it("gates the authenticated dashboard with a manual retry after readiness retries exhaust", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");
    const appSource = readFileSync(appPath, "utf8");

    expect(source).toContain('fetch("/api/health"');
    expect(source).toContain("retry: options.retry ?? shouldRetryQuery");
    expect(source).toContain('data-testid="api-recovery-retry"');
    expect(source).toContain("readiness.refetch({ cancelRefetch: false })");
    expect(appSource).toContain("<DashboardReadinessGate readiness={dashboardReadiness}>");
    expect(appSource).toContain("enabled: !!user && dashboardReadiness.data?.ok === true");
  });

  it("keeps the root boundary user-facing and retryable without rendering stack traces", () => {
    const source = readFileSync(errorBoundaryPath, "utf8");

    expect(source).toContain('data-testid="app-error-boundary-retry"');
    expect(source).toContain("Try again");
    expect(source).not.toContain("this.state.error?.stack");
  });

  it("offers offline users an immediate, accessible readiness check and native-safe recovery confirmation", () => {
    const source = readFileSync(recoveryExperiencePath, "utf8");
    const haptics = readFileSync(hapticsPath, "utf8");
    const styles = readFileSync(stylePath, "utf8");

    expect(source).toContain('data-testid="api-recovery-retry-now"');
    expect(source).toContain('aria-describedby="api-recovery-offline-guidance"');
    expect(source).toContain('networkMode: "always"');
    expect(source).toContain("recoverySuccessHaptic()");
    expect(styles).toContain("@keyframes api-recovery-toast-enter");
    expect(styles).toContain(".api-recovery-reconnect-toast");
    expect(haptics).toContain("Capacitor.isNativePlatform()");
    expect(haptics).toContain("NotificationType.Success");
  });

  it("ships browser coverage and reviewer-facing native metadata for the recovery experience", () => {
    const browserTest = readFileSync(e2ePath, "utf8");
    const iosInfo = readFileSync(iosInfoPath, "utf8");
    const androidStrings = readFileSync(androidStringsPath, "utf8");
    const checklist = readFileSync(submissionChecklistPath, "utf8");

    expect(browserTest).toContain(".api-recovery-reconnect-toast");
    expect(browserTest).toContain("api-recovery-retry-now");
    expect(iosInfo).toContain("<string>Get Phame</string>");
    expect(androidStrings).toContain("<string name=\"app_name\">Get Phame</string>");
    expect(checklist).toContain("App Store Connect");
    expect(checklist).toContain("Play Console");
  });
});
