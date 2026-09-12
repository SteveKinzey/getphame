import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Stripe lifecycle source boundaries", () => {
  it("keeps the raw webhook route before JSON parsers and delegates processing", () => {
    const source = read("server/_core/index.ts");
    const webhook = source.indexOf('"/api/stripe/webhook"');
    const raw = source.indexOf("express.raw", webhook);
    const json = source.indexOf("app.use(express.json");
    expect(webhook).toBeGreaterThan(-1);
    expect(raw).toBeGreaterThan(webhook);
    expect(json).toBeGreaterThan(raw);
    expect(source).toContain("stripeWebhookHandler");
    expect(source).not.toContain("sendPaymentFailedEmail");
    expect(source).not.toContain("sendChurnRecoveryEmail");
    expect(source).not.toContain("sendUpgradeReceiptEmail");
  });

  it("contains only the approved Stripe lifecycle event allowlist", () => {
    const source = read("server/stripeLifecycle.ts");
    for (const event of [
      "checkout.session.completed",
      "customer.subscription.trial_will_end",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
      "invoice.paid",
      "invoice.payment_failed",
    ]) {
      expect(source).toContain(`"${event}"`);
    }
    expect(source).not.toContain("invoice.payment_succeeded");
    expect(source).not.toContain("smtp_credentials");
    expect(source).not.toContain("sendMailViaSmtp");
  });

  it("validates and forwards lifecycle locale on both protected Checkout routes", () => {
    const router = read("server/routers.ts");
    const upgrade = read("client/src/pages/Upgrade.tsx");
    expect(router.match(/locale: z\.enum\(LIFECYCLE_LOCALES\)/g)).toHaveLength(
      2
    );
    expect(router.match(/lifecycleLocale: input\.locale/g)).toHaveLength(4);
    expect(
      upgrade.match(/locale: normalizeLifecycleLocale\(i18n\.language\)/g)
    ).toHaveLength(3);
  });
});
