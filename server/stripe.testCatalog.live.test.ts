import Stripe from "stripe";
import { describe, expect, it } from "vitest";

type CatalogSpec = {
  label: string;
  envName: string;
  currency: "usd" | "thb";
  unitAmount: number;
  interval: "month" | "year" | null;
};

const SPECS: CatalogSpec[] = [
  { label: "USD monthly", envName: "STRIPE_TEST_PRICE_ID_USD_MONTHLY", currency: "usd", unitAmount: 2_900, interval: "month" },
  { label: "USD annual", envName: "STRIPE_TEST_PRICE_ID_USD_ANNUAL", currency: "usd", unitAmount: 29_000, interval: "year" },
  { label: "USD lifetime", envName: "STRIPE_TEST_PRICE_ID_USD_LIFETIME", currency: "usd", unitAmount: 34_900, interval: null },
  { label: "THB monthly", envName: "STRIPE_TEST_PRICE_ID_THB_MONTHLY", currency: "thb", unitAmount: 97_000, interval: "month" },
  { label: "THB annual", envName: "STRIPE_TEST_PRICE_ID_THB_ANNUAL", currency: "thb", unitAmount: 999_000, interval: "year" },
  { label: "THB lifetime", envName: "STRIPE_TEST_PRICE_ID_THB_LIFETIME", currency: "thb", unitAmount: 1_170_000, interval: null },
];

const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
const canValidate = secretKey.startsWith("sk_test_")
  && SPECS.every(({ envName }) => Boolean(process.env[envName]));
const describeWithCatalog = canValidate ? describe : describe.skip;

describeWithCatalog("managed Stripe test catalog", () => {
  for (const spec of SPECS) {
    it(`retrieves the exact active ${spec.label} Price`, async () => {
      const priceId = process.env[spec.envName];
      expect(priceId).toBeTruthy();

      const stripe = new Stripe(secretKey, { apiVersion: "2025-01-27.acacia" });
      const price = await stripe.prices.retrieve(priceId!);
      expect(price.active).toBe(true);
      expect(price.livemode).toBe(false);
      expect(price.currency).toBe(spec.currency);
      expect(price.unit_amount).toBe(spec.unitAmount);
      expect(price.recurring?.interval ?? null).toBe(spec.interval);
    });
  }
});
