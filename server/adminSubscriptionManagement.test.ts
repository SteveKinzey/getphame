import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveAccessCodeGrant } from "./accessCodes";
import { resolveSubscriptionGrant } from "./subscriptionGrants";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const dashboardSource = readFileSync(
  new URL("../client/src/pages/AdminDashboard.tsx", import.meta.url),
  "utf8",
);
const codesSource = readFileSync(
  new URL("../client/src/pages/AdminCodes.tsx", import.meta.url),
  "utf8",
);
const upgradeSource = readFileSync(
  new URL("../client/src/pages/Upgrade.tsx", import.meta.url),
  "utf8",
);
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

describe("admin subscription management", () => {
  it("resolves monthly, annual, and lifetime grants with calendar-safe expiry", () => {
    const monthEnd = Date.UTC(2026, 0, 31, 12, 0, 0);
    const leapDay = Date.UTC(2024, 1, 29, 12, 0, 0);

    expect(resolveSubscriptionGrant("monthly", monthEnd)).toEqual({
      tier: "pro",
      planExpiresAt: Date.UTC(2026, 1, 28, 12, 0, 0),
    });
    expect(resolveSubscriptionGrant("annual", leapDay)).toEqual({
      tier: "annual",
      planExpiresAt: Date.UTC(2025, 1, 28, 12, 0, 0),
    });
    expect(resolveSubscriptionGrant("lifetime", monthEnd)).toEqual({
      tier: "lifetime",
      planExpiresAt: null,
    });
  });

  it("preserves legacy codes and resolves day, month, and lifetime grants", () => {
    const startsAt = Date.UTC(2026, 0, 31, 8, 30, 0);
    expect(resolveAccessCodeGrant({ grantDurationValue: null, grantDurationUnit: null }, startsAt)).toEqual({
      tier: "pro",
      planExpiresAt: null,
    });
    expect(resolveAccessCodeGrant({ grantDurationValue: 14, grantDurationUnit: "day" }, startsAt)).toEqual({
      tier: "pro",
      planExpiresAt: startsAt + 14 * 24 * 60 * 60 * 1000,
    });
    expect(resolveAccessCodeGrant({ grantDurationValue: 1, grantDurationUnit: "month" }, startsAt)).toEqual({
      tier: "pro",
      planExpiresAt: Date.UTC(2026, 1, 28, 8, 30, 0),
    });
    expect(resolveAccessCodeGrant({ grantDurationValue: null, grantDurationUnit: "lifetime" }, startsAt)).toEqual({
      tier: "lifetime",
      planExpiresAt: null,
    });
    expect(() => resolveAccessCodeGrant({ grantDurationValue: null, grantDurationUnit: "month" }, startsAt)).toThrow(
      "A duration value is required",
    );
  });

  it("wires duration metadata through schema, routers, and both admin surfaces", () => {
    expect(schemaSource).toContain('grantDurationValue: integer("grant_duration_value")');
    expect(schemaSource).toContain('grantDurationUnit: varchar("grant_duration_unit", { length: 16 })');
    expect(routerSource).toContain("grantSubscription: protectedProcedure");
    expect(routerSource).toContain("revokeSubscription: protectedProcedure");
    expect(routerSource).toContain('z.enum(["monthly", "annual", "lifetime"])');
    expect(routerSource).toContain('z.enum(["day", "month", "lifetime"])');
    expect(dashboardSource).toContain("trpc.admin.grantSubscription.useMutation");
    expect(dashboardSource).toContain("trpc.admin.revokeSubscription.useMutation");
    expect(dashboardSource).toContain("<AlertDialog");
    expect(codesSource).toContain("grantDurationUnit");
    expect(codesSource).toContain("grantDurationValue");
    expect(codesSource).toContain("accessCode.grantDurationLabel");
  });

  it("keeps the `$349` lifetime contract and removes the retired anchor price", () => {
    expect(upgradeSource).toContain("const LIFETIME_PRICE_USD = 349;");
    expect(upgradeSource).toContain("thb: toThb(349)");
    expect(upgradeSource).toContain("pricingGrid.guidance.${plan}");
    expect(upgradeSource).not.toContain("$497");
    expect(upgradeSource).not.toContain("pricingGrid.previousPrice");
    expect(routerSource).toContain("const LIFETIME_PRICE_CENTS = 34900;");
  });

  it("provides complete localized grant, revoke, duration, and guidance copy in every catalog", () => {
    const requiredPaths = [
      "pricingGrid.guidance.monthly",
      "pricingGrid.guidance.annual",
      "pricingGrid.guidance.lifetime",
      "accessCode.grantDurationLabel",
      "accessCode.grantUnitLabel",
      "accessCode.grantValueLabel",
      "accessCode.durationError",
      "accessCode.grantLifetime",
      "accessCode.grantDuration",
      "accessCode.units.day",
      "accessCode.units.month",
      "accessCode.units.lifetime",
      "adminSubscription.grantTitle",
      "adminSubscription.grantDescription",
      "adminSubscription.durationLabel",
      "adminSubscription.monthly",
      "adminSubscription.monthlyDescription",
      "adminSubscription.annual",
      "adminSubscription.annualDescription",
      "adminSubscription.lifetime",
      "adminSubscription.lifetimeDescription",
      "adminSubscription.confirmGrant",
      "adminSubscription.revoke",
      "adminSubscription.revokeTitle",
      "adminSubscription.revokeBillingWarning",
      "adminSubscription.confirmRevoke",
      "adminSubscription.cancel",
      "adminSubscription.grantSuccess",
      "adminSubscription.revokeSuccess",
    ];

    for (const locale of locales) {
      const catalog = JSON.parse(
        readFileSync(
          new URL(`../client/public/locales/${locale}/translation.json`, import.meta.url),
          "utf8",
        ),
      ) as Record<string, unknown>;
      for (const dottedPath of requiredPaths) {
        const value = dottedPath
          .split(".")
          .reduce<unknown>((current, segment) => (
            current && typeof current === "object"
              ? (current as Record<string, unknown>)[segment]
              : undefined
          ), catalog);
        expect(value, `${locale}.${dottedPath}`).toBeTypeOf("string");
        expect((value as string).trim(), `${locale}.${dottedPath}`).not.toBe("");
      }
      expect(JSON.stringify(catalog)).not.toContain("$497");
      expect(
        (catalog.pricingGrid as Record<string, unknown>).previousPrice,
        `${locale}.pricingGrid.previousPrice`,
      ).toBeUndefined();
    }
  });
});
