import i18n, { type SupportedLang } from "./i18n";
import manifest from "./autoTextManifest.json";
import translations from "./autoTextTranslations.json";

type Interpolation = Record<string, string | number | undefined | null>;

type StaticCopySupplement = {
  manifest: Array<{ key: string; source: string }>;
  translations: Record<string, Record<string, string>>;
};

const STATIC_COPY_SUPPLEMENT_URL = "/manus-storage/getphame-static-localization-phame17_b0611502.json";
let staticCopySupplementReady: Promise<void> | undefined;

const sourceToKey = new Map(
  manifest.map((entry) => [entry.source, entry.key]),
);
const translationCatalogs = translations as Record<string, Record<string, string>>;

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

for (const entry of manifest) {
  sourceToKey.set(decodeEntities(entry.source), entry.key);
}

function mergeStaticCopySupplement(supplement: StaticCopySupplement) {
  if (!Array.isArray(supplement.manifest) || !supplement.translations) {
    throw new Error("Static localization supplement is malformed.");
  }

  for (const entry of supplement.manifest) {
    if (!entry?.key || !entry.source) continue;
    sourceToKey.set(entry.source, entry.key);
    sourceToKey.set(decodeEntities(entry.source), entry.key);
  }

  for (const [locale, catalog] of Object.entries(supplement.translations)) {
    if (!catalog || typeof catalog !== "object") continue;
    Object.assign(translationCatalogs[locale] ??= {}, catalog);
  }
}

/**
 * Loads the versioned static-copy supplement before React mounts. The network
 * resource keeps the sizeable cross-application catalog outside the source
 * tree while preserving a deterministic English fallback if it is unavailable.
 */
export function loadStaticLocalizationSupplement() {
  if (staticCopySupplementReady) return staticCopySupplementReady;

  staticCopySupplementReady = fetch(STATIC_COPY_SUPPLEMENT_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Static localization supplement request failed (${response.status}).`);
      mergeStaticCopySupplement(await response.json() as StaticCopySupplement);
    })
    .catch((error) => {
      console.error("[i18n] Static localization supplement unavailable; using English static-copy fallback.", error);
    });

  return staticCopySupplementReady;
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
 * Localizes static customer-facing copy that was identified by the full-app
 * source audit. Existing `t()` calls remain the preferred pattern for new
 * feature work; this helper safely covers legacy literals while preserving a
 * deterministic English fallback.
 */
export function at(source: string, variables?: Interpolation) {
  const key = sourceToKey.get(source);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = language as SupportedLang;
  const localized = locale !== "en" && key
    ? translationCatalogs[locale]?.[key] ?? source
    : source;

  return localizeEmbeddedDates(interpolate(decodeEntities(localized), variables), locale);
}

/** Returns a localized value only when the source was included in the audited manifest. */
export function localizeStaticText(source: string) {
  return sourceToKey.has(source) ? at(source) : source;
}
