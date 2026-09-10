import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

describe("dashboard feedback experience", () => {
  it("shows a user-friendly, deduplicated API failure toast without exposing the raw server error", () => {
    const main = read("client/src/main.tsx");

    expectSourceContract(main).toContain('id: "api-query-error"');
    expectSourceContract(main).toContain(
      'i18n.t("apiRecovery.unavailableTitle"'
    );
    expectSourceContract(main).toContain(
      'i18n.t("apiRecovery.unavailableDescription"'
    );
    expect(main).not.toContain("toast.error(error.message)");
  });

  it("offers an accessible profile-link copy action with a clipboard fallback and explicit success or error feedback", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expectSourceContract(dashboard).toContain(
      'data-testid="dashboard-share-profile"'
    );
    expectSourceContract(dashboard).toContain("profile?.reviewLink");
    expectSourceContract(dashboard).toContain("aria-label={");
    expectSourceContract(dashboard).toContain("navigator.clipboard?.writeText");
    expectSourceContract(dashboard).toContain('document.execCommand("copy")');
    expectSourceContract(dashboard).toContain(
      't("dashboard.shareProfile.copySuccess"'
    );
    expectSourceContract(dashboard).toContain(
      't("dashboard.shareProfile.copyError"'
    );
  });

  it("keeps the initial dashboard spinner screen-reader accessible", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read(
      "client/src/components/dashboard/DashboardFeedbackExperience.tsx"
    );

    expectSourceContract(dashboard).toContain(
      "return <DashboardLoadingState />"
    );
    expectSourceContract(feedback).toContain('data-testid="dashboard-loading"');
    expectSourceContract(feedback).toContain('role="status"');
    expectSourceContract(feedback).toContain('aria-live="polite"');
    expectSourceContract(feedback).toContain('t("dashboard.loading.title"');
  });

  it("uses the existing persisted theme mechanism with an accessible dashboard shortcut", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const styles = read("client/src/index.css");

    expectSourceContract(dashboard).toContain("useTheme()");
    expectSourceContract(dashboard).toContain(
      'data-testid="dashboard-theme-toggle"'
    );
    expectSourceContract(dashboard).toContain("onClick={toggleTheme}");
    expectSourceContract(dashboard).toContain(
      'aria-pressed={theme === "dark"}'
    );
    expectSourceContract(styles).toContain(
      ".dark .dashboard-content .bg-white"
    );
    expectSourceContract(styles).toContain(
      ".dark .dashboard-content :is(.rr-text-navy"
    );
    expectSourceContract(styles).toContain(".bg-slate-50");
    expectSourceContract(styles).toContain(
      ".dark .dashboard-content input.bg-white"
    );
  });

  it("offers an accessible Settings appearance preference through the shared persisted theme context", () => {
    const settings = read("client/src/pages/Settings.tsx");
    const themeContext = read("client/src/contexts/ThemeContext.tsx");

    expectSourceContract(themeContext).toContain(
      'export type ThemePreference = "light" | "dark" | "system"'
    );
    expectSourceContract(themeContext).toContain(
      "setThemePreference?: (theme: ThemePreference) => void"
    );
    expectSourceContract(themeContext).toContain(
      'localStorage.setItem("theme", themePreference)'
    );
    expectSourceContract(themeContext).toContain(
      'matchMedia("(prefers-color-scheme: dark)")'
    );
    expectSourceContract(themeContext).toContain(
      'mediaQuery.addEventListener("change", syncSystemTheme)'
    );
    expectSourceContract(themeContext).toContain(
      "mediaQuery.addListener(syncSystemTheme)"
    );
    expectSourceContract(settings).toContain(
      'data-testid="settings-theme-preference"'
    );
    expectSourceContract(settings).toContain(
      "data-testid={`settings-theme-${option}`}"
    );
    expectSourceContract(settings).toContain('["light", "dark", "system"]');
    expectSourceContract(settings).toContain('role="radiogroup"');
    expectSourceContract(settings).toContain('role="radio"');
    expectSourceContract(settings).toContain("aria-checked={selected}");
    expectSourceContract(settings).toContain("setThemePreference(option)");
  });

  it("edits only the authenticated user business profile through the established profile upsert contract", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expectSourceContract(dashboard).toContain(
      'data-testid="dashboard-edit-profile"'
    );
    expectSourceContract(dashboard).toContain(
      "trpc.profile.upsert.useMutation"
    );
    expectSourceContract(dashboard).toContain("utils.profile.get.invalidate()");
    expectSourceContract(dashboard).toContain(
      'id="dashboard-profile-business-name"'
    );
    expectSourceContract(dashboard).toContain(
      'id="dashboard-profile-review-link"'
    );
    expectSourceContract(dashboard).toContain(
      'id="dashboard-profile-reply-to"'
    );
    expectSourceContract(dashboard).toContain(
      't("dashboard.profileEditor.saved"'
    );
    expectSourceContract(dashboard).toContain(
      "onError: showDashboardMutationError"
    );
  });

  it("routes dashboard mutation failures through one localized recovery message", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read(
      "client/src/components/dashboard/DashboardFeedbackExperience.tsx"
    );

    expectSourceContract(dashboard).toContain(
      "const showDashboardApiError = useDashboardApiErrorToast()"
    );
    expectSourceContract(feedback).toContain(
      't("apiRecovery.unavailableTitle"'
    );
    expect(
      dashboard.match(/onError: showDashboardMutationError/g)
    ).toHaveLength(3);
    expectSourceContract(dashboard).toContain("showDashboardApiError();");
    expect(dashboard).not.toContain("toast.error(err.message)");
  });

  it("adds a retry action only for recoverable dashboard query refreshes", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read(
      "client/src/components/dashboard/DashboardFeedbackExperience.tsx"
    );

    expectSourceContract(feedback).toContain(
      "type DashboardApiErrorToastOptions"
    );
    expectSourceContract(feedback).toContain("action: options.onRetry");
    expectSourceContract(feedback).toContain('t("apiRecovery.retry"');
    expectSourceContract(dashboard).toContain(
      "const retryDashboardData = useCallback"
    );
    expectSourceContract(dashboard).toContain(
      "hasRecoverableDashboardQueryError"
    );
    expect(dashboard).toMatch(
      /useRecoverableDashboardQueryError\s*\(\s*hasRecoverableDashboardQueryError\s*,\s*retryDashboardData\s*\)/
    );
    expectSourceContract(dashboard).toContain(
      'testRecoveryMode !== "mutation"'
    );
    expectSourceContract(dashboard).toContain(
      'data-testid="dashboard-page-mutation-error-trigger"'
    );
    expectSourceContract(dashboard).toContain("updateDashboardProfile.mutate");
    expectSourceContract(feedback).toContain("wasErroredRef");
    expectSourceContract(feedback).toContain(
      "if (wasErroredRef.current) return"
    );
    expect(dashboard).not.toContain(
      "onError: showDashboardApiError({ onRetry:"
    );
  });

  it("offers only safe API-error context in an accessible details dialog", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const feedback = read(
      "client/src/components/dashboard/DashboardFeedbackExperience.tsx"
    );

    expectSourceContract(dashboard).toContain(
      "<DashboardApiErrorFeedbackBoundary>"
    );
    expectSourceContract(feedback).toContain(
      'data-testid="dashboard-api-error-details"'
    );
    expectSourceContract(feedback).toContain('t("apiRecovery.viewDetails"');
    expectSourceContract(feedback).toContain("DashboardApiErrorDetails");
    expectSourceContract(feedback).toContain(
      "recoverable: Boolean(options.onRetry)"
    );
    expect(feedback).not.toContain("error.message");
    expect(feedback).not.toContain("stack");
  });

  it("exports an allowlisted account, business profile, and local preferences without secrets", () => {
    const settings = read("client/src/pages/Settings.tsx");
    const exportCard = settings.slice(
      settings.indexOf("function ProfilePreferencesExportCard"),
      settings.indexOf("export default function SettingsPage")
    );

    expectSourceContract(exportCard).toContain(
      'data-testid="settings-profile-data-export"'
    );
    expectSourceContract(exportCard).toContain(
      'data-testid="settings-profile-data-export-download"'
    );
    expectSourceContract(exportCard).toContain(
      'format: "get-phame-profile-preferences/v1"'
    );
    expectSourceContract(exportCard).toContain("themePreference");
    expectSourceContract(exportCard).toContain("hapticsEnabled");
    expectSourceContract(exportCard).toContain(
      "serializeProfilePreferencesCsv(payload)"
    );
    expect(exportCard).toMatch(
      /anchor\.download\s*=\s*buildProfilePreferencesExportFilename\s*\(\s*format\s*,\s*payload\.exportedAt\s*\)/s
    );
    expectSourceContract(exportCard).toContain(
      "recordExport.mutate({ format })"
    );
    expectSourceContract(exportCard).toContain(
      'data-testid="settings-profile-data-export-history"'
    );
    expectSourceContract(exportCard).toContain("URL.revokeObjectURL(url)");
    expectSourceContract(exportCard).toContain(
      "aria-busy={!account || recordExport.isPending}"
    );
    expect(exportCard).not.toContain("disabled={!account}");
    expectSourceContract(exportCard).toContain(
      "does not include passwords, mail credentials, API keys, payment details, customer records, or diagnostic history"
    );
    expect(exportCard).not.toContain("smtpPassword");
    expect(exportCard).not.toContain("bulkSenderSecret");
  });

  it("ships dashboard feedback copy in every locale and the offline PWA fallback", () => {
    const fallback = JSON.parse(
      readFileSync(
        `${projectRoot}client/src/lib/i18nCompleteFallbackResources.json`,
        "utf8"
      )
    ) as Record<
      string,
      {
        dashboard?: Record<string, Record<string, string>>;
        settings?: {
          appearance?: Record<string, string>;
          dataExport?: Record<string, string>;
        };
        theme?: Record<string, string>;
        apiRecovery?: {
          details?: Record<string, string>;
          viewDetails?: string;
        };
      }
    >;

    for (const locale of locales) {
      const catalog = JSON.parse(
        read(`client/public/locales/${locale}/translation.json`)
      ) as {
        dashboard?: Record<string, Record<string, string>>;
        settings?: {
          appearance?: Record<string, string>;
          dataExport?: Record<string, string>;
        };
        theme?: Record<string, string>;
        apiRecovery?: {
          details?: Record<string, string>;
          viewDetails?: string;
        };
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
      expect(catalog.settings?.appearance?.systemSaved).toBeTruthy();
      expect(catalog.settings?.dataExport?.title).toBeTruthy();
      expect(catalog.settings?.dataExport?.scope).toBeTruthy();
      expect(catalog.theme?.system).toBeTruthy();
      expect(catalog.apiRecovery?.viewDetails).toBeTruthy();
      expect(catalog.apiRecovery?.details?.title).toBeTruthy();
      expect(fallback[locale]?.settings?.appearance?.title).toBeTruthy();
      expect(fallback[locale]?.settings?.appearance?.saved).toBeTruthy();
      expect(fallback[locale]?.settings?.appearance?.systemSaved).toBeTruthy();
      expect(fallback[locale]?.settings?.dataExport?.title).toBeTruthy();
      expect(fallback[locale]?.theme?.system).toBeTruthy();
      expect(fallback[locale]?.apiRecovery?.details?.title).toBeTruthy();
    }
  });
});
