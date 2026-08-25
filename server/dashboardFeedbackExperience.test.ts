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

    expect(dashboard).toContain('data-testid="dashboard-loading"');
    expect(dashboard).toContain('role="status"');
    expect(dashboard).toContain('aria-live="polite"');
    expect(dashboard).toContain('t("dashboard.loading.title"');
  });

  it("routes dashboard mutation failures through one localized recovery message", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expect(dashboard).toContain("const showDashboardApiError = () =>");
    expect(dashboard).toContain('t("apiRecovery.unavailableTitle"');
    expect(dashboard.match(/onError: showDashboardApiError/g)).toHaveLength(2);
    expect(dashboard).toContain("showDashboardApiError();");
    expect(dashboard).not.toContain("toast.error(err.message)");
  });

  it("ships dashboard feedback copy in every locale and the offline PWA fallback", () => {
    const fallback = JSON.parse(
      readFileSync(`${projectRoot}client/src/lib/i18nCompleteFallbackResources.json`, "utf8")
    ) as Record<string, { dashboard?: Record<string, Record<string, string>> }>;

    for (const locale of locales) {
      const catalog = JSON.parse(
        read(`client/public/locales/${locale}/translation.json`)
      ) as { dashboard?: Record<string, Record<string, string>> };
      const dashboard = catalog.dashboard;
      const offlineDashboard = fallback[locale]?.dashboard;

      expect(dashboard?.shareProfile?.button).toBeTruthy();
      expect(dashboard?.shareProfile?.copySuccess).toBeTruthy();
      expect(dashboard?.shareProfile?.copyError).toBeTruthy();
      expect(dashboard?.loading?.title).toBeTruthy();
      expect(offlineDashboard?.shareProfile?.button).toBeTruthy();
      expect(offlineDashboard?.loading?.title).toBeTruthy();
    }
  });
});
