import { describe, expect, it } from "vitest";
import { LIFECYCLE_LOCALES } from "@shared/lifecycleLocale";
import { renderSubscriptionLifecycleEmail } from "./subscriptionLifecycleEmail";

const kinds = ["trial-ending", "payment-action", "subscription-ended"] as const;

describe("subscription lifecycle templates", () => {
  it.each(LIFECYCLE_LOCALES)("renders every message kind in %s", locale => {
    for (const kind of kinds) {
      const rendered = renderSubscriptionLifecycleEmail({
        kind,
        locale,
        accountName: "Alex",
      });
      expect(rendered.locale).toBe(locale);
      expect(rendered.subject.length).toBeGreaterThan(5);
      expect(rendered.html).toContain("https://getphame.app/settings");
      expect(rendered.text).toContain("https://getphame.app/settings");
      expect(rendered.text).not.toMatch(/<[^>]+>/);
    }
  });

  it("escapes account display values in HTML without corrupting plain text", () => {
    const rendered = renderSubscriptionLifecycleEmail({
      kind: "payment-action",
      locale: "en",
      accountName: '<img src=x onerror="alert(1)">& Owner',
    });
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp; Owner"
    );
    expect(rendered.text).toContain('<img src=x onerror="alert(1)">& Owner');
  });

  it("falls back to English for invalid or missing locale input", () => {
    const invalid = renderSubscriptionLifecycleEmail({
      kind: "trial-ending",
      locale: "de",
    });
    const missing = renderSubscriptionLifecycleEmail({
      kind: "trial-ending",
      locale: null,
    });
    expect(invalid.locale).toBe("en");
    expect(missing.locale).toBe("en");
    expect(invalid.subject).toBe(missing.subject);
  });
});
