export const SUPPORTED_LANGS = [
  "en",
  "zh-CN",
  "es",
  "fr",
  "it",
  "th",
  "zh-TW",
] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/** Map one browser locale tag to a maintained Get Phame locale. */
export function mapBrowserLocale(language: string): SupportedLang | null {
  const normalized = language.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("th")) return "th";
  if (
    normalized.startsWith("zh-cn") ||
    normalized.startsWith("zh-sg") ||
    normalized.includes("hans")
  )
    return "zh-CN";
  if (normalized.startsWith("zh")) return "zh-TW";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("en")) return "en";
  return null;
}

/** Select the first maintained locale from the browser's ordered preferences. */
export function detectBrowserLang(
  preferredLanguages?: readonly string[]
): SupportedLang {
  let browserPreferences: readonly string[] = preferredLanguages ?? [];

  if (preferredLanguages === undefined) {
    try {
      browserPreferences = [
        ...(Array.isArray(navigator.languages) ? navigator.languages : []),
        navigator.language,
      ];
    } catch {
      browserPreferences = [];
    }
  }

  const visited = new Set<string>();
  for (const preference of browserPreferences) {
    if (typeof preference !== "string") continue;
    const normalized = preference.trim().toLowerCase();
    if (!normalized || visited.has(normalized)) continue;
    visited.add(normalized);
    const supported = mapBrowserLocale(preference);
    if (supported) return supported;
  }

  return "en";
}

export function resolveInitialLanguage({
  queryLang,
  userChosen,
  savedLang,
  browserLang,
}: {
  queryLang: SupportedLang | null;
  userChosen: boolean;
  savedLang: SupportedLang | null;
  browserLang: SupportedLang;
}): SupportedLang {
  if (queryLang) return queryLang;
  if (userChosen && savedLang) return savedLang;
  return browserLang;
}
