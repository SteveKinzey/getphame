import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function readLocale(locale: typeof LOCALES[number]) {
  return JSON.parse(readFileSync(resolve(process.cwd(), `client/public/locales/${locale}/translation.json`), "utf8")) as Record<string, unknown>;
}

function flattenStrings(value: unknown, prefix = ""): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((flat, [key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof nested === "string") flat[path] = nested;
    else Object.assign(flat, flattenStrings(nested, path));
    return flat;
  }, {});
}

describe("contact search, loading, and export localization", () => {
  it("keeps the complete contactsTools key contract in every maintained locale", () => {
    const english = readLocale("en").contactsTools;
    const expectedKeys = Object.keys(flattenStrings(english)).sort();
    expect(expectedKeys.length).toBeGreaterThan(40);

    for (const locale of LOCALES) {
      const values = flattenStrings(readLocale(locale).contactsTools);
      expect(Object.keys(values).sort(), locale).toEqual(expectedKeys);
      expect(Object.values(values).every((value) => value.trim().length > 0), locale).toBe(true);
    }
  });

  it("wires accessible skeletons, reduced motion, distinct PDF keys, and the Unicode PDF helper", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/SavedContacts.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    const pdf = readFileSync(resolve(process.cwd(), "client/src/lib/contactExportPdf.ts"), "utf8");

    expect(page).toContain("ContactListSkeleton");
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('aria-busy={exportingFormat === "pdf"}');
    expect(page).toContain('contactsTools.export.pdfButton');
    expect(page).toContain('contactsTools.export.pdf.title');
    expect(css).toContain(".contact-result-enter");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(pdf).toContain("detectTranscriptPdfUnicodeFont");
    expect(pdf).toContain("fetchPdfFontAsBase64");
    expect(pdf).toContain('pdf.output("blob")');
    expect(pdf).toContain("anchor.download = filename");
  });
});
