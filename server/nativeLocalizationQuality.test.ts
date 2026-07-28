import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesRoot = path.join(projectRoot, "client/public/locales");
const completenessRoot = path.join(projectRoot, "client/src/lib/i18nCompleteness");

const localeCodes = ["es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const namespaces = ["translation", "landing", "cancellation"] as const;

const auditedPaths = {
  es: ["bulkSendDialog.dailyLimitStatus", "bulkSendDialog.sendButton", "callToAction.appleSignInButton", "callToAction.googleSignInButton", "cancelConfirm.cancelReminder", "columnLabels.phoneOptional", "comparison.sectionSubtitle", "comparisonTable.price", "comparisonTable.savedContacts", "inlineFromNameEdit.senderName", "inlineFromNameEdit.successToast", "mainForm.pageTitle", "profile.addBusinessNameAndLink", "smtp.emailNotConnectedDesc", "smtp.testConnection", "successScreen.requestSent", "comparisonTable.csvImport", "comparisonTable.woocommerceSync", "contactList.importCsv", "contactList.importPrompt", "header.backToContacts", "mainForm.emailTemplateLabel", "sendDialog.send", "sendHistoryDrawer.sendReminderNow", "successScreen.requestsSentMilestone"],
  fr: ["accessCode.description", "bulkSendDialog.dailyLimitStatus", "bulkSendDialog.sendButton", "cancelConfirm.cancelReminder", "comparisonTable.savedContacts", "defaultTemplate.body.0", "defaultTemplate.body.1", "defaultTemplate.body.2", "defaultTemplate.body.4", "defaultTemplate.body.5", "defaultTemplate.subject", "inlineFromNameEdit.senderName", "inlineFromNameEdit.successToast", "page.freeLimitReachedDesc", "paidUser.enjoyFeatures", "profile.reviewLink", "smtp.emailNotConnectedDesc", "bulkSendDialog.yelpWarning", "comparison.sectionSubtitle", "contactList.importPrompt", "dashboard.bulkActions.markReviewed", "dashboard.bulkActions.markSent", "dashboard.bulkActions.selectedCount", "infoBanner.description", "onboardingWizard.header.title", "onboardingWizard.navigation.nextStep", "onboardingWizard.stepContent.step1.title", "onboardingWizard.stepContent.step2.description", "onboardingWizard.stepContent.step3.description", "profile.saveProfile", "smtp.description", "smtp.disconnectSuccess", "wooCommerce.description", "bulkSendDialog.complianceChecklistTitle", "bulkSendDialog.defaultPlatformWithName", "callToAction.appleSignInButton", "callToAction.googleSignInButton", "columnLabels.phoneOptional", "comparisonTable.price", "dashboard.emailPerformance.title", "paidUser.lifetimeLicense", "smtp.passwordPlaceholderGmail", "tools.savedContacts"],
  it: ["deleteAccount.title", "demo.emailAlt", "demo.emailCaption", "demo.gifAlt", "demo.gifCaption", "faq.a10", "faq.a5", "faq.a7", "faq.a8", "page.title", "trust.dataPrivacy", "trust.emailProviders", "trust.encryptedPassword", "trust.unsubscribe", "faq.q10", "faq.q11", "faq.q5", "faq.q6", "faq.q7", "faq.q8", "faq.q9"],
  th: ["demo.emailAlt", "demo.emailCaption", "demo.gifAlt", "demo.gifCaption", "demo.sectionTitle", "faq.a11", "faq.a5", "trust.dataPrivacy", "trust.emailProviders", "trust.encryptedPassword", "trust.unsubscribe", "faq.q10", "faq.q11"],
  "zh-CN": [],
  "zh-TW": ["deleteAccount.buttonText", "deleteAccount.confirmButton", "deleteAccount.confirmation", "deleteAccount.successToast", "deleteAccount.title", "deleteConfirm.description", "deleteDialog.description"],
} as const;

type JsonRecord = Record<string, unknown>;
type Namespace = (typeof namespaces)[number];
type LocaleCode = (typeof localeCodes)[number];
type AuditManifest = {
  locale: LocaleCode;
  audit: string;
  sourceCandidateCount: number;
  translatedCount: number;
  exceptionCount: number;
  minimumTranslationConfidence: number;
  translatedEntryFormat: string;
  exceptionEntryFormat: string;
  categoryDefinitions: Record<string, string>;
  translatedEntries: string[];
  exceptions: string[];
};

function readJson(filePath: string): JsonRecord {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonRecord;
}

function readManifest(locale: LocaleCode): AuditManifest {
  return JSON.parse(
    fs.readFileSync(path.join(completenessRoot, `${locale}.exceptions.json`), "utf8"),
  ) as AuditManifest;
}

function getPath(root: unknown, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (Array.isArray(value)) return value[Number(segment)];
    return (value as JsonRecord)[segment];
  }, root);
}

function flattenStrings(value: unknown, prefix = ""): Map<string, string> {
  const rows = new Map<string, string>();
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      const childPrefix = prefix ? `${prefix}.${index}` : String(index);
      for (const [key, text] of flattenStrings(child, childPrefix)) rows.set(key, text);
    });
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as JsonRecord)) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      for (const [childKey, text] of flattenStrings(child, childPrefix)) rows.set(childKey, text);
    }
  } else if (typeof value === "string") {
    rows.set(prefix, value);
  }
  return rows;
}

function hasEnglishWords(value: string): boolean {
  const stripped = value.replace(/https?:\/\/\S+|{{[^}]+}}|{[^}]+}|<[^>]+>/g, " ");
  return /\b[A-Za-z]{2,}\b/.test(stripped);
}

function protectedTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.match(/{{\s*[^{}]+\s*}}|\*\*|https?:\/\/\S+|\b(?:Get Phame|GET PHAME|SMTP|WooCommerce|Stripe|Google|Yelp|TripAdvisor|Facebook|Bing|Gmail|Outlook|Yahoo|CSV|API)\b/g) ?? [])].sort();
}

function parseIdentity(entry: string): { namespace: Namespace; key: string } {
  const separator = entry.indexOf(":");
  expect(separator, `invalid audit identity: ${entry}`).toBeGreaterThan(0);
  const namespace = entry.slice(0, separator) as Namespace;
  expect(namespaces).toContain(namespace);
  return { namespace, key: entry.slice(separator + 1) };
}

function exceptionIdentity(entry: string): string {
  return entry.slice(0, entry.lastIndexOf("|"));
}

function catalog(locale: string, namespace: Namespace): JsonRecord {
  return readJson(path.join(localesRoot, locale, `${namespace}.json`));
}

describe("native-quality localization audit", () => {
  const englishTranslation = catalog("en", "translation");
  const fallback = readJson(path.join(projectRoot, "client/src/lib/i18nCompleteFallbackResources.json"));

  it("keeps all three-stage-approved native-quality corrections synchronized with runtime fallbacks", () => {
    let verified = 0;

    for (const [locale, keyPaths] of Object.entries(auditedPaths)) {
      const maintainedCatalog = catalog(locale, "translation");
      const localeFallback = fallback[locale] as JsonRecord;

      for (const keyPath of keyPaths) {
        const maintainedValue = getPath(maintainedCatalog, keyPath);
        expect(getPath(localeFallback, keyPath), `${locale}:${keyPath}`).toBe(maintainedValue);
        expect(protectedTokens(maintainedValue), `${locale}:${keyPath} protected tokens`).toEqual(
          protectedTokens(getPath(englishTranslation, keyPath)),
        );
        verified += 1;
      }
    }

    expect(verified).toBe(109);
  });

  it("accounts for all 573 independently reviewed English-identical candidates", () => {
    let totalCandidates = 0;
    let totalTranslations = 0;
    let totalExceptions = 0;

    for (const locale of localeCodes) {
      const manifest = readManifest(locale);
      const localeFallback = fallback[locale] as JsonRecord;

      expect(manifest.locale).toBe(locale);
      expect(manifest.audit).toBe("Exhaustive English-identical customer-copy review");
      expect(manifest.minimumTranslationConfidence).toBe(0.95);
      expect(manifest.translatedEntries).toHaveLength(manifest.translatedCount);
      expect(manifest.exceptions).toHaveLength(manifest.exceptionCount);
      expect(manifest.sourceCandidateCount).toBe(manifest.translatedCount + manifest.exceptionCount);

      const translatedSet = new Set(manifest.translatedEntries);
      const exceptionSet = new Set(manifest.exceptions.map(exceptionIdentity));
      expect(translatedSet.size).toBe(manifest.translatedCount);
      expect(exceptionSet.size).toBe(manifest.exceptionCount);
      expect([...translatedSet].filter((entry) => exceptionSet.has(entry))).toEqual([]);

      const liveEnglishIdentical = new Set<string>();
      for (const namespace of namespaces) {
        const englishCatalog = catalog("en", namespace);
        const maintainedCatalog = catalog(locale, namespace);
        const englishRows = flattenStrings(englishCatalog);
        const maintainedRows = flattenStrings(maintainedCatalog);

        for (const [key, maintainedValue] of maintainedRows) {
          const sourceValue = englishRows.get(key);
          if (sourceValue && sourceValue === maintainedValue && hasEnglishWords(sourceValue)) {
            liveEnglishIdentical.add(`${namespace}:${key}`);
          }
        }
      }

      expect(
        [...liveEnglishIdentical].sort(),
        `${locale} live English-identical values must be documented exceptions`,
      ).toEqual([...exceptionSet].sort());

      for (const entry of manifest.translatedEntries) {
        const { namespace, key } = parseIdentity(entry);
        const sourceValue = getPath(catalog("en", namespace), key);
        const maintainedValue = getPath(catalog(locale, namespace), key);
        const fallbackValue = getPath(localeFallback, key);

        expect(maintainedValue, `${locale}:${entry} must be translated`).not.toBe(sourceValue);
        expect(fallbackValue, `${locale}:${entry} fallback parity`).toBe(maintainedValue);
        expect(protectedTokens(maintainedValue), `${locale}:${entry} protected tokens`).toEqual(
          protectedTokens(sourceValue),
        );
      }

      for (const entry of manifest.exceptions) {
        const delimiter = entry.lastIndexOf("|");
        const identity = entry.slice(0, delimiter);
        const category = entry.slice(delimiter + 1);
        const { namespace, key } = parseIdentity(identity);
        const sourceValue = getPath(catalog("en", namespace), key);
        const maintainedValue = getPath(catalog(locale, namespace), key);

        expect(manifest.categoryDefinitions[category], `${locale}:${identity} category`).toBeTruthy();
        expect(maintainedValue, `${locale}:${identity} documented retention`).toBe(sourceValue);
        expect(protectedTokens(maintainedValue), `${locale}:${identity} protected tokens`).toEqual(
          protectedTokens(sourceValue),
        );
      }

      totalCandidates += manifest.sourceCandidateCount;
      totalTranslations += manifest.translatedCount;
      totalExceptions += manifest.exceptionCount;
    }

    expect(totalCandidates).toBe(573);
    expect(totalTranslations).toBe(349);
    expect(totalExceptions).toBe(224);
  });

  it("preserves natural Thai grammar across the partner-priority FAQ block", () => {
    const thai = catalog("th", "translation");
    const thaiFallback = fallback.th as JsonRecord;

    for (const keyPath of ["faq.q5", "faq.a5", "faq.q6", "faq.a6", "faq.q7", "faq.a7", "faq.q8", "faq.a8", "faq.q9", "faq.a9"]) {
      const value = getPath(thai, keyPath);
      expect(value, keyPath).toMatch(/[ก-๙]/);
      expect(getPath(thaiFallback, keyPath), `${keyPath} fallback parity`).toBe(value);
    }

    expect(getPath(thai, "faq.q5")).toContain("Get Phame");
    expect(getPath(thai, "faq.a5")).toContain("เข้ารหัสขณะเก็บข้อมูล");
    expect(getPath(thai, "faq.a9")).toContain("SMTP");
    expect(getPath(thai, "adminUsers.life")).toBe("ตลอดชีพ");
  });

  it("uses the verified lifetime-access meaning in every supported non-English locale", () => {
    const expected = {
      es: "Vitalicio",
      fr: "À vie",
      it: "A vita",
      th: "ตลอดชีพ",
      "zh-CN": "终身",
      "zh-TW": "終身",
    } as const;

    for (const locale of localeCodes) {
      expect(getPath(catalog(locale, "translation"), "adminUsers.life"), locale).toBe(expected[locale]);
      expect(getPath(fallback[locale], "adminUsers.life"), `${locale} fallback`).toBe(expected[locale]);
    }
  });

  it("uses Taiwan-appropriate deletion terminology without changing zh-CN", () => {
    const simplified = catalog("zh-CN", "translation");
    const traditional = catalog("zh-TW", "translation");

    expect(getPath(traditional, "deleteAccount.buttonText")).toBe("刪除帳戶");
    expect(getPath(traditional, "deleteConfirm.description")).toContain("撤銷");
    expect(getPath(simplified, "deleteAccount.buttonText")).not.toBe("刪除帳戶");
  });

  it("advances the HTTP and offline locale caches for the exhaustive audit", () => {
    const i18nSource = fs.readFileSync(path.join(projectRoot, "client/src/lib/i18n.ts"), "utf8");
    const serviceWorker = fs.readFileSync(path.join(projectRoot, "client/public/sw.js"), "utf8");
    expect(i18nSource).toContain("{{ns}}.json?v=phame41");
    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v23'");
  });
});
