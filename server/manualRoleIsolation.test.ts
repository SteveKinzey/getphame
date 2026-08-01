import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getManualDocument,
  normalizeManualLocale,
} from "../client/src/content/manuals/registry";
import type {
  ManualDocument,
  ManualRole,
} from "../client/src/content/manuals/types";

const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;

const ADMIN_SKILL_SECTION_ID = "admin-security-audit-release-verification";
const ADMIN_SKILL_TOPIC_IDS = [
  "security-audit-skill-capabilities",
  "security-audit-skill-instructions",
] as const;
const USER_SECURITY_SECTION_ID = "security-privacy-and-compliance";
const USER_SECURITY_TOPIC_IDS = [
  "how-get-phame-protects-data",
  "privacy-choices-and-requests",
  "report-security-concern",
] as const;
const ADMIN_SECURITY_SECTION_ID = "admin-security-and-data-protection";
const ADMIN_SECURITY_TOPIC_IDS = [
  "security-claims",
  "least-privilege-data-handling",
  "security-incident-response",
  "privacy-request-operations",
  "security-release-verification",
] as const;

const MANUAL_UI_KEYS = [
  "nav.userManual",
  "nav.adminManual",
  "manual.badges.paid",
  "manual.badges.admin",
  "manual.badges.all",
  "manual.stepsLabel",
  "manual.noteLabel",
  "manual.openFeature",
  "manual.sectionCount",
  "manual.adminSectionCount",
  "manual.paidTopicCount",
  "manual.searchPlaceholder",
  "manual.searchLabel",
  "manual.searchResults",
  "manual.lastUpdated",
  "manual.sectionNavigation",
  "manual.inThisManual",
  "manual.noResultsTitle",
  "manual.noResultsBody",
  "manual.clearSearch",
] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readProjectFile(relativePath)) as T;
}

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function readManual(role: ManualRole, locale: string): ManualDocument {
  return readJson<ManualDocument>(
    `../client/src/content/manuals/${role}/${locale}.json`
  );
}

function topicIds(document: ManualDocument, access?: "all" | "paid" | "admin") {
  return document.sections.flatMap(section =>
    section.topics
      .filter(topic => !access || topic.access === access)
      .map(topic => topic.id)
  );
}

describe("role-aware Get Phame manuals", () => {
  it("normalizes every supported locale and keeps deterministic English fallback behavior", () => {
    expect(normalizeManualLocale("en-US")).toBe("en");
    expect(normalizeManualLocale("es-MX")).toBe("es");
    expect(normalizeManualLocale("fr_CA")).toBe("fr");
    expect(normalizeManualLocale("it-IT")).toBe("it");
    expect(normalizeManualLocale("th-TH")).toBe("th");
    expect(normalizeManualLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(normalizeManualLocale("zh-Hant-TW")).toBe("zh-TW");
    expect(normalizeManualLocale("ja-JP")).toBe("ja");
    expect(getManualDocument("ja-JP", "user").title).toBe(
      readManual("user", "en").title
    );
  });

  it("gives users only user guidance and administrators one composed superset in all seven locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const authoredUserManual = readManual("user", locale);
      const authoredAdminSupplement = readManual("admin", locale);
      const userManual = getManualDocument(locale, "user");
      const adminManual = getManualDocument(locale, "admin");

      expect(userManual.title, `${locale} user title`).toBe(
        authoredUserManual.title
      );
      expect(userManual.sections, `${locale} user sections`).toEqual(
        authoredUserManual.sections
      );
      expect(
        userManual.sections.some(
          section =>
            section.access === "admin" ||
            section.topics.some(topic => topic.access === "admin")
        ),
        `${locale} user manual leaked administrator guidance`
      ).toBe(false);

      expect(adminManual.title, `${locale} admin title`).toBe(
        authoredAdminSupplement.title
      );
      expect(adminManual.sections, `${locale} admin superset`).toEqual([
        ...authoredUserManual.sections,
        ...authoredAdminSupplement.sections,
      ]);
      expect(
        adminManual.sections.slice(0, authoredUserManual.sections.length)
      ).toEqual(authoredUserManual.sections);
      expect(
        authoredAdminSupplement.sections.length,
        `${locale} admin section count`
      ).toBeGreaterThan(0);
      expect(
        authoredAdminSupplement.sections.every(
          section =>
            section.access === "admin" &&
            section.topics.every(topic => topic.access === "admin")
        ),
        `${locale} admin supplement contains guidance without an administrator-only label`
      ).toBe(true);
    }
  });

  it("keeps the installed security-audit skill summary and instructions exclusively in every localized Admin Manual", () => {
    const englishAdmin = readManual("admin", "en");
    const englishSection = englishAdmin.sections.find(
      section => section.id === ADMIN_SKILL_SECTION_ID
    );

    expect(englishSection).toBeDefined();
    if (!englishSection)
      throw new Error("English administrator skill section is missing");

    for (const locale of SUPPORTED_LOCALES) {
      const authoredUserManual = readManual("user", locale);
      const authoredAdminSupplement = readManual("admin", locale);
      const userManual = getManualDocument(locale, "user");
      const adminManual = getManualDocument(locale, "admin");
      const section = authoredAdminSupplement.sections.find(
        candidate => candidate.id === ADMIN_SKILL_SECTION_ID
      );

      expect(
        authoredAdminSupplement.version,
        `${locale} admin manual version`
      ).toBe(3);
      expect(
        authoredAdminSupplement.lastUpdated,
        `${locale} admin manual update date`
      ).toBe("2026-08-01");
      expect(section, `${locale} administrator skill section`).toBeDefined();
      if (!section)
        throw new Error(`${locale} administrator skill section is missing`);

      expect(section.access, `${locale} section access`).toBe("admin");
      expect(
        section.topics.map(topic => topic.id),
        `${locale} administrator skill topic structure`
      ).toEqual(ADMIN_SKILL_TOPIC_IDS);
      expect(
        section.topics.every(topic => topic.access === "admin"),
        `${locale} administrator skill topic access`
      ).toBe(true);
      expect(
        section.topics[0]?.steps,
        `${locale} capability steps`
      ).toHaveLength(4);
      expect(
        section.topics[1]?.steps,
        `${locale} instruction steps`
      ).toHaveLength(10);
      expect(
        section.topics[1]?.notes,
        `${locale} instruction safeguards`
      ).toHaveLength(2);

      expect(
        authoredUserManual.sections.some(
          candidate => candidate.id === ADMIN_SKILL_SECTION_ID
        ),
        `${locale} authored user manual leaked the administrator skill section`
      ).toBe(false);
      expect(
        userManual.sections.some(
          candidate => candidate.id === ADMIN_SKILL_SECTION_ID
        ),
        `${locale} composed user manual leaked the administrator skill section`
      ).toBe(false);
      expect(
        adminManual.sections.some(
          candidate => candidate.id === ADMIN_SKILL_SECTION_ID
        ),
        `${locale} composed Admin Manual omitted the administrator skill section`
      ).toBe(true);

      if (locale !== "en") {
        expect(section.title, `${locale} localized section title`).not.toBe(
          englishSection.title
        );
        expect(
          section.topics[0]?.body,
          `${locale} localized capability body`
        ).not.toBe(englishSection.topics[0]?.body);
        expect(
          section.topics[1]?.body,
          `${locale} localized instructions body`
        ).not.toBe(englishSection.topics[1]?.body);
      }
    }
  });

  it("adds verified, localized safeguards and privacy guidance to every User Manual", () => {
    const englishManual = readManual("user", "en");
    const englishSection = englishManual.sections.find(
      section => section.id === USER_SECURITY_SECTION_ID
    );

    expect(englishSection).toBeDefined();
    if (!englishSection)
      throw new Error("English user security section is missing");

    const englishProtection = englishSection.topics.find(
      topic => topic.id === "how-get-phame-protects-data"
    );
    expect(englishProtection?.body).toContain("does not sell, rent, or trade");
    expect(englishProtection?.body).toContain("does not read Gmail messages");
    expect(englishProtection?.notes?.join(" ")).toContain(
      "not the same as end-to-end encryption"
    );

    for (const locale of SUPPORTED_LOCALES) {
      const manual = readManual("user", locale);
      const section = manual.sections.find(
        candidate => candidate.id === USER_SECURITY_SECTION_ID
      );

      expect(manual.version, `${locale} user manual version`).toBe(2);
      expect(manual.lastUpdated, `${locale} user manual update date`).toBe(
        "2026-08-01"
      );
      expect(section, `${locale} user security section`).toBeDefined();
      if (!section)
        throw new Error(`${locale} user security section is missing`);

      const sectionTopicIds = section.topics.map(topic => topic.id);
      for (const topicId of USER_SECURITY_TOPIC_IDS) {
        expect(sectionTopicIds, `${locale} user security topics`).toContain(
          topicId
        );
        const topic = section.topics.find(
          candidate => candidate.id === topicId
        );
        expect(topic?.access, `${locale} ${topicId} access`).toBe("all");
        expect(topic?.steps, `${locale} ${topicId} steps`).toHaveLength(4);

        if (locale !== "en") {
          const englishTopic = englishSection.topics.find(
            candidate => candidate.id === topicId
          );
          expect(topic?.title, `${locale} ${topicId} title`).not.toBe(
            englishTopic?.title
          );
          expect(topic?.body, `${locale} ${topicId} body`).not.toBe(
            englishTopic?.body
          );
        }
      }
    }
  });

  it("keeps detailed security operations localized and administrator-only", () => {
    const englishAdmin = readManual("admin", "en");
    const englishSection = englishAdmin.sections.find(
      section => section.id === ADMIN_SECURITY_SECTION_ID
    );

    expect(englishSection).toBeDefined();
    if (!englishSection)
      throw new Error("English admin security section is missing");

    const englishClaims = englishSection.topics.find(
      topic => topic.id === "security-claims"
    );
    expect(englishClaims?.body).toContain(
      "Do not call Get Phame end-to-end encrypted"
    );
    expect(englishClaims?.body).toContain("production dependency checks");

    for (const locale of SUPPORTED_LOCALES) {
      const userManual = readManual("user", locale);
      const adminSupplement = readManual("admin", locale);
      const section = adminSupplement.sections.find(
        candidate => candidate.id === ADMIN_SECURITY_SECTION_ID
      );

      expect(section, `${locale} admin security section`).toBeDefined();
      if (!section)
        throw new Error(`${locale} admin security section is missing`);

      expect(section.access, `${locale} admin security access`).toBe("admin");
      expect(
        section.topics.map(topic => topic.id),
        `${locale} admin security topic structure`
      ).toEqual(ADMIN_SECURITY_TOPIC_IDS);
      expect(
        section.topics.every(
          topic => topic.access === "admin" && topic.steps.length === 4
        ),
        `${locale} admin security topic controls`
      ).toBe(true);
      expect(
        userManual.sections.some(
          candidate => candidate.id === ADMIN_SECURITY_SECTION_ID
        ),
        `${locale} User Manual leaked administrator security operations`
      ).toBe(false);

      if (locale !== "en") {
        expect(section.title, `${locale} admin security title`).not.toBe(
          englishSection.title
        );
        expect(
          section.topics[0]?.body,
          `${locale} admin security body`
        ).not.toBe(englishSection.topics[0]?.body);
      }
    }
  });

  it("preserves identical entitlement labels and explicitly marks every subscription-only topic", () => {
    const english = readManual("user", "en");
    const englishAllIds = topicIds(english);
    const englishPaidIds = topicIds(english, "paid");

    expect(englishPaidIds.length).toBeGreaterThan(0);
    expect(topicIds(english, "all").length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const manual = readManual("user", locale);
      expect(topicIds(manual), `${locale} topic structure`).toEqual(
        englishAllIds
      );
      expect(topicIds(manual, "paid"), `${locale} paid-topic labels`).toEqual(
        englishPaidIds
      );
      expect(
        manual.sections
          .flatMap(section => section.topics)
          .every(topic => topic.access === "all" || topic.access === "paid"),
        `${locale} user manual contains an invalid access state`
      ).toBe(true);
    }
  });

  it("uses one authenticated route and derives one mutually exclusive role label", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const appLayout = readProjectFile("../client/src/components/AppLayout.tsx");
    const bottomNav = readProjectFile("../client/src/components/BottomNav.tsx");

    expect(app.match(/<Route path="\/manual"/g)).toHaveLength(1);
    expect(app).not.toContain("/user-manual");
    expect(app).not.toContain("/admin-manual");
    expect(app.indexOf("if (!user) {")).toBeLessThan(
      app.indexOf('<Route path="/manual"')
    );

    for (const navigation of [appLayout, bottomNav]) {
      expect(navigation).toMatch(/user\?\.role === ["']admin["']/);
      expect(navigation).toContain("nav.adminManual");
      expect(navigation).toContain("nav.userManual");
      expect(navigation).toContain("manualLabel");
    }

    expect(appLayout).toMatch(
      /\{\s*path:\s*"\/settings"[\s\S]*?\}\s*,\s*\{\s*path:\s*"\/manual",\s*label:\s*manualLabel/
    );
    expect(appLayout).toMatch(
      /data-testid="sidebar-account-details"[\s\S]*?navigate\("\/settings"\)[\s\S]*?<\/DropdownMenuItem>\s*<DropdownMenuItem\s*data-testid="sidebar-manual-link"/
    );
    expect(bottomNav).toMatch(
      /data-testid=["']mobile-account-details["'][\s\S]*?navigate\(["']\/settings["']\)[\s\S]*?<\/DropdownMenuItem>\s*<DropdownMenuItem\s*data-testid=["']mobile-manual-link["']/
    );
  });

  it("keeps the Manual interface searchable, deep-linkable, responsive, and keyboard accessible", () => {
    const page = readProjectFile("../client/src/pages/Manual.tsx");

    expect(page).toContain(
      'const role: ManualRole = user?.role === "admin" ? "admin" : "user"'
    );
    expect(page).toContain(
      "getManualDocument(i18n.resolvedLanguage ?? i18n.language, role)"
    );
    expect(page).toContain('type="search"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain("href={`#manual-section-${section.id}`}");
    expect(page).toContain("href={`#manual-topic-${topic.id}`}");
    expect(page).toContain("id={`manual-section-${section.id}`}");
    expect(page).toContain("id={`manual-topic-${topic.id}`}");
    expect(page).toContain("manual.badges.paid");
    expect(page).toContain("manual.badges.admin");
    expect(page).toContain("manual.badges.all");
    expect(page).toContain("manual.noResultsTitle");
    expect(page).toContain("manual.clearSearch");
    expect(page).toContain("lg:hidden");
    expect(page).toContain("hidden lg:block");
    expect(page).toContain("min-h-11");
    expect(page).toContain("min-h-12");
    expect(page).toContain("<ol");
    expect(page).toContain("<article");
  });

  it("ships complete Manual UI labels in catalogs and runtime fallbacks for all seven locales", () => {
    const fallbackResources = readJson<Record<string, unknown>>(
      "../client/src/lib/i18nCompleteFallbackResources.json"
    );
    const englishCatalog = readJson<Record<string, unknown>>(
      "../client/public/locales/en/translation.json"
    );

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = readJson<Record<string, unknown>>(
        `../client/public/locales/${locale}/translation.json`
      );
      const fallback = fallbackResources[locale];

      for (const key of MANUAL_UI_KEYS) {
        const catalogValue = getByPath(catalog, key);
        const fallbackValue = getByPath(fallback, key);
        expect(
          typeof catalogValue === "string" && catalogValue.trim().length > 0,
          `${locale} catalog is missing ${key}`
        ).toBe(true);
        expect(
          fallbackValue,
          `${locale} runtime fallback is missing ${key}`
        ).toBe(catalogValue);
      }

      if (locale !== "en") {
        expect(
          getByPath(catalog, "nav.userManual"),
          `${locale} User Manual label`
        ).not.toBe(getByPath(englishCatalog, "nav.userManual"));
        expect(
          getByPath(catalog, "nav.adminManual"),
          `${locale} Admin Manual label`
        ).not.toBe(getByPath(englishCatalog, "nav.adminManual"));
      }
    }
  });

  it("advances locale and PWA caches for the localized Manual release", () => {
    const i18n = readProjectFile("../client/src/lib/i18n.ts");
    const serviceWorker = readProjectFile("../client/public/sw.js");

    expect(i18n).toContain("/locales/{{lng}}/{{ns}}.json?v=phame60");
    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v28'");
    for (const locale of SUPPORTED_LOCALES) {
      expect(serviceWorker).toContain(`/locales/${locale}/translation.json`);
    }
  });
});
