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

    expect(component).toContain('const API_KEY_PLACEHOLDER = "<YOUR_GET_PHAME_API_KEY>"');
    expect(component).not.toContain("gp_live_");
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

  it("ships guided Zapier and Make recipes through a protected managed Sources workspace", () => {
    const panel = readProjectFile("../client/src/components/SourceOperationsPanel.tsx");
    const page = readProjectFile("../client/src/pages/DeveloperIntegrations.tsx");
    const router = readProjectFile("./routers/sourceOperations.ts");

    expect(page).toContain("<SourceOperationsPanel />");
    expect(panel).toContain("trpc.sources.setupManifest.useQuery()");
    expect(panel).toContain("trpc.sources.create.useMutation");
    expect(panel).toContain("trpc.sources.analytics.useQuery");
    expect(panel).toContain("trpc.sources.healthHistory.useQuery");
    expect(panel).toContain("trpc.sources.refreshHealth.useMutation");
    expect(panel).toContain('value="zapier"');
    expect(panel).toContain('value="make"');
    expect(panel).toContain("Authorization: Bearer");
    expect(panel).toContain("Idempotency-Key");
    expect(panel).not.toContain("apiKeyRaw");

    expect(router).toContain("setupManifest: protectedProcedure");
    expect(router).toContain('sourceHeaderName: "X-Get-Phame-Source"');
    expect(router).toContain('endpointPath: "/api/v1/contacts"');
    expect(router).toContain("Webhooks by Zapier");
    expect(router).toContain("https://help.zapier.com/hc/en-us/articles/8496288690317-Send-webhooks-in-Zaps");
    expect(router).toContain('actionApp: "HTTP"');
    expect(router).toContain("https://apps.make.com/http");
    expect(router).toContain("keyHint: key.keyHint");
    expect(router).not.toContain("keyHash: key.keyHash");
  });

  it("attributes every authorized import to an owned source and exposes only owner-scoped analytics and health operations", () => {
    const publicApi = readProjectFile("./publicApi.ts");
    const imports = readProjectFile("./developerApiImports.ts");
    const sources = readProjectFile("./sourceConnections.ts");
    const router = readProjectFile("./routers/sourceOperations.ts");
    const schema = readProjectFile("../drizzle/schema.ts");

    const authIndex = publicApi.indexOf('authenticateApiRequest(req, "contacts:write")');
    const sourceHeaderIndex = publicApi.indexOf('req.header("X-Get-Phame-Source")');
    expect(authIndex).toBeGreaterThan(-1);
    expect(sourceHeaderIndex).toBeGreaterThan(authIndex);
    expect(publicApi).toContain("resolveSourceConnectionForPrincipal");
    expect(publicApi).toContain('"SOURCE_CONNECTION_FORBIDDEN"');
    expect(publicApi).toContain("sourceConnectionId");
    expect(imports).toContain("recordSourceConnectionActivity");
    expect(imports).toContain("sourceConnectionId: params.sourceConnectionId ?? null");

    expect(router).toContain("getSourceAnalytics(ctx.user.id, input.days)");
    expect(router).toContain("z.literal(7)");
    expect(router).toContain("z.literal(30)");
    expect(router).toContain("z.literal(90)");
    expect(router).toContain("listSourceHealthHistoryForUser(");
    expect(router).toContain("getSourceConnectionForUser(ctx.user.id, input.id)");
    expect(sources).toContain("contactsDeduplicated");
    expect(sources).toContain("successRate");
    expect(sources).toContain("latestActivityAt");
    expect(sources).toContain("claimSourceHealthSchedulerRun");

    expect(schema).toContain("export const sourceConnections");
    expect(schema).toContain("export const sourceHealthHistory");
    expect(schema).toContain("export const sourceHealthSchedulers");
    expect(schema).toContain('sourceConnectionId: integer("sourceConnectionId")');
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

      const sourceOps = catalog.developerIntegrations?.sourceOps;
      expect(sourceOps?.title).toBeTypeOf("string");
      expect(sourceOps?.description).toBeTypeOf("string");
      expect(sourceOps?.createTitle).toBeTypeOf("string");
      expect(sourceOps?.analyticsTitle).toBeTypeOf("string");
      expect(sourceOps?.successRate).toBeTypeOf("string");
      expect(sourceOps?.metrics?.deduplicated).toBeTypeOf("string");
      expect(sourceOps?.status?.healthy).toBeTypeOf("string");
      expect(sourceOps?.status?.failing).toBeTypeOf("string");
      expect(sourceOps?.steps?.zapier?.["1"]).toBeTypeOf("string");
      expect(sourceOps?.steps?.make?.["4"]).toBeTypeOf("string");
      expect(sourceOps?.reasons?.awaiting_first_import).toBeTypeOf("string");
      expect(sourceOps?.healthHistory).toBeTypeOf("string");
    }

    const serviceWorker = readProjectFile("../client/public/sw.js");
    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v22'");
    expect(i18nSource).toContain('/locales/{{lng}}/{{ns}}.json?v=phame38');
    expect(component).toContain("const STEP_FALLBACKS");
    expect(component).toContain("const RULE_FALLBACKS");
    expect(component).toContain("const PROVIDER_FALLBACKS");
    expect(component).toContain("const FIELD_FALLBACKS");
    for (const locale of localePaths) {
      expect(serviceWorker).toContain(`/locales/${locale}/translation.json`);
    }
  });
});
