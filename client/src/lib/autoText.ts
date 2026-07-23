import i18n, { SUPPORTED_LANGS, type SupportedLang } from "./i18n";

type Interpolation = Record<string, string | number | undefined | null>;

type StaticCopySupplement = {
  version?: string;
  locale?: SupportedLang;
  manifest: Array<{ key: string; source: string }>;
  translations: Record<string, string>;
};

// Each non-English locale receives only its own static-copy catalog. This
// removes the previous all-language JSON imports from the initial JavaScript
// bundle and avoids downloading unrelated languages.
const STATIC_COPY_SUPPLEMENT_URLS: Partial<Record<SupportedLang, string>> = {
  es: "/manus-storage/getphame-static-copy-es-phame29-static-copy_f63cb5a6.json",
  fr: "/manus-storage/getphame-static-copy-fr-phame29-static-copy_75212a1b.json",
  it: "/manus-storage/getphame-static-copy-it-phame29-static-copy_e36babdb.json",
  th: "/manus-storage/getphame-static-copy-th-phame29-static-copy_165df0ca.json",
  "zh-CN": "/manus-storage/getphame-static-copy-zh-CN-phame29-static-copy_39d8ea06.json",
  "zh-TW": "/manus-storage/getphame-static-copy-zh-TW-phame29-static-copy_b6dfca7f.json",
};

const sourceToKey = new Map<string, string>();
const translationCatalogs: Record<string, Record<string, string>> = {};
const loadedStaticCopyLocales = new Map<SupportedLang, Promise<void>>();

function decodeEntities(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(amp|apos|gt|lt|nbsp|quot);/g, (_, entity: string) => entities[entity] ?? _);
}

function getActiveLocale(): SupportedLang {
  const candidate = i18n.resolvedLanguage ?? i18n.language;
  return SUPPORTED_LANGS.includes(candidate as SupportedLang)
    ? (candidate as SupportedLang)
    : "en";
}

export function getStaticLocalizationSupplementUrl(locale: SupportedLang) {
  return STATIC_COPY_SUPPLEMENT_URLS[locale];
}

function mergeStaticCopySupplement(supplement: StaticCopySupplement, locale: SupportedLang) {
  if (!Array.isArray(supplement.manifest) || !supplement.translations) {
    throw new Error("Static localization supplement is malformed.");
  }

  if (supplement.locale && supplement.locale !== locale) {
    throw new Error(`Static localization supplement locale mismatch: expected ${locale}.`);
  }

  for (const entry of supplement.manifest) {
    if (!entry?.key || !entry.source) continue;
    sourceToKey.set(entry.source, entry.key);
    sourceToKey.set(decodeEntities(entry.source), entry.key);
  }

  Object.assign(translationCatalogs[locale] ??= {}, supplement.translations);
}

/**
 * Loads only the active locale's versioned static-copy catalog. English does
 * not need a catalog because its audited source text is the canonical fallback.
 * A per-locale promise cache prevents duplicate fetches while allowing a
 * language switch to preload its own copy before the UI changes language.
 */
export function loadStaticLocalizationSupplement(requestedLocale?: SupportedLang) {
  const locale = requestedLocale ?? getActiveLocale();
  if (locale === "en") return Promise.resolve();

  const existing = loadedStaticCopyLocales.get(locale);
  if (existing) return existing;

  const url = getStaticLocalizationSupplementUrl(locale);
  if (!url) return Promise.resolve();

  const ready = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Static localization supplement request failed (${response.status}).`);
      mergeStaticCopySupplement(await response.json() as StaticCopySupplement, locale);
    })
    .catch((error) => {
      loadedStaticCopyLocales.delete(locale);
      console.error(`[i18n] ${locale} static-copy supplement unavailable; using English static-copy fallback.`, error);
    });

  loadedStaticCopyLocales.set(locale, ready);
  return ready;
}

function interpolate(value: string, variables?: Interpolation) {
  if (!variables) return value;
  return value.replace(/\{\{?([\w.-]+)\}?\}/g, (token, key: string) => {
    const replacement = variables[key];
    return replacement == null ? token : String(replacement);
  });
}

const ENGLISH_MONTH_PATTERN = /\b(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{1,2}),?)?\s+(\d{4})\b/g;

function localizeEmbeddedDates(value: string, locale: string) {
  if (locale === "en") return value;

  return value.replace(ENGLISH_MONTH_PATTERN, (source, month: string, day: string | undefined, year: string) => {
    const parsed = new Date(`${month} ${day ?? "1"}, ${year}`);
    if (Number.isNaN(parsed.getTime())) return source;

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      ...(day ? { day: "numeric" } : {}),
    }).format(parsed);
  });
}

/**
 * Localizes audited legacy literals while preserving their English source as a
 * deterministic fallback until the selected locale bundle is available.
 */
export function at(source: string, variables?: Interpolation) {
  const key = sourceToKey.get(source);
  const locale = getActiveLocale();
  const localized = locale !== "en" && key
    ? translationCatalogs[locale]?.[key] ?? source
    : source;

  return localizeEmbeddedDates(interpolate(decodeEntities(localized), variables), locale);
}

/** Returns a localized value only when the source was included in the audited manifest. */
export function localizeStaticText(source: string) {
  return sourceToKey.has(source) ? at(source) : source;
}
