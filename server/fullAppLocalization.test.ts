import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SUPPORTED_NON_ENGLISH_LOCALES = ["es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

type ManifestEntry = {
  key: string;
  source: string;
  usages: Array<{ file: string; line: number }>;
};

describe("Full application localization coverage", () => {
  const manifest = JSON.parse(
    readProjectFile("../client/src/lib/autoTextManifest.json"),
  ) as ManifestEntry[];
  const translations = JSON.parse(
    readProjectFile("../client/src/lib/autoTextTranslations.json"),
  ) as Record<string, Record<string, string>>;

  it("provides a complete, non-empty translation for every audited static customer-facing string", () => {
    expect(manifest.length).toBeGreaterThan(1300);
    const keys = manifest.map((entry) => entry.key).sort();

    for (const locale of SUPPORTED_NON_ENGLISH_LOCALES) {
      const catalog = translations[locale];
      expect(catalog, `${locale} static-copy catalog is missing`).toBeTruthy();
      expect(Object.keys(catalog).sort(), `${locale} catalog key parity failure`).toEqual(keys);

      for (const entry of manifest) {
        const value = catalog[entry.key];
        expect(
          typeof value === "string" && value.trim().length > 0,
          `${locale} is missing a translation for ${entry.source}`,
        ).toBe(true);
      }
    }
  });

  it("covers the public, legal, product, support, administrative, and form surfaces identified by the audit", () => {
    const auditedFiles = new Set(manifest.flatMap((entry) => entry.usages.map((usage) => usage.file)));
    const requiredFileFragments = [
      "client/src/pages/PrivacyPolicy.tsx",
      "client/src/pages/TermsOfService.tsx",
      "client/src/pages/SecurityPolicy.tsx",
      "client/src/pages/DataUsage.tsx",
      "client/src/pages/Settings.tsx",
      "client/src/pages/SendRequest.tsx",
      "client/src/pages/SavedContacts.tsx",
      "client/src/pages/WooCustomers.tsx",
      "client/src/pages/EmailTemplates.tsx",
      "client/src/pages/AdminSupportInbox.tsx",
      "client/src/components/OnboardingWizard.tsx",
      "client/src/components/OnboardingGuide.tsx",
    ];

    for (const requiredFile of requiredFileFragments) {
      expect(auditedFiles.has(requiredFile), `Localization audit missed ${requiredFile}`).toBe(true);
    }
  });

  it("keeps the locale-reactive static-copy bridge mounted in the app shell", () => {
    const helperSource = readProjectFile("../client/src/lib/autoText.ts");
    const bridgeSource = readProjectFile("../client/src/components/AutoTextLocalizer.tsx");
    const appSource = readProjectFile("../client/src/App.tsx");

    expect(helperSource).toContain("export function localizeStaticText");
    expect(helperSource).toContain("localizeEmbeddedDates");
    expect(bridgeSource).toContain("new MutationObserver(schedule)");
    expect(bridgeSource).toContain('i18n.on("languageChanged", schedule)');
    expect(bridgeSource).toContain('i18n.on("loaded", schedule)');
    expect(appSource).toContain("<AutoTextLocalizer />");
  });

  it("anchors authenticated dashboard translations to the translation namespace in every locale", () => {
    const homeSource = readProjectFile("../client/src/pages/Home.tsx");
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");
    const bootstrapSource = readProjectFile("../client/src/main.tsx");

    expect((homeSource.match(/useTranslation\("translation"\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(i18nSource).toContain("export const i18nReady");
    expect(bootstrapSource).toContain("loadStaticLocalizationSupplement");
    expect(bootstrapSource).toContain("i18nReady.then(() => loadStaticLocalizationSupplement())");
    expect(homeSource).toContain('t("referralRewards.title")');
    expect(homeSource).toContain('t("referralRewards.shareMessage", { url: shareUrl })');
    expect(homeSource).not.toContain(">Referral Rewards<");
    expect(homeSource).not.toContain(">Free Months<");
    expect(homeSource).not.toContain('"Copy Link"');

    for (const locale of SUPPORTED_NON_ENGLISH_LOCALES) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`),
      ) as Record<string, unknown>;

      for (const group of ["homePage", "trackingSummaryCard", "shareReferralCard", "referralRewards"]) {
        expect(
          typeof catalog[group] === "object" && catalog[group] !== null,
          `${locale} is missing the ${group} dashboard translation group`,
        ).toBe(true);
      }

      const referralRewards = catalog.referralRewards as Record<string, unknown>;
      for (const key of [
        "title",
        "subtitle",
        "joined",
        "converted",
        "freeMonths",
        "message",
        "copyLink",
        "shareMessage",
        "noReferralsHint",
        "pendingReferralsHint",
        "pendingReferralsHint_plural",
        "rewardProcessingHint",
      ]) {
        expect(
          typeof referralRewards[key] === "string" && referralRewards[key].trim().length > 0,
          `${locale}.referralRewards.${key} must be populated`,
        ).toBe(true);
      }
    }
  });

  it("loads the static-copy supplement before render and localizes native-share payloads outside the DOM bridge", () => {
    const helperSource = readProjectFile("../client/src/lib/autoText.ts");
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");
    const onboardingSource = readProjectFile("../client/src/components/OnboardingWizard.tsx");
    const paymentSuccessSource = readProjectFile("../client/src/pages/PaymentSuccess.tsx");
    const pwaPromptSource = readProjectFile("../client/src/components/PWAInstallPrompt.tsx");
    const pwaShareSource = readProjectFile("../client/src/lib/pwaShare.ts");

    for (const locale of SUPPORTED_NON_ENGLISH_LOCALES) {
      expect(helperSource).toContain(`getphame-static-copy-${locale}-phame29-static-copy`);
    }
    expect(helperSource).toContain("export function loadStaticLocalizationSupplement");
    expect(helperSource).toContain("mergeStaticCopySupplement");
    expect(helperSource).toContain("loadedStaticCopyLocales");
    expect(i18nSource).toContain("Promise.all([i18n.loadLanguages(lang), prepareStaticCopyLocale(lang)])");
    expect(onboardingSource).toContain('from "@/components/ui/tooltip"');
    expect(onboardingSource).toContain("onboardingWizard.tooltips.smtpPassword.text");
    expect(onboardingSource).toContain("onboardingWizard.tooltips.reviewUrl.text");
    expect(onboardingSource).toContain("onboardingWizard.tooltips.firstRequest.text");
    expect(paymentSuccessSource).toContain("const PERKS_BY_TIER");
    expect(pwaPromptSource).toContain('const { at } = await import("@/lib/autoText")');
    expect(pwaPromptSource).toContain("localizedShareText = at(localizedShareText)");
    expect(pwaShareSource).toContain("export async function getLocalizedGetPhameShareData");
    expect(pwaShareSource).toContain('const { at } = await import("./autoText")');
    expect(pwaShareSource).toContain("await navigator.share(await getLocalizedGetPhameShareData())");
  });
});
