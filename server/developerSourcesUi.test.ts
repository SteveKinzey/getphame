import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

const localePaths = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];

describe("Developer Sources workflow", () => {
  it("offers provider-specific, keyboard-accessible guided source selection", () => {
    const component = readProjectFile(
      "../client/src/components/SourceSetupGuide.tsx"
    );
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );

    expectSourceContract(page).toContain(
      "<SourceSetupGuide endpoint={endpoint} />"
    );
    expectSourceContract(component).toContain('type="radio"');
    expectSourceContract(component).toContain('name="source-provider"');
    expectSourceContract(component).toContain(
      'data-testid="developer-sources"'
    );
    expectSourceContract(component).toContain('label: "Jotform"');
    expectSourceContract(component).toContain('label: "Facebook Lead Ads"');
    expectSourceContract(component).toContain('label: "Google Forms"');
    expectSourceContract(component).toContain('label: "Airtable"');
    expectSourceContract(component).toContain('label: "Other source"');
  });

  it("uses only the canonical import endpoint and a placeholder secret", () => {
    const component = readProjectFile(
      "../client/src/components/SourceSetupGuide.tsx"
    );
    const publicApi = readProjectFile("./publicApi.ts");

    expectSourceContract(component).toContain(
      'const API_KEY_PLACEHOLDER = "<YOUR_GET_PHAME_API_KEY>"'
    );
    expect(component).not.toContain("gp_live_");
    expectSourceContract(component).toContain(
      "Authorization: Bearer ${API_KEY_PLACEHOLDER}"
    );
    expectSourceContract(component).toContain(
      "Idempotency-Key: <stable-provider-event-id>"
    );
    expect(component).not.toContain("/api/public/send");
    expect(component).not.toContain("apiKeyRaw");
    expectSourceContract(publicApi).toContain(
      'authenticateApiRequest(req, "contacts:write")'
    );
    expectSourceContract(publicApi).toContain(
      'app.post("/api/v1/contacts", handleContactImport(true))'
    );
  });

  it("maps consent, stable source metadata, idempotency, and deduplication without automatic sending", () => {
    const component = readProjectFile(
      "../client/src/components/SourceSetupGuide.tsx"
    );
    const publicApi = readProjectFile("./publicApi.ts");

    for (const field of [
      "name",
      "email",
      "externalId",
      "sourceApp",
      "consentConfirmed",
      "consentBasis",
      "consentSource",
    ]) {
      expectSourceContract(component).toContain(`["${field}"`);
    }
    expectSourceContract(component).toContain('sourceApp: "jotform"');
    expectSourceContract(component).toContain('sourceApp: "facebook-lead-ads"');
    expectSourceContract(component).toContain('sourceApp: "google-forms"');
    expectSourceContract(component).toContain('sourceApp: "airtable"');
    expectSourceContract(component).toContain(
      'defaultValue: "Imports contacts only"'
    );
    expectSourceContract(publicApi).toContain('"CONSENT_REQUIRED"');
    expectSourceContract(publicApi).toContain('"IDEMPOTENCY_CONFLICT"');
    expectSourceContract(publicApi).toContain("deduplicated: !result.created");
    expect(publicApi).not.toContain(
      'app.post("/api/v1/contacts", handleSendRequest'
    );
  });

  it("ships guided Zapier and Make recipes through a protected managed Sources workspace", () => {
    const panel = readProjectFile(
      "../client/src/components/SourceOperationsPanel.tsx"
    );
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const router = readProjectFile("./routers/sourceOperations.ts");

    expectSourceContract(page).toContain("<SourceOperationsPanel />");
    expectSourceContract(panel).toContain(
      "trpc.sources.setupManifest.useQuery()"
    );
    expectSourceContract(panel).toContain("trpc.sources.create.useMutation");
    expectSourceContract(panel).toContain("trpc.sources.analytics.useQuery");
    expectSourceContract(panel).toContain(
      "trpc.sources.healthHistory.useQuery"
    );
    expectSourceContract(panel).toContain(
      "trpc.sources.refreshHealth.useMutation"
    );
    expectSourceContract(panel).toContain('value="zapier"');
    expectSourceContract(panel).toContain('value="make"');
    expectSourceContract(panel).toContain("Authorization: Bearer");
    expectSourceContract(panel).toContain("Idempotency-Key");
    expect(panel).not.toContain("apiKeyRaw");

    expectSourceContract(router).toContain("setupManifest: protectedProcedure");
    expectSourceContract(router).toContain(
      'sourceHeaderName: "X-Get-Phame-Source"'
    );
    expectSourceContract(router).toContain('endpointPath: "/api/v1/contacts"');
    expectSourceContract(router).toContain("Webhooks by Zapier");
    expectSourceContract(router).toContain(
      "https://help.zapier.com/hc/en-us/articles/8496288690317-Send-webhooks-in-Zaps"
    );
    expectSourceContract(router).toContain('actionApp: "HTTP"');
    expectSourceContract(router).toContain("https://apps.make.com/http");
    expectSourceContract(router).toContain("keyHint: key.keyHint");
    expect(router).not.toContain("keyHash: key.keyHash");
  });

  it("attributes every authorized import to an owned source and exposes only owner-scoped analytics and health operations", () => {
    const publicApi = readProjectFile("./publicApi.ts");
    const imports = readProjectFile("./developerApiImports.ts");
    const sources = readProjectFile("./sourceConnections.ts");
    const router = readProjectFile("./routers/sourceOperations.ts");
    const schema = readProjectFile("../drizzle/schema.ts");

    const authIndex = publicApi.indexOf(
      'authenticateApiRequest(req, "contacts:write")'
    );
    const sourceHeaderIndex = publicApi.indexOf(
      'req.header("X-Get-Phame-Source")'
    );
    expect(authIndex).toBeGreaterThan(-1);
    expect(sourceHeaderIndex).toBeGreaterThan(authIndex);
    expectSourceContract(publicApi).toContain(
      "resolveSourceConnectionForPrincipal"
    );
    expectSourceContract(publicApi).toContain('"SOURCE_CONNECTION_FORBIDDEN"');
    expectSourceContract(publicApi).toContain("sourceConnectionId");
    expectSourceContract(imports).toContain("recordSourceConnectionActivity");
    expectSourceContract(imports).toContain(
      "sourceConnectionId: params.sourceConnectionId ?? null"
    );

    expectSourceContract(router).toContain(
      "getSourceAnalytics(ctx.user.id, input.days)"
    );
    expectSourceContract(router).toContain("z.literal(7)");
    expectSourceContract(router).toContain("z.literal(30)");
    expectSourceContract(router).toContain("z.literal(90)");
    expectSourceContract(router).toContain("listSourceHealthHistoryForUser(");
    expectSourceContract(router).toContain(
      "getSourceConnectionForUser(ctx.user.id, input.id)"
    );
    expectSourceContract(sources).toContain("contactsDeduplicated");
    expectSourceContract(sources).toContain("successRate");
    expectSourceContract(sources).toContain("latestActivityAt");
    expectSourceContract(sources).toContain("claimSourceHealthSchedulerRun");

    expectSourceContract(schema).toContain("export const sourceConnections");
    expectSourceContract(schema).toContain("export const sourceHealthHistory");
    expectSourceContract(schema).toContain(
      "export const sourceHealthSchedulers"
    );
    expectSourceContract(schema).toContain(
      'sourceConnectionId: integer("sourceConnectionId")'
    );
  });

  it("ships a complete Sources namespace in all seven locale catalogs and bumps the PWA cache", () => {
    const component = readProjectFile(
      "../client/src/components/SourceSetupGuide.tsx"
    );
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

    for (const locale of localePaths) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      );
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
    expectSourceContract(serviceWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );
    expectSourceContract(i18nSource).toContain(
      "/locales/{{lng}}/{{ns}}.json?v=phame61"
    );
    expectSourceContract(component).toContain("const STEP_FALLBACKS");
    expectSourceContract(component).toContain("const RULE_FALLBACKS");
    expectSourceContract(component).toContain("const PROVIDER_FALLBACKS");
    expectSourceContract(component).toContain("const FIELD_FALLBACKS");
    for (const locale of localePaths) {
      expectSourceContract(serviceWorker).toContain(
        `/locales/${locale}/translation.json`
      );
    }
  });
});
