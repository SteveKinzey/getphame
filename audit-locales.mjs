import fs from "node:fs";
import path from "node:path";

const localeRoot = path.resolve("client/public/locales");
const sourceLocale = "en";
const targetLocales = ["es", "fr", "it", "th", "zh-CN", "zh-TW"];
const prefixes = process.argv.slice(2);

function readLocale(locale) {
  return JSON.parse(fs.readFileSync(path.join(localeRoot, locale, "translation.json"), "utf8"));
}

function leafPaths(value, prefix = "") {
  if (Array.isArray(value)) return [prefix];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

const english = readLocale(sourceLocale);
const englishPaths = leafPaths(english)
  .filter(Boolean)
  .filter((key) => prefixes.length === 0 || prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)));
const results = {};

for (const locale of targetLocales) {
  const target = readLocale(locale);
  const targetPaths = new Set(leafPaths(target).filter(Boolean));
  results[locale] = {
    missingCount: englishPaths.filter((key) => !targetPaths.has(key)).length,
    missing: englishPaths.filter((key) => !targetPaths.has(key)),
  };
}

console.log(JSON.stringify(results, null, 2));
