import userEn from "./user/en.json";
import userEs from "./user/es.json";
import userFr from "./user/fr.json";
import userIt from "./user/it.json";
import userTh from "./user/th.json";
import userZhCn from "./user/zh-CN.json";
import userZhTw from "./user/zh-TW.json";
import adminEn from "./admin/en.json";
import adminEs from "./admin/es.json";
import adminFr from "./admin/fr.json";
import adminIt from "./admin/it.json";
import adminTh from "./admin/th.json";
import adminZhCn from "./admin/zh-CN.json";
import adminZhTw from "./admin/zh-TW.json";
import type { ManualDocument, ManualRole } from "./types";

const userManuals: Record<string, ManualDocument> = {
  en: userEn as ManualDocument,
  es: userEs as ManualDocument,
  fr: userFr as ManualDocument,
  it: userIt as ManualDocument,
  th: userTh as ManualDocument,
  "zh-CN": userZhCn as ManualDocument,
  "zh-TW": userZhTw as ManualDocument,
};

const adminManuals: Record<string, ManualDocument> = {
  en: adminEn as ManualDocument,
  es: adminEs as ManualDocument,
  fr: adminFr as ManualDocument,
  it: adminIt as ManualDocument,
  th: adminTh as ManualDocument,
  "zh-CN": adminZhCn as ManualDocument,
  "zh-TW": adminZhTw as ManualDocument,
};

export function normalizeManualLocale(locale?: string | null) {
  if (!locale) return "en";
  const normalized = locale.replace("_", "-");
  if (
    normalized.toLowerCase().startsWith("zh-tw") ||
    normalized.toLowerCase().startsWith("zh-hant")
  ) {
    return "zh-TW";
  }
  if (normalized.toLowerCase().startsWith("zh")) return "zh-CN";
  return normalized.split("-")[0].toLowerCase();
}

export function getManualDocument(
  locale: string | undefined,
  role: ManualRole
): ManualDocument {
  const normalizedLocale = normalizeManualLocale(locale);
  const userManual = userManuals[normalizedLocale] ?? userManuals.en;

  if (role === "user") return userManual;

  const adminManual = adminManuals[normalizedLocale] ?? adminManuals.en;
  return {
    ...adminManual,
    version: Math.max(userManual.version, adminManual.version),
    lastUpdated:
      userManual.lastUpdated > adminManual.lastUpdated
        ? userManual.lastUpdated
        : adminManual.lastUpdated,
    sections: [...userManual.sections, ...adminManual.sections],
  };
}

export function getManualSectionIds(
  locale: string | undefined,
  role: ManualRole
) {
  return getManualDocument(locale, role).sections.map(section => section.id);
}
