export const LIFECYCLE_LOCALES = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;

export type LifecycleLocale = (typeof LIFECYCLE_LOCALES)[number];

const lifecycleLocaleSet = new Set<string>(LIFECYCLE_LOCALES);

export function normalizeLifecycleLocale(locale: unknown): LifecycleLocale {
  if (typeof locale !== "string") return "en";
  const exact = locale.trim();
  if (lifecycleLocaleSet.has(exact)) return exact as LifecycleLocale;

  const base = exact.toLowerCase().split("-")[0];
  if (base === "zh") return "en";
  return lifecycleLocaleSet.has(base) ? (base as LifecycleLocale) : "en";
}

export function isLifecycleLocale(locale: unknown): locale is LifecycleLocale {
  return typeof locale === "string" && lifecycleLocaleSet.has(locale);
}
