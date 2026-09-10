import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detectBrowserLang,
  mapBrowserLocale,
  resolveInitialLanguage,
} from "../client/src/lib/languageDetection";
import { shouldShowFirstVisitWelcome } from "../client/src/lib/firstVisitWelcome";
import {
  getPwaInstallSnapshot,
  updatePwaInstallSnapshot,
} from "../client/src/lib/pwaInstall";

function toFormattedSourcePattern(snippet: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = "";

  for (let index = 0; index < snippet.length; ) {
    const character = snippet[index];
    if (character === '"' || character === "'") {
      let closingIndex = index + 1;
      while (closingIndex < snippet.length) {
        if (
          snippet[closingIndex] === character &&
          snippet[closingIndex - 1] !== "\\"
        )
          break;
        closingIndex += 1;
      }
      if (closingIndex < snippet.length) {
        pattern += `["']${escape(snippet.slice(index + 1, closingIndex))}["']`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (/\s/.test(character)) {
      while (index < snippet.length && /\s/.test(snippet[index])) index += 1;
      pattern += "\\s*";
      continue;
    }

    pattern += escape(character);
    if ("().,=:?{}[]<>".includes(character)) pattern += "\\s*";
    index += 1;
  }

  return new RegExp(pattern);
}

function expectFormattedSource(source: string) {
  return {
    toContain(snippet: string) {
      expect(source).toMatch(toFormattedSourcePattern(snippet));
    },
    not: {
      toContain(snippet: string) {
        expect(source).not.toMatch(toFormattedSourcePattern(snippet));
      },
    },
  };
}

const LOCALES = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("browser language negotiation", () => {
  it("maps maintained browser locale families without network or IP inference", () => {
    expect(mapBrowserLocale("es-MX")).toBe("es");
    expect(mapBrowserLocale("fr-CA")).toBe("fr");
    expect(mapBrowserLocale("zh-Hans-SG")).toBe("zh-CN");
    expect(mapBrowserLocale("zh-Hant-HK")).toBe("zh-TW");
    expect(mapBrowserLocale("pt-BR")).toBeNull();
  });

  it("chooses the first supported ordered browser preference and falls back to English", () => {
    expect(detectBrowserLang(["de-DE", "es-MX", "fr-FR"])).toBe("es");
    expect(detectBrowserLang(["fr-CA", "es-MX"])).toBe("fr");
    expect(detectBrowserLang(["pt-BR", "de-DE"])).toBe("en");
    expect(detectBrowserLang([])).toBe("en");
  });

  it("applies URL, explicit choice, browser, and English precedence deterministically", () => {
    expect(
      resolveInitialLanguage({
        queryLang: "it",
        userChosen: true,
        savedLang: "th",
        browserLang: "fr",
      })
    ).toBe("it");
    expect(
      resolveInitialLanguage({
        queryLang: null,
        userChosen: true,
        savedLang: "th",
        browserLang: "fr",
      })
    ).toBe("th");
    expect(
      resolveInitialLanguage({
        queryLang: null,
        userChosen: false,
        savedLang: "es",
        browserLang: "zh-CN",
      })
    ).toBe("zh-CN");
    expect(
      resolveInitialLanguage({
        queryLang: null,
        userChosen: false,
        savedLang: null,
        browserLang: detectBrowserLang(["unsupported"]),
      })
    ).toBe("en");
  });
});

describe("first-visit welcome experience", () => {
  it("shows once only on supported entry routes and waits for the install guide", () => {
    expect(
      shouldShowFirstVisitWelcome({
        pathname: "/",
        alreadySeen: false,
        installGuideVisible: false,
      })
    ).toBe(true);
    expect(
      shouldShowFirstVisitWelcome({
        pathname: "/landing",
        alreadySeen: false,
        installGuideVisible: false,
      })
    ).toBe(true);
    expect(
      shouldShowFirstVisitWelcome({
        pathname: "/login",
        alreadySeen: false,
        installGuideVisible: false,
      })
    ).toBe(false);
    expect(
      shouldShowFirstVisitWelcome({
        pathname: "/",
        alreadySeen: true,
        installGuideVisible: false,
      })
    ).toBe(false);
    expect(
      shouldShowFirstVisitWelcome({
        pathname: "/",
        alreadySeen: false,
        installGuideVisible: true,
      })
    ).toBe(false);
  });

  it("enforces mutual exclusion between the welcome and install-guide surfaces", () => {
    updatePwaInstallSnapshot({
      installGuideVisible: false,
      welcomeVisible: false,
    });
    updatePwaInstallSnapshot({ welcomeVisible: true });
    expect(getPwaInstallSnapshot()).toMatchObject({
      welcomeVisible: true,
      installGuideVisible: false,
    });
    updatePwaInstallSnapshot({ installGuideVisible: true });
    expect(getPwaInstallSnapshot()).toMatchObject({
      welcomeVisible: false,
      installGuideVisible: true,
    });
    updatePwaInstallSnapshot({
      installGuideVisible: false,
      welcomeVisible: false,
    });
  });

  it("uses the shared accessible dialog, labeled controls, live status, and constrained mobile layout", () => {
    const source = readProjectFile(
      "../client/src/components/FirstVisitWelcome.tsx"
    );
    expectFormattedSource(source).toContain("<Dialog open={open}");
    expectFormattedSource(source).toContain(
      'aria-label={t("firstVisitWelcome.closeLabel")}'
    );
    expectFormattedSource(source).toContain('htmlFor="first-visit-language"');
    expectFormattedSource(source).toContain(
      'aria-describedby="first-visit-language-status"'
    );
    expectFormattedSource(source).toContain('aria-live="polite"');
    expectFormattedSource(source).toContain("max-h-[calc(100dvh-1.5rem)]");
    expectFormattedSource(source).toContain("max-w-[calc(100%-1rem)]");
    expectFormattedSource(source).toContain("motion-reduce:animate-none");
    expectFormattedSource(source).toContain(
      "if (isSupportedLanguage(nextLanguage)) handleLanguageChange(nextLanguage);"
    );
    expectFormattedSource(source).not.toContain(
      "event.target.value as SupportedLang"
    );
  });

  it("documents browser detection without retaining removed IP-inference terminology", () => {
    const source = readProjectFile(
      "../client/src/components/LanguageFlyout.tsx"
    );
    expectFormattedSource(source).toContain(
      "after browser detection or a manual language change"
    );
    expectFormattedSource(source).not.toContain("after IP detection resolves");
  });

  it("provides complete native welcome copy in maintained catalogs and runtime fallbacks", () => {
    const requiredKeys = [
      "languageReady",
      "title",
      "description",
      "featuresLabel",
      "features.personalRequests",
      "features.followUps",
      "features.dashboard",
      "changeLanguage",
      "selectedLanguage",
      "continue",
      "preferenceHint",
      "closeLabel",
    ];
    const fallback = JSON.parse(
      readProjectFile("../client/src/lib/i18nCompleteFallbackResources.json")
    ) as Record<string, unknown>;
    const english = JSON.parse(
      readProjectFile("../client/public/locales/en/translation.json")
    ) as Record<string, unknown>;

    for (const locale of LOCALES) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as Record<string, unknown>;
      for (const key of requiredKeys) {
        const value = getByPath(catalog, `firstVisitWelcome.${key}`);
        const fallbackValue = getByPath(
          fallback[locale],
          `firstVisitWelcome.${key}`
        );
        expect(
          typeof value === "string" && value.trim().length > 0,
          `${locale}.${key}`
        ).toBe(true);
        expect(fallbackValue, `${locale} fallback ${key}`).toBe(value);
      }

      if (locale !== "en") {
        expect(getByPath(catalog, "firstVisitWelcome.title")).not.toBe(
          getByPath(english, "firstVisitWelcome.title")
        );
        expect(getByPath(catalog, "firstVisitWelcome.changeLanguage")).not.toBe(
          getByPath(english, "firstVisitWelcome.changeLanguage")
        );
      }
    }
  });

  it("invalidates old locale caches and precaches every maintained translation catalog", () => {
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");
    const serviceWorker = readProjectFile("../client/public/sw.js");
    expectFormattedSource(i18nSource).toContain(
      'loadPath: "/locales/{{lng}}/{{ns}}.json?v=phame61"'
    );
    expectFormattedSource(serviceWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );
    for (const locale of LOCALES) {
      expectFormattedSource(serviceWorker).toContain(
        `'/locales/${locale}/translation.json'`
      );
    }
  });
});
