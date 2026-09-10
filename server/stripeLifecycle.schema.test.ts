import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import {
  businessProfiles,
  stripeLifecycleEmails,
  stripeLifecycleSchedulers,
  stripeSubscriptions,
  stripeWebhookEvents,
} from "../drizzle/schema";

describe("Stripe lifecycle schema", () => {
  it("stores lifecycle locale and canonical subscription boundaries", () => {
    expect(businessProfiles.lifecycleLocale.default).toBe("en");
    expect(stripeSubscriptions.trialEndsAt.name).toBe("trialEndsAt");
    expect(stripeSubscriptions.currentPeriodEndsAt.name).toBe(
      "currentPeriodEndsAt"
    );
    expect(stripeSubscriptions.cancelAtPeriodEnd.name).toBe(
      "cancelAtPeriodEnd"
    );
    const config = getTableConfig(stripeSubscriptions);
    expect(config.indexes.some(index => index.config.unique)).toBe(true);
  });

  it("uses unique event and subscription-sequence ledgers", () => {
    const events = getTableConfig(stripeWebhookEvents);
    const emails = getTableConfig(stripeLifecycleEmails);
    expect(events.indexes.some(index => index.config.unique)).toBe(true);
    expect(emails.indexes.some(index => index.config.unique)).toBe(true);
  });

  it("does not persist raw payloads, signatures, recipients, HTML, or raw errors", () => {
    const columns = Object.keys(stripeLifecycleEmails).join(" ").toLowerCase();
    const eventColumns = Object.keys(stripeWebhookEvents)
      .join(" ")
      .toLowerCase();
    for (const forbidden of [
      "recipientemail",
      "html",
      "text",
      "rawerror",
      "rawpayload",
      "signature",
    ]) {
      expect(`${columns} ${eventColumns}`).not.toContain(forbidden);
    }
  });

  it("persists one owned scheduler UID and five-minute cron policy", () => {
    expect(stripeLifecycleSchedulers.scheduleCronTaskUid.name).toBe(
      "scheduleCronTaskUid"
    );
    expect(stripeLifecycleSchedulers.cronExpression.default).toBe(
      "0 */5 * * * *"
    );
  });
});
