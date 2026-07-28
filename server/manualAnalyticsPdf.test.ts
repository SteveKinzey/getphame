import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getManualDocument } from "../client/src/content/manuals/registry";
import type { ManualDocument } from "../client/src/content/manuals/types";
import {
  buildManualPdfFilename,
  createManualPdfBlob,
  downloadManualPdfBlob,
  getManualPdfSections,
  type ManualPdfLabels,
} from "../client/src/lib/manualPdfExport";
import {
  getManualSearchDedupeKey,
  getManualSearchFingerprint,
  getManualSearchInsights,
  MANUAL_SEARCH_MAX_LENGTH,
  MANUAL_SEARCH_MIN_LENGTH,
  normalizeManualSearchQuery,
  recordManualZeroResultSearch,
  validateManualSearchQuery,
} from "./manualSearchAnalytics";
import { checkManualSearchEventRateLimit } from "./rateLimiter";

const SUPPORTED_LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const NEW_MANUAL_KEYS = [
  "manual.insights.eyebrow",
  "manual.insights.title",
  "manual.insights.description",
  "manual.insights.privacy",
  "manual.insights.periodLabel",
  "manual.insights.periodDays",
  "manual.insights.loading",
  "manual.insights.error",
  "manual.insights.retry",
  "manual.insights.totalSearches",
  "manual.insights.uniqueTerms",
  "manual.insights.roleBreakdown",
  "manual.insights.manualScope",
  "manual.insights.term",
  "manual.insights.role",
  "manual.insights.locale",
  "manual.insights.count",
  "manual.insights.lastSearched",
  "manual.insights.adminManual",
  "manual.insights.userManual",
  "manual.insights.emptyTitle",
  "manual.insights.emptyBody",
  "manual.export.fullScope",
  "manual.export.sectionScope",
  "manual.export.scope",
  "manual.export.language",
  "manual.export.generated",
  "manual.export.lastUpdated",
  "manual.export.version",
  "manual.export.steps",
  "manual.export.notes",
  "manual.export.featurePath",
  "manual.export.page",
  "manual.export.sectionSuccess",
  "manual.export.fullSuccess",
  "manual.export.error",
  "manual.export.preparing",
  "manual.export.fullButton",
  "manual.export.help",
  "manual.export.sectionAria",
  "manual.export.sectionButton",
] as const;

function readProjectFile(relativePath: string) {
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

function placeholders(value: string) {
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map(match => match[1]).sort();
}

const PDF_LABELS: ManualPdfLabels = {
  fullScope: "Entire visible Manual",
  sectionScope: "Manual section",
  scope: "Export scope",
  language: "Language",
  generated: "Generated",
  lastUpdated: "Manual last updated",
  version: "Manual version",
  access: { all: "Free & paid", paid: "Paid subscription only", admin: "Administrator only" },
  steps: "Steps",
  notes: "Important notes",
  featurePath: "Feature path",
  page: "Page {{current}} of {{total}}",
};

const PDF_FIXTURE: ManualDocument = {
  version: 2,
  title: "User Manual",
  eyebrow: "Get Phame guidance",
  introduction: "Use this guide to complete your account setup.",
  lastUpdated: "2026-07-25",
  sections: [
    {
      id: "account-setup",
      title: "Account setup",
      summary: "Connect the essentials.",
      icon: "building",
      topics: [
        {
          id: "business-profile",
          title: "Complete the business profile",
          access: "all",
          body: "Add the business information used by Get Phame.",
          steps: ["Open Settings.", "Save the business profile."],
          notes: ["Review the sender name before sending."],
          route: "/settings",
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Manual zero-result analytics", () => {
  it("normalizes bounded terms and rejects terms outside the privacy contract", () => {
    expect(normalizeManualSearchQuery("  FULLWIDTH： ＡＢＣ   Setup  ")).toBe("fullwidth: abc setup");
    expect(validateManualSearchQuery("  Missing   Topic ")).toBe("missing topic");
    expect(() => validateManualSearchQuery("x")).toThrow(`${MANUAL_SEARCH_MIN_LENGTH}–${MANUAL_SEARCH_MAX_LENGTH}`);
    expect(() => validateManualSearchQuery("x".repeat(101))).toThrow(`${MANUAL_SEARCH_MIN_LENGTH}–${MANUAL_SEARCH_MAX_LENGTH}`);
    expect(validateManualSearchQuery("x".repeat(100))).toHaveLength(100);
  });

  it("uses a non-reversible fingerprint and a daily account/role/locale dedupe key", () => {
    const now = new Date("2026-07-25T10:00:00.000Z");
    const base = { userId: 17, query: " Missing   Topic ", manualRole: "user" as const, locale: "en" as const, now };
    const key = getManualSearchDedupeKey(base);

    expect(getManualSearchFingerprint(base.query)).toMatch(/^[a-f0-9]{64}$/);
    expect(getManualSearchFingerprint(base.query)).not.toContain("missing");
    expect(key).toBe(getManualSearchDedupeKey({ ...base, query: "missing topic" }));
    expect(key).not.toBe(getManualSearchDedupeKey({ ...base, userId: 18 }));
    expect(key).not.toBe(getManualSearchDedupeKey({ ...base, manualRole: "admin" }));
    expect(key).not.toBe(getManualSearchDedupeKey({ ...base, locale: "fr" }));
    expect(key).not.toBe(getManualSearchDedupeKey({ ...base, now: new Date("2026-07-26T10:00:00.000Z") }));
  });

  it("stores only the bounded event contract, uses duplicate-safe insertion, and performs opportunistic retention cleanup", async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn((value: Record<string, unknown>) => {
      inserted.push(value);
      return { onDuplicateKeyUpdate };
    });
    const where = vi.fn().mockResolvedValue(undefined);
    const database = {
      insert: vi.fn(() => ({ values })),
      delete: vi.fn(() => ({ where })),
    };

    await recordManualZeroResultSearch({
      db: database as never,
      userId: 31,
      query: "  Missing   setup topic ",
      manualRole: "user",
      locale: "en",
      manualVersion: "2:2026-07-25",
      now: new Date("2099-07-25T12:00:00.000Z"),
    });

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      userId: 31,
      query: "missing setup topic",
      manualRole: "user",
      locale: "en",
      manualVersion: "2:2026-07-25",
    });
    expect(inserted[0].queryFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(inserted[0].dedupeKey).toMatch(/^[a-f0-9]{64}$/);
    expect(inserted[0]).not.toHaveProperty("referrer");
    expect(inserted[0]).not.toHaveProperty("userAgent");
    expect(inserted[0]).not.toHaveProperty("customer");
    expect(onDuplicateKeyUpdate).toHaveBeenCalledWith({ set: { dedupeKey: inserted[0].dedupeKey } });
    expect(database.delete).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
  });

  it("returns aggregate-only administrator insight data with deterministic numeric and date normalization", async () => {
    const resultSets = [
      [{ totalSearches: "7", uniqueTerms: "3", latestAt: new Date("2026-07-24T08:00:00.000Z") }],
      [{ manualRole: "user", count: "5" }, { manualRole: "admin", count: "2" }],
      [{ query: "custom domain", manualRole: "user", locale: "en", count: "4", lastSearchedAt: new Date("2026-07-24T08:00:00.000Z") }],
    ];
    let selectIndex = 0;
    const makeBuilder = (rows: unknown[]) => {
      const builder: Record<string, unknown> = {};
      builder.from = vi.fn(() => builder);
      builder.where = vi.fn(() => builder);
      builder.groupBy = vi.fn(() => builder);
      builder.orderBy = vi.fn(() => builder);
      builder.limit = vi.fn(() => Promise.resolve(rows));
      builder.then = (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject);
      return builder;
    };
    const database = { select: vi.fn(() => makeBuilder(resultSets[selectIndex++] ?? [])) };

    const result = await getManualSearchInsights({
      db: database as never,
      periodDays: 90,
      limit: 25,
      now: new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(result.periodDays).toBe(90);
    expect(result.retentionDays).toBe(365);
    expect(result.summary).toEqual({
      totalSearches: 7,
      uniqueTerms: 3,
      latestAt: "2026-07-24T08:00:00.000Z",
      roleCounts: { user: 5, admin: 2 },
    });
    expect(result.items).toEqual([{
      query: "custom domain",
      manualRole: "user",
      locale: "en",
      count: 4,
      lastSearchedAt: "2026-07-24T08:00:00.000Z",
    }]);
    expect(result.items[0]).not.toHaveProperty("userId");
    expect(result.items[0]).not.toHaveProperty("queryFingerprint");
    expect(result.items[0]).not.toHaveProperty("dedupeKey");
  });

  it("caps attempted telemetry writes per account and resets after the one-hour window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
    const userId = 9_000_125;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      expect(() => checkManualSearchEventRateLimit(userId)).not.toThrow();
    }
    expect(() => checkManualSearchEventRateLimit(userId)).toThrowError(
      expect.objectContaining({ code: "TOO_MANY_REQUESTS" }),
    );

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    expect(() => checkManualSearchEventRateLimit(userId)).not.toThrow();
  });

  it("keeps tracking authenticated, result-gated, scope-verified, deduplicated, and administrator reporting aggregate-only", () => {
    const routers = readProjectFile("./routers.ts");
    const page = readProjectFile("../client/src/pages/Manual.tsx");
    const schema = readProjectFile("../drizzle/schema.ts");

    expect(routers).toContain("trackManualZeroResultSearch: protectedProcedure");
    expect(routers).toContain("resultCount: z.literal(0)");
    expect(routers).toContain("locale: z.enum(MANUAL_SEARCH_LOCALES)");
    expect(routers).toContain("manualRole: z.enum(MANUAL_SEARCH_ROLES)");
    expect(routers).toContain("if (input.manualRole !== sessionRole)");
    expect(routers).toContain("checkManualSearchEventRateLimit(ctx.user.id)");
    expect(routers).toContain("manualSearchInsights: adminProcedure");
    expect(routers).toContain("max(50)");

    expect(page).toContain("normalizedQuery.length < 2 || normalizedQuery.length > 100 || resultCount !== 0");
    expect(page).toContain("trackedSearchesRef.current.has(trackingKey)");
    expect(page).toContain("window.setTimeout");
    expect(page).toContain("}, 800)");
    expect(page).toContain("resultCount: 0");
    expect(page).toContain('role === "admin" ? <ManualSearchInsightsPanel /> : null');

    expect(schema).toContain('pgTable("manual_search_events"');
    expect(schema).toContain('uniqueIndex("manual_search_events_dedupe_unique")');
    expect(schema).toContain('index("manual_search_events_role_locale_created_idx")');
    expect(schema).toContain('index("manual_search_events_query_created_idx")');
  });
});

describe("role-safe Manual PDF export", () => {
  it("builds deterministic sanitized filenames for full and section exports", () => {
    expect(buildManualPdfFilename({ role: "user", locale: "en-US" })).toBe("get-phame-user-manual-en-us.pdf");
    expect(buildManualPdfFilename({ role: "admin", locale: "zh-CN", sectionId: "Security & Recovery" })).toBe(
      "get-phame-admin-manual-zh-cn-security-recovery.pdf",
    );
  });

  it("selects only sections already present in the authorized role document", () => {
    const userManual = getManualDocument("en", "user");
    const adminManual = getManualDocument("en", "admin");
    const administratorSection = adminManual.sections.find(section => section.access === "admin");
    expect(administratorSection).toBeDefined();

    expect(getManualPdfSections(userManual)).toBe(userManual.sections);
    expect(() => getManualPdfSections(userManual, administratorSection!.id)).toThrow("unavailable");
    expect(getManualPdfSections(adminManual, administratorSection!.id)).toEqual([administratorSection]);
  });

  it("creates a real PDF blob for the authorized localized document", async () => {
    const blob = await createManualPdfBlob(PDF_FIXTURE, {
      role: "user",
      locale: "en",
      languageLabel: "English (en)",
      generatedAt: new Date("2026-07-25T12:00:00.000Z"),
      labels: PDF_LABELS,
    });
    const signature = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
    expect(signature).toBe("%PDF-");
  });

  it("downloads with an explicit filename and revokes the temporary object URL", () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const anchor = { href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() };
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:manual-pdf");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild } });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", { setTimeout: (callback: () => void) => { callback(); return 1; } });

    downloadManualPdfBlob(blob, "get-phame-user-manual-en.pdf");

    expect(anchor).toMatchObject({ href: "blob:manual-pdf", download: "get-phame-user-manual-en.pdf", rel: "noopener" });
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:manual-pdf");
  });

  it("keeps export controls localized, role-scoped, keyboard accessible, and stateful", () => {
    const page = readProjectFile("../client/src/pages/Manual.tsx");
    const exporter = readProjectFile("../client/src/lib/manualPdfExport.ts");

    expect(page).toContain("createManualPdfBlob(manual");
    expect(page).toContain("buildManualPdfFilename({ role, locale: manualLocale");
    expect(page).toContain('aria-describedby="manual-export-help"');
    expect(page).toContain("manual.export.fullButton");
    expect(page).toContain("manual.export.sectionButton");
    expect(page).toContain("manual.export.sectionAria");
    expect(page).toContain("disabled={exportingScope !== null}");
    expect(page).toContain("min-h-11");
    expect(exporter).toContain('pdf.text("GET PHAME"');
    expect(exporter).toContain("detectTranscriptPdfUnicodeFont");
    expect(exporter).toContain("URL.revokeObjectURL(objectUrl)");
  });
});

describe("Manual analytics and PDF localization", () => {
  it("ships every new key with placeholder parity in all seven catalogs and runtime fallbacks", () => {
    const fallbackResources = readJson<Record<string, unknown>>("../client/src/lib/i18nCompleteFallbackResources.json");
    const english = readJson<Record<string, unknown>>("../client/public/locales/en/translation.json");

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = readJson<Record<string, unknown>>(`../client/public/locales/${locale}/translation.json`);
      const fallback = fallbackResources[locale];

      for (const key of NEW_MANUAL_KEYS) {
        const value = getByPath(catalog, key);
        const fallbackValue = getByPath(fallback, key);
        const englishValue = getByPath(english, key);
        expect(typeof value === "string" && value.trim().length > 0, `${locale} catalog missing ${key}`).toBe(true);
        expect(fallbackValue, `${locale} fallback mismatch for ${key}`).toBe(value);
        expect(placeholders(String(value)), `${locale} placeholders differ for ${key}`).toEqual(placeholders(String(englishValue)));
      }

      if (locale !== "en") {
        expect(getByPath(catalog, "manual.insights.title")).not.toBe(getByPath(english, "manual.insights.title"));
        expect(getByPath(catalog, "manual.export.fullButton")).not.toBe(getByPath(english, "manual.export.fullButton"));
      }
    }
  });

  it("advances both locale and PWA caches for the analytics and PDF release", () => {
    expect(readProjectFile("../client/src/lib/i18n.ts")).toContain('/locales/{{lng}}/{{ns}}.json?v=phame42');
    expect(readProjectFile("../client/public/sw.js")).toContain("const CACHE_NAME = 'getphame-v24'");
  });
});
