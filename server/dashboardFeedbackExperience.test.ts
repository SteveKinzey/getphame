import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

describe("dashboard feedback experience", () => {
  it("shows a user-friendly, deduplicated API failure toast without exposing the raw server error", () => {
    const main = read("client/src/main.tsx");

    expect(main).toContain('id: "api-query-error"');
    expect(main).toContain('i18n.t("apiRecovery.unavailableTitle"');
    expect(main).toContain('i18n.t("apiRecovery.unavailableDescription"');
    expect(main).not.toContain("toast.error(error.message)");
  });

  it("offers an accessible profile-link copy action with a clipboard fallback and explicit success or error feedback", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expect(dashboard).toContain('data-testid="dashboard-share-profile"');
    expect(dashboard).toContain("profile?.reviewLink");
    expect(dashboard).toContain("aria-label={");
    expect(dashboard).toContain("navigator.clipboard?.writeText");
    expect(dashboard).toContain('document.execCommand("copy")');
    expect(dashboard).toContain('t("dashboard.shareProfile.copySuccess"');
    expect(dashboard).toContain('t("dashboard.shareProfile.copyError"');
  });

  it("keeps the initial dashboard spinner screen-reader accessible", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read("client/src/components/dashboard/DashboardFeedbackExperience.tsx");

    expect(dashboard).toContain("return <DashboardLoadingState />");
    expect(feedback).toContain('data-testid="dashboard-loading"');
    expect(feedback).toContain('role="status"');
    expect(feedback).toContain('aria-live="polite"');
    expect(feedback).toContain('t("dashboard.loading.title"');
  });

  it("uses the existing persisted theme mechanism with an accessible dashboard shortcut", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const styles = read("client/src/index.css");

    expect(dashboard).toContain('useTheme()');
    expect(dashboard).toContain('data-testid="dashboard-theme-toggle"');
    expect(dashboard).toContain("onClick={toggleTheme}");
    expect(dashboard).toContain('aria-pressed={theme === "dark"}');
    expect(styles).toContain(".dark .dashboard-content .bg-white");
    expect(styles).toContain(".dark .dashboard-content :is(.rr-text-navy");
    expect(styles).toContain(".bg-slate-50");
    expect(styles).toContain(".dark .dashboard-content input.bg-white");
  });

  it("offers an accessible Settings appearance preference through the shared persisted theme context", () => {
    const settings = read("client/src/pages/Settings.tsx");
    const themeContext = read("client/src/contexts/ThemeContext.tsx");

    expect(themeContext).toContain("setThemePreference?: (theme: Theme) => void");
    expect(themeContext).toContain('localStorage.setItem("theme", theme)');
    expect(settings).toContain('data-testid="settings-theme-preference"');
    expect(settings).toContain('role="radiogroup"');
    expect(settings).toContain('role="radio"');
    expect(settings).toContain("aria-checked={selected}");
    expect(settings).toContain("setThemePreference(option)");
  });

  it("edits only the authenticated user business profile through the established profile upsert contract", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expect(dashboard).toContain('data-testid="dashboard-edit-profile"');
    expect(dashboard).toContain("trpc.profile.upsert.useMutation");
    expect(dashboard).toContain("utils.profile.get.invalidate()");
    expect(dashboard).toContain('id="dashboard-profile-business-name"');
    expect(dashboard).toContain('id="dashboard-profile-review-link"');
    expect(dashboard).toContain('id="dashboard-profile-reply-to"');
    expect(dashboard).toContain('t("dashboard.profileEditor.saved"');
    expect(dashboard).toContain("onError: showDashboardMutationError");
  });

  it("routes dashboard mutation failures through one localized recovery message", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read("client/src/components/dashboard/DashboardFeedbackExperience.tsx");

    expect(dashboard).toContain("const showDashboardApiError = useDashboardApiErrorToast()");
    expect(feedback).toContain('t("apiRecovery.unavailableTitle"');
    expect(dashboard.match(/onError: showDashboardMutationError/g)).toHaveLength(3);
    expect(dashboard).toContain("showDashboardApiError();");
    expect(dashboard).not.toContain("toast.error(err.message)");
  });

  it("adds a retry action only for recoverable dashboard query refreshes", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read("client/src/components/dashboard/DashboardFeedbackExperience.tsx");

    expect(feedback).toContain("type DashboardApiErrorToastOptions");
    expect(feedback).toContain("action: options.onRetry");
    expect(feedback).toContain('t("apiRecovery.retry"');
    expect(dashboard).toContain("const retryDashboardData = useCallback");
    expect(dashboard).toContain("hasRecoverableDashboardQueryError");
    expect(dashboard).toContain("useRecoverableDashboardQueryError(hasRecoverableDashboardQueryError, retryDashboardData)");
    expect(dashboard).toContain("testRecoveryMode !== \"mutation\"");
    expect(dashboard).toContain('data-testid="dashboard-page-mutation-error-trigger"');
    expect(dashboard).toContain("updateDashboardProfile.mutate");
    expect(feedback).toContain("wasErroredRef");
    expect(feedback).toContain("if (wasErroredRef.current) return");
    expect(dashboard).not.toContain("onError: showDashboardApiError({ onRetry:");
  });

  it("ships dashboard feedback copy in every locale and the offline PWA fallback", () => {
    const fallback = JSON.parse(
      readFileSync(`${projectRoot}client/src/lib/i18nCompleteFallbackResources.json`, "utf8")
    ) as Record<string, {
      dashboard?: Record<string, Record<string, string>>;
      settings?: { appearance?: Record<string, string> };
    }>;

    for (const locale of locales) {
      const catalog = JSON.parse(
        read(`client/public/locales/${locale}/translation.json`)
      ) as {
        dashboard?: Record<string, Record<string, string>>;
        settings?: { appearance?: Record<string, string> };
      };
      const dashboard = catalog.dashboard;
      const offlineDashboard = fallback[locale]?.dashboard;

      expect(dashboard?.shareProfile?.button).toBeTruthy();
      expect(dashboard?.shareProfile?.copySuccess).toBeTruthy();
      expect(dashboard?.shareProfile?.copyError).toBeTruthy();
      expect(dashboard?.loading?.title).toBeTruthy();
      expect(dashboard?.profileEditor?.button).toBeTruthy();
      expect(dashboard?.profileEditor?.title).toBeTruthy();
      expect(dashboard?.profileEditor?.save).toBeTruthy();
      expect(offlineDashboard?.shareProfile?.button).toBeTruthy();
      expect(offlineDashboard?.loading?.title).toBeTruthy();
      expect(offlineDashboard?.profileEditor?.button).toBeTruthy();
      expect(offlineDashboard?.profileEditor?.save).toBeTruthy();
      expect(catalog.settings?.appearance?.title).toBeTruthy();
      expect(catalog.settings?.appearance?.saved).toBeTruthy();
      expect(fallback[locale]?.settings?.appearance?.title).toBeTruthy();
      expect(fallback[locale]?.settings?.appearance?.saved).toBeTruthy();
    }
  });
});
