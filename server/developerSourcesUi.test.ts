import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const localePaths = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];

describe("Developer Sources workflow", () => {
  it("offers provider-specific, keyboard-accessible guided source selection", () => {
    const component = readProjectFile("../client/src/components/SourceSetupGuide.tsx");
    const page = readProjectFile("../client/src/pages/DeveloperIntegrations.tsx");

    expect(page).toContain("<SourceSetupGuide endpoint={endpoint} />");
    expect(component).toContain('type="radio"');
    expect(component).toContain('name="source-provider"');
    expect(component).toContain('data-testid="developer-sources"');
    expect(component).toContain('label: "Jotform"');
    expect(component).toContain('label: "Facebook Lead Ads"');
    expect(component).toContain('label: "Google Forms"');
    expect(component).toContain('label: "Airtable"');
    expect(component).toContain('label: "Other source"');
  });

  it("uses only the canonical import endpoint and a placeholder secret", () => {
    const component = readProjectFile("../client/src/components/SourceSetupGuide.tsx");
    const publicApi = readProjectFile("./publicApi.ts");

    expect(component).toContain('const API_KEY_PLACEHOLDER = "gp_live_YOUR_API_KEY"');
    expect(component).toContain("Authorization: Bearer ${API_KEY_PLACEHOLDER}");
    expect(component).toContain("Idempotency-Key: <stable-provider-event-id>");
    expect(component).not.toContain("/api/public/send");
    expect(component).not.toContain("apiKeyRaw");
    expect(publicApi).toContain('authenticateApiRequest(req, "contacts:write")');
    expect(publicApi).toContain('app.post("/api/v1/contacts", handleContactImport(true))');
  });

  it("maps consent, stable source metadata, idempotency, and deduplication without automatic sending", () => {
    const component = readProjectFile("../client/src/components/SourceSetupGuide.tsx");
    const publicApi = readProjectFile("./publicApi.ts");

    for (const field of ["name", "email", "externalId", "sourceApp", "consentConfirmed", "consentBasis", "consentSource"]) {
      expect(component).toContain(`["${field}"`);
    }
    expect(component).toContain('sourceApp: "jotform"');
    expect(component).toContain('sourceApp: "facebook-lead-ads"');
    expect(component).toContain('sourceApp: "google-forms"');
    expect(component).toContain('sourceApp: "airtable"');
    expect(component).toContain('defaultValue: "Imports contacts only"');
    expect(publicApi).toContain('"CONSENT_REQUIRED"');
    expect(publicApi).toContain('"IDEMPOTENCY_CONFLICT"');
    expect(publicApi).toContain("deduplicated: !result.created");
    expect(publicApi).not.toContain('app.post("/api/v1/contacts", handleSendRequest');
  });

  it("ships a complete Sources namespace in all seven locale catalogs and bumps the PWA cache", () => {
    const component = readProjectFile("../client/src/components/SourceSetupGuide.tsx");
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

    for (const locale of localePaths) {
      const catalog = JSON.parse(readProjectFile(`../client/public/locales/${locale}/translation.json`));
      const sources = catalog.developerIntegrations?.sources;
      expect(sources?.title).toBeTypeOf("string");
      expect(sources?.title.length).toBeGreaterThan(0);
      expect(sources?.steps?.test).toBeTypeOf("string");
      expect(sources?.rules?.importOnly).toBeTypeOf("string");
      expect(sources?.providers?.jotform?.path).toBeTypeOf("string");
      expect(sources?.providers?.facebook?.idempotency).toBeTypeOf("string");
      expect(sources?.providers?.googleForms?.path).toBeTypeOf("string");
      expect(sources?.providers?.airtable?.idempotency).toBeTypeOf("string");
      expect(sources?.fields?.consentSource).toBeTypeOf("string");
    }

    const serviceWorker = readProjectFile("../client/public/sw.js");
    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v19'");
    expect(i18nSource).toContain('/locales/{{lng}}/{{ns}}.json?v=phame33');
    expect(component).toContain("const STEP_FALLBACKS");
    expect(component).toContain("const RULE_FALLBACKS");
    expect(component).toContain("const PROVIDER_FALLBACKS");
    expect(component).toContain("const FIELD_FALLBACKS");
    for (const locale of localePaths) {
      expect(serviceWorker).toContain(`/locales/${locale}/translation.json`);
    }
  });
});
