import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const localeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/public/locales"
);
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const requiredPaths = [
  "homePage.freeAllowanceInitial",
  "homePage.freeAllowanceMonthly",
  "page.freeInitialRemaining",
  "page.freeRollingRemaining",
  "page.freeInitialLimitReachedDesc",
  "page.freeRollingLimitReachedDesc",
  "paidUser.renewsOn",
  "adminUsers.title",
  "paymentSuccess.confirmed",
  "paymentSuccess.upgraded",
];

function getNestedValue(source: Record<string, unknown>, dottedPath: string) {
  return dottedPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

describe("quota and billing locale parity", () => {
  for (const locale of locales) {
    it(`${locale} contains every restored user-facing key`, () => {
      const file = path.join(localeRoot, locale, "translation.json");
      const json = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
        string,
        unknown
      >;

      for (const key of requiredPaths) {
        const value = getNestedValue(json, key);
        expect(value, `${locale}:${key}`).toBeTypeOf("string");
        expect(
          (value as string).trim().length,
          `${locale}:${key}`
        ).toBeGreaterThan(0);
      }
    });
  }

  it("English FAQ no longer claims that Free has no product sending limit", () => {
    const json = JSON.parse(
      fs.readFileSync(path.join(localeRoot, "en", "translation.json"), "utf8")
    ) as Record<string, unknown>;
    const serialized = JSON.stringify(json);

    expect(serialized).not.toContain("no artificial sending limits");
    expect(serialized).toContain("10 initial");
    expect(serialized).toContain("rolling 30 days");
  });
});
