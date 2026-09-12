import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

describe("Developer Form Integrations and Admin Subscription Health", () => {
  it("exposes pre-configured guide templates for Zapier, Make, Jotform, and Contact Form 7", () => {
    const guide = readProjectFile(
      "../client/src/components/IntegrationGuide.tsx"
    );
    expect(guide).toContain('label: "Zapier"');
    expect(guide).toContain('label: "Make"');
    expect(guide).toContain('label: "Jotform"');
    expect(guide).toContain('label: "Contact Form 7"');
    expect(guide).toContain('sourceApp: "zapier"');
    expect(guide).toContain('sourceApp: "make"');
    expect(guide).toContain('sourceApp: "jotform"');
    expect(guide).toContain('sourceApp: "contact-form-7"');
    expect(guide).toContain("wpcf7_before_send_mail");
    expect(guide).toContain("Jotform submissionID");
  });

  it("renders the administrator subscription record health card on AdminDashboard", () => {
    const dashboard = readProjectFile("../client/src/pages/AdminDashboard.tsx");
    expect(dashboard).toContain("function SubscriptionRecordHealthCard()");
    expect(dashboard).toContain("trpc.admin.subscriptionRecordHealth.useQuery");
    expect(dashboard).toContain(
      'data-testid="subscription-record-health-card"'
    );
    expect(dashboard).toContain("<SubscriptionRecordHealthCard />");
  });

  it("includes all template and health keys across all seven locales", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
    for (const locale of locales) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      );
      expect(catalog.adminSubscriptionHealth?.eyebrow).toBeTypeOf("string");
      expect(catalog.adminSubscriptionHealth?.healthyTitle).toBeTypeOf(
        "string"
      );
      expect(catalog.adminSubscriptionHealth?.attentionTitle).toBeTypeOf(
        "string"
      );
      expect(catalog.developerIntegrations?.guides?.zapier?.summary).toBeTypeOf(
        "string"
      );
      expect(catalog.developerIntegrations?.guides?.make?.summary).toBeTypeOf(
        "string"
      );
      expect(
        catalog.developerIntegrations?.guides?.jotform?.summary
      ).toBeTypeOf("string");
      expect(
        catalog.developerIntegrations?.guides?.contactForm7?.summary
      ).toBeTypeOf("string");
    }
  });
});
