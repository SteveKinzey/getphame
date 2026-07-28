import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesRoot = path.join(projectRoot, "client/public/locales");

const auditedPaths = {
  es: ["bulkSendDialog.dailyLimitStatus", "bulkSendDialog.sendButton", "callToAction.appleSignInButton", "callToAction.googleSignInButton", "cancelConfirm.cancelReminder", "columnLabels.phoneOptional", "comparison.sectionSubtitle", "comparisonTable.price", "comparisonTable.savedContacts", "inlineFromNameEdit.senderName", "inlineFromNameEdit.successToast", "mainForm.pageTitle", "profile.addBusinessNameAndLink", "smtp.emailNotConnectedDesc", "smtp.testConnection", "successScreen.requestSent", "comparisonTable.csvImport", "comparisonTable.woocommerceSync", "contactList.importCsv", "contactList.importPrompt", "header.backToContacts", "mainForm.emailTemplateLabel", "sendDialog.send", "sendHistoryDrawer.sendReminderNow", "successScreen.requestsSentMilestone"],
  fr: ["accessCode.description", "bulkSendDialog.dailyLimitStatus", "bulkSendDialog.sendButton", "cancelConfirm.cancelReminder", "comparisonTable.savedContacts", "defaultTemplate.body.0", "defaultTemplate.body.1", "defaultTemplate.body.2", "defaultTemplate.body.4", "defaultTemplate.body.5", "defaultTemplate.subject", "inlineFromNameEdit.senderName", "inlineFromNameEdit.successToast", "page.freeLimitReachedDesc", "paidUser.enjoyFeatures", "profile.reviewLink", "smtp.emailNotConnectedDesc", "bulkSendDialog.yelpWarning", "comparison.sectionSubtitle", "contactList.importPrompt", "dashboard.bulkActions.markReviewed", "dashboard.bulkActions.markSent", "dashboard.bulkActions.selectedCount", "infoBanner.description", "onboardingWizard.header.title", "onboardingWizard.navigation.nextStep", "onboardingWizard.stepContent.step1.title", "onboardingWizard.stepContent.step2.description", "onboardingWizard.stepContent.step3.description", "profile.saveProfile", "smtp.description", "smtp.disconnectSuccess", "wooCommerce.description", "bulkSendDialog.complianceChecklistTitle", "bulkSendDialog.defaultPlatformWithName", "callToAction.appleSignInButton", "callToAction.googleSignInButton", "columnLabels.phoneOptional", "comparisonTable.price", "dashboard.emailPerformance.title", "paidUser.lifetimeLicense", "smtp.passwordPlaceholderGmail", "tools.savedContacts"],
  it: ["deleteAccount.title", "demo.emailAlt", "demo.emailCaption", "demo.gifAlt", "demo.gifCaption", "faq.a10", "faq.a5", "faq.a7", "faq.a8", "page.title", "trust.dataPrivacy", "trust.emailProviders", "trust.encryptedPassword", "trust.unsubscribe", "faq.q10", "faq.q11", "faq.q5", "faq.q6", "faq.q7", "faq.q8", "faq.q9"],
  th: ["demo.emailAlt", "demo.emailCaption", "demo.gifAlt", "demo.gifCaption", "demo.sectionTitle", "faq.a11", "faq.a5", "trust.dataPrivacy", "trust.emailProviders", "trust.encryptedPassword", "trust.unsubscribe", "faq.q10", "faq.q11"],
  "zh-CN": [],
  "zh-TW": ["deleteAccount.buttonText", "deleteAccount.confirmButton", "deleteAccount.confirmation", "deleteAccount.successToast", "deleteAccount.title", "deleteConfirm.description", "deleteDialog.description"],
} as const;

type JsonRecord = Record<string, unknown>;

function readJson(filePath: string): JsonRecord {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonRecord;
}

function getPath(root: unknown, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (Array.isArray(value)) return value[Number(segment)];
    return (value as JsonRecord)[segment];
  }, root);
}

function protectedTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return (value.match(/{{\s*[^{}]+\s*}}|\*\*|https?:\/\/\S+|\b(?:Get Phame|GET PHAME|SMTP|WooCommerce|Stripe|Google|Yelp|TripAdvisor|Facebook|Bing|Gmail|Outlook|Yahoo|CSV|API)\b/g) ?? []).sort();
}

describe("native-quality localization audit", () => {
  const english = readJson(path.join(localesRoot, "en/translation.json"));
  const fallback = readJson(path.join(projectRoot, "client/src/lib/i18nCompleteFallbackResources.json"));

  it("keeps all three-stage-approved corrections synchronized with runtime fallbacks", () => {
    let verified = 0;

    for (const [locale, keyPaths] of Object.entries(auditedPaths)) {
      const catalog = readJson(path.join(localesRoot, locale, "translation.json"));
      const localeFallback = fallback[locale] as JsonRecord;

      for (const keyPath of keyPaths) {
        const maintainedValue = getPath(catalog, keyPath);
        expect(getPath(localeFallback, keyPath), `${locale}:${keyPath}`).toBe(maintainedValue);
        expect(protectedTokens(maintainedValue), `${locale}:${keyPath} protected tokens`).toEqual(
          protectedTokens(getPath(english, keyPath)),
        );
        verified += 1;
      }
    }

    expect(verified).toBe(109);
  });

  it("preserves natural Thai security, WooCommerce, trust, and demo terminology", () => {
    const thai = readJson(path.join(localesRoot, "th/translation.json"));

    expect(getPath(thai, "faq.a11")).toContain("API key");
    expect(getPath(thai, "faq.a5")).toContain("เข้ารหัสขณะเก็บข้อมูล");
    expect(getPath(thai, "trust.dataPrivacy")).toBe("รายชื่อลูกค้าของคุณถูกเก็บเป็นส่วนตัว");
    expect(getPath(thai, "demo.sectionTitle")).toBe("ดูการใช้งานจริง");
  });

  it("uses Taiwan-appropriate deletion terminology without changing zh-CN", () => {
    const simplified = readJson(path.join(localesRoot, "zh-CN/translation.json"));
    const traditional = readJson(path.join(localesRoot, "zh-TW/translation.json"));

    expect(getPath(traditional, "deleteAccount.buttonText")).toBe("刪除帳戶");
    expect(getPath(traditional, "deleteConfirm.description")).toContain("撤銷");
    expect(getPath(simplified, "deleteAccount.buttonText")).not.toBe("刪除帳戶");
  });

  it("advances the locale dictionary cache for the audited translations", () => {
    const i18nSource = fs.readFileSync(path.join(projectRoot, "client/src/lib/i18n.ts"), "utf8");
    expect(i18nSource).toContain("{{ns}}.json?v=phame40");
  });
});
