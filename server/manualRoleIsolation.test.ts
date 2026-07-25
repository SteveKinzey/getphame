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

const SUPPORTED_LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

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
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
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
  return readJson<ManualDocument>(`../client/src/content/manuals/${role}/${locale}.json`);
}

function topicIds(document: ManualDocument, access?: "all" | "paid" | "admin") {
  return document.sections.flatMap(section =>
    section.topics
      .filter(topic => !access || topic.access === access)
      .map(topic => topic.id),
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
    expect(getManualDocument("ja-JP", "user").title).toBe(readManual("user", "en").title);
  });

  it("gives users only user guidance and administrators one composed superset in all seven locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const authoredUserManual = readManual("user", locale);
      const authoredAdminSupplement = readManual("admin", locale);
      const userManual = getManualDocument(locale, "user");
      const adminManual = getManualDocument(locale, "admin");

      expect(userManual.title, `${locale} user title`).toBe(authoredUserManual.title);
      expect(userManual.sections, `${locale} user sections`).toEqual(authoredUserManual.sections);
      expect(
        userManual.sections.some(section =>
          section.access === "admin" || section.topics.some(topic => topic.access === "admin"),
        ),
        `${locale} user manual leaked administrator guidance`,
      ).toBe(false);

      expect(adminManual.title, `${locale} admin title`).toBe(authoredAdminSupplement.title);
      expect(adminManual.sections, `${locale} admin superset`).toEqual([
        ...authoredUserManual.sections,
        ...authoredAdminSupplement.sections,
      ]);
      expect(adminManual.sections.slice(0, authoredUserManual.sections.length)).toEqual(
        authoredUserManual.sections,
      );
      expect(authoredAdminSupplement.sections.length, `${locale} admin section count`).toBeGreaterThan(0);
      expect(
        authoredAdminSupplement.sections.every(section =>
          section.access === "admin" && section.topics.every(topic => topic.access === "admin"),
        ),
        `${locale} admin supplement contains guidance without an administrator-only label`,
      ).toBe(true);
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
      expect(topicIds(manual), `${locale} topic structure`).toEqual(englishAllIds);
      expect(topicIds(manual, "paid"), `${locale} paid-topic labels`).toEqual(englishPaidIds);
      expect(
        manual.sections.flatMap(section => section.topics).every(topic =>
          topic.access === "all" || topic.access === "paid",
        ),
        `${locale} user manual contains an invalid access state`,
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
    expect(app.indexOf("if (!user) {")).toBeLessThan(app.indexOf('<Route path="/manual"'));

    for (const navigation of [appLayout, bottomNav]) {
      expect(navigation).toMatch(/user\?\.role === ["']admin["']/);
      expect(navigation).toContain("nav.adminManual");
      expect(navigation).toContain("nav.userManual");
      expect(navigation).toContain("manualLabel");
    }

    expect(appLayout).toMatch(
      /\{ path: "\/settings"[^\n]*\n\s*\{ path: "\/manual", label: manualLabel/,
    );
    expect(appLayout).toMatch(
      /data-testid="sidebar-account-details"[\s\S]*?navigate\("\/settings"\)[\s\S]*?<\/DropdownMenuItem>\s*<DropdownMenuItem\s*data-testid="sidebar-manual-link"/,
    );
    expect(bottomNav).toMatch(
      /data-testid=["']mobile-account-details["'][\s\S]*?navigate\(["']\/settings["']\)[\s\S]*?<\/DropdownMenuItem>\s*<DropdownMenuItem\s*data-testid=["']mobile-manual-link["']/,
    );
  });

  it("keeps the Manual interface searchable, deep-linkable, responsive, and keyboard accessible", () => {
    const page = readProjectFile("../client/src/pages/Manual.tsx");

    expect(page).toContain('const role: ManualRole = user?.role === "admin" ? "admin" : "user"');
    expect(page).toContain("getManualDocument(i18n.resolvedLanguage ?? i18n.language, role)");
    expect(page).toContain('type="search"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('href={`#manual-section-${section.id}`}');
    expect(page).toContain('href={`#manual-topic-${topic.id}`}');
    expect(page).toContain('id={`manual-section-${section.id}`}');
    expect(page).toContain('id={`manual-topic-${topic.id}`}');
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
      "../client/src/lib/i18nCompleteFallbackResources.json",
    );
    const englishCatalog = readJson<Record<string, unknown>>(
      "../client/public/locales/en/translation.json",
    );

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = readJson<Record<string, unknown>>(
        `../client/public/locales/${locale}/translation.json`,
      );
      const fallback = fallbackResources[locale];

      for (const key of MANUAL_UI_KEYS) {
        const catalogValue = getByPath(catalog, key);
        const fallbackValue = getByPath(fallback, key);
        expect(
          typeof catalogValue === "string" && catalogValue.trim().length > 0,
          `${locale} catalog is missing ${key}`,
        ).toBe(true);
        expect(fallbackValue, `${locale} runtime fallback is missing ${key}`).toBe(catalogValue);
      }

      if (locale !== "en") {
        expect(getByPath(catalog, "nav.userManual"), `${locale} User Manual label`).not.toBe(
          getByPath(englishCatalog, "nav.userManual"),
        );
        expect(getByPath(catalog, "nav.adminManual"), `${locale} Admin Manual label`).not.toBe(
          getByPath(englishCatalog, "nav.adminManual"),
        );
      }
    }
  });

  it("advances locale and PWA caches for the localized Manual release", () => {
    const i18n = readProjectFile("../client/src/lib/i18n.ts");
    const serviceWorker = readProjectFile("../client/public/sw.js");

    expect(i18n).toContain('/locales/{{lng}}/{{ns}}.json?v=phame35');
    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v21'");
    for (const locale of SUPPORTED_LOCALES) {
      expect(serviceWorker).toContain(`/locales/${locale}/translation.json`);
    }
  });
});
