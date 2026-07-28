import type { SupportedLang } from "@/lib/i18n";

export interface LanguageOption {
  code: SupportedLang;
  label: string;
  native: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "en", label: "EN", native: "English", flag: "🇺🇸" },
  { code: "zh-CN", label: "CN", native: "简体中文", flag: "🇨🇳" },
  { code: "es", label: "ES", native: "Español", flag: "🇪🇸" },
  { code: "fr", label: "FR", native: "Français", flag: "🇫🇷" },
  { code: "it", label: "IT", native: "Italiano", flag: "🇮🇹" },
  { code: "th", label: "TH", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "zh-TW", label: "TW", native: "繁體中文", flag: "🇹🇼" },
];

export function isSupportedLanguage(value: string | undefined): value is SupportedLang {
  return LANGUAGE_OPTIONS.some((language) => language.code === value);
}
