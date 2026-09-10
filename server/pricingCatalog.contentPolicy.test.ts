import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THB_ANNUAL_SAVINGS,
  THB_ANNUAL_SAVINGS_PERCENT,
  THB_DISPLAY,
  THB_PRICES,
  THB_PRICE_SATANG,
  USD_ANNUAL_SAVINGS,
  USD_ANNUAL_SAVINGS_PERCENT,
  USD_DISPLAY,
  USD_PRICES,
  USD_PRICE_CENTS,
} from "@shared/pricing";

const ROOT = process.cwd();
const LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function walk(relativePath: string): string[] {
  const absolutePath = join(ROOT, relativePath);
  if (!existsSync(absolutePath)) return [];
  if (!statSync(absolutePath).isDirectory()) return [relativePath];

  return readdirSync(absolutePath).flatMap(entry =>
    walk(join(relativePath, entry))
  );
}

describe("confirmed Get Phame pricing catalog", () => {
  it("defines the exact approved USD and THB amounts and derived annual savings", () => {
    expect(USD_PRICES).toEqual({ monthly: 29, annual: 290, lifetime: 349 });
    expect(USD_PRICE_CENTS).toEqual({
      monthly: 2_900,
      annual: 29_000,
      lifetime: 34_900,
    });
    expect(USD_DISPLAY).toEqual({
      monthly: "$29",
      annual: "$290",
      lifetime: "$349",
    });
    expect(USD_ANNUAL_SAVINGS).toBe(58);
    expect(USD_ANNUAL_SAVINGS_PERCENT).toBe(17);

    expect(THB_PRICES).toEqual({
      monthly: 970,
      annual: 9_990,
      lifetime: 11_700,
    });
    expect(THB_PRICE_SATANG).toEqual({
      monthly: 97_000,
      annual: 999_000,
      lifetime: 1_170_000,
    });
    expect(THB_DISPLAY).toEqual({
      monthly: "฿970",
      annual: "฿9,990",
      lifetime: "฿11,700",
    });
    expect(THB_ANNUAL_SAVINGS).toBe(1_650);
    expect(THB_ANNUAL_SAVINGS_PERCENT).toBe(14);
  });

  it("uses the shared catalog in public, authenticated, checkout, PayPal, and reporting consumers", () => {
    const requiredImports: Record<string, RegExp> = {
      "client/src/components/landing/Pricing.tsx": /from "@shared\/pricing"/,
      "client/src/pages/Upgrade.tsx": /from "@shared\/pricing"/,
      "server/paypal.ts": /from "@shared\/pricing"/,
      "server/routers.ts": /from "@shared\/pricing"/,
      "server/adminOperationsExport.ts": /from "@shared\/pricing"/,
    };

    for (const [file, importPattern] of Object.entries(requiredImports)) {
      expect(
        read(file),
        `${file} must consume the shared pricing catalog`
      ).toMatch(importPattern);
    }
  });

  it("keeps the administrator lifetime-price reference aligned with the approved catalog", () => {
    const adminRevenue = read("client/src/pages/AdminRevenue.tsx");

    expect(adminRevenue).toContain(
      `Lifetime: ${USD_DISPLAY.lifetime} one-time`
    );
    expect(adminRevenue).not.toContain("Lifetime: $1,247 one-time");
  });

  it("provides exact visible plan labels in all seven maintained locale catalogs", () => {
    for (const locale of LOCALES) {
      const translation = JSON.parse(
        read(`client/public/locales/${locale}/translation.json`)
      );
      const expected = locale === "th" ? THB_DISPLAY : USD_DISPLAY;

      expect(
        translation.pricing?.proMonthlyPrice,
        `${locale} monthly label`
      ).toBe(expected.monthly);
      expect(
        translation.pricing?.proAnnualPrice,
        `${locale} annual label`
      ).toBe(expected.annual);
      expect(
        translation.pricing?.lifetimePrice,
        `${locale} lifetime label`
      ).toBe(expected.lifetime);
    }
  });

  it("keeps annual billing totals and derived savings exact in authored and fallback pricing resources", () => {
    const fallback = JSON.parse(
      read("client/src/lib/i18nFallbackResources.json")
    );
    const completeFallback = JSON.parse(
      read("client/src/lib/i18nCompleteFallbackResources.json")
    );

    for (const locale of LOCALES) {
      const authored = JSON.parse(
        read(`client/public/locales/${locale}/landing.json`)
      );
      const expected =
        locale === "th"
          ? { annual: "9,990", savings: "1,650", percent: 14 }
          : { annual: "290", savings: "58", percent: 17 };
      const plans = [
        [
          "authored",
          authored.landing?.pricing?.proAnnual ?? authored.pricing?.proAnnual,
        ],
        ["fallback", fallback[locale]?.landing?.pricing?.proAnnual],
        [
          "complete fallback",
          completeFallback[locale]?.landing?.pricing?.proAnnual,
        ],
      ] as const;

      for (const [source, plan] of plans) {
        expect(plan, `${locale} ${source} annual plan`).toBeDefined();
        expect(
          plan.features.billed,
          `${locale} ${source} annual total`
        ).toContain(expected.annual);
        expect(
          plan.features.save,
          `${locale} ${source} savings amount`
        ).toContain(expected.savings);
        expect(
          plan.features.save,
          `${locale} ${source} savings percent`
        ).toMatch(new RegExp(`${expected.percent}\\s*%`));
        expect(plan.badge, `${locale} ${source} savings badge`).toMatch(
          new RegExp(`${expected.percent}\\s*%`)
        );
      }
    }
  });
});

describe("customer-facing social-proof policy", () => {
  it("contains no fabricated testimonial payloads, unsupported outcomes, or adoption counts", () => {
    const auditedFiles = [
      ...walk("client/src/components/landing"),
      ...walk("client/src/pages/LandingPage.tsx"),
      ...walk("client/src/pages/Onboarding.tsx"),
      ...walk("client/src/pages/ReferralLanding.tsx"),
      ...walk("client/src/pages/DataUsage.tsx"),
      ...walk("client/public/locales"),
      ...walk("client/src/lib/i18nFallbackResources.json"),
      ...walk("client/src/lib/i18nCompleteFallbackResources.json"),
      ...walk("client/src/lib/autoTextManifest.json"),
      ...walk("client/src/lib/autoTextTranslations.json"),
    ].filter(file => /\.(?:json|tsx?)$/.test(file));

    const prohibitedPatterns: Array<[string, RegExp]> = [
      [
        "fabricated named customer",
        /\b(?:Sarah M\.|Tom R\.|Lisa T\.|Maria G\.|David K\.|James R\.)\b/i,
      ],
      ["fabricated review outcome", /\b(?:12 to 47|8[–-]?10 new reviews)\b/i],
      [
        "unsupported English adoption count",
        /\b(?:join )?hundreds of businesses\b/i,
      ],
      [
        "unsupported Spanish adoption count",
        /\bcientos de (?:negocios|empresas)\b/i,
      ],
      [
        "unsupported French adoption count",
        /\bdes centaines d['’]entreprises\b/i,
      ],
      ["unsupported Italian adoption count", /\bcentinaia di aziende\b/i],
      ["unsupported Thai adoption count", /หลายร้อยธุรกิจ/i],
      ["unsupported Simplified Chinese adoption count", /数百家企业/i],
      ["unsupported Traditional Chinese adoption count", /數百家企業/i],
      ["unsupported open-rate claim", /45\s*[–-]\s*60\s*%/i],
      [
        "unsupported response-rate claim",
        /42\s*%[^\n]{0,80}(?:response|respuesta|réponse|risposta|ตอบกลับ|回复|回覆)/iu,
      ],
      [
        "unsupported review-lift claim",
        /(?:10|3)\s*[×x][^\n]{0,100}(?:reviews?|reseñas?|avis|recensioni|รีวิว|评价|評論)/iu,
      ],
      ["unsupported setup-time claim", /<\s*2\s*(?:min|minutes?)/i],
      [
        "unsupported batch-volume claim",
        /(?:500\+|one click sends to hundreds)/i,
      ],
      [
        "guaranteed free-review claim",
        /(?:first 10 reviews free|primeras 10 reseñas gratis|10 premières évaluations gratuites|prime 10 recensioni gratis|10 รีวิวแรก[^\n]{0,20}ฟรี|前 10 条评价[^\n]{0,20}免费|前 10 則評論[^\n]{0,20}免費)/iu,
      ],
      [
        "unsupported English setup-duration promise",
        /(?:under|less than|in)\s*(?:2\s*minutes?|60\s*seconds?)/i,
      ],
      [
        "unsupported localized setup-duration promise",
        /(?:2\s*(?:minutos|minutes|minuti|นาที|分钟|分鐘)|60\s*(?:segundos|secondes|secondi|วินาที|秒))/iu,
      ],
      [
        "five-star outcome claim",
        /(?:5[- ]star reviews?|5\s*estrellas|5\s*étoiles|5\s*stelle|5\s*ดาว|五星|五顆星)/iu,
      ],
      [
        "guaranteed review-growth phrasing",
        /(?:turn happy customers into|watch the reviews roll in|review count climb)/i,
      ],
      ["instant import claim", /your entire list in seconds/i],
      [
        "unsupported compliance or deliverability superlative",
        /(?:fully compliant|maximum deliverability)/i,
      ],
      ["stale annual total", /\$228/i],
      [
        "stale annual savings percent",
        /(?:save|ahorra|économisez|risparmia|ประหยัด|节省|省下|省|économiser)[^"\n]{0,80}34\s*%/iu,
      ],
      ["testimonial localization object", /"testimonials"\s*:/i],
      ["social-proof localization object", /"socialProof(?:Bar)?"\s*:/i],
      ["customer-quote localization object", /"customerQuote"\s*:/i],
      ["business-count localization object", /"joinBusinesses"\s*:/i],
    ];

    for (const file of auditedFiles) {
      const contents = read(file);
      for (const [label, pattern] of prohibitedPatterns) {
        expect(contents, `${file} contains ${label}`).not.toMatch(pattern);
      }
    }

    expect(
      existsSync(join(ROOT, "client/src/components/landing/Testimonials.tsx"))
    ).toBe(false);
    expect(
      existsSync(join(ROOT, "client/src/components/landing/SocialProofBar.tsx"))
    ).toBe(false);
  });
});
