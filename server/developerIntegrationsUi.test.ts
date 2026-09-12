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

describe("Developer Integrations workspace", () => {
  it("registers a protected app route and persistent desktop/tablet navigation entry", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(app).toMatch(
      /lazy\(\s*\(\)\s*=>\s*import\("\.\/pages\/DeveloperIntegrations"\)\s*\)/
    );
    expect(app).toMatch(
      /<Route\s+path="\/developer"\s+component=\{DeveloperIntegrationsPage\}\s*\/>/
    );
    expect(layout).toMatch(/\{\s*path:\s*"\/developer"/);
    expectSourceContract(layout).toContain('defaultValue: "Developer"');
  });

  it("keeps the workspace discoverable on mobile through Settings", () => {
    const settings = readProjectFile("../client/src/pages/Settings.tsx");

    expectSourceContract(settings).toContain(
      'onClick={() => navigate("/developer")}'
    );
    expectSourceContract(settings).toContain(
      'defaultValue: "Open developer workspace"'
    );
    expect(settings).not.toContain("trpc.apiKey.generate.useMutation");
  });

  it("supports scoped creation, optional expiry, rotation, revocation, and one-time secret display", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );

    expectSourceContract(page).toContain('data-testid="developer-key-form"');
    expectSourceContract(page).toContain('"contacts:write"');
    expectSourceContract(page).toContain('"review_requests:send"');
    expectSourceContract(page).toContain("trpc.apiKey.generate.useMutation");
    expectSourceContract(page).toContain("trpc.apiKey.rotate.useMutation");
    expectSourceContract(page).toContain("trpc.apiKey.revoke.useMutation");
    expectSourceContract(page).toContain('data-testid="revealed-api-key"');
    expectSourceContract(page).toContain("setRevealedSecret(null)");
    expect(page).not.toContain('localStorage.setItem("api');
  });

  it("explains and surfaces inactive-key expiration plus temporary abuse suspension", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const keys = readProjectFile("./developerApiKeys.ts");

    expectSourceContract(keys).toContain("365 * 24 * 60 * 60 * 1000");
    expectSourceContract(keys).toContain('statusReason: "inactivity"');
    expectSourceContract(keys).toContain('status: "suspended"');
    expectSourceContract(page).toContain("key.warningLevel");
    expectSourceContract(page).toContain(
      'defaultValue: "Expires within 30 days"'
    );
    expectSourceContract(page).toContain(
      'defaultValue: "Expires within 7 days"'
    );
    expectSourceContract(page).toContain('defaultValue: "Inactive-key expiry"');
    expectSourceContract(page).toContain(
      'defaultValue: "Temporarily suspended by abuse protection.'
    );
    expectSourceContract(page).toContain('key.statusReason === "inactivity"');
    expectSourceContract(page).toContain('key.status === "suspended"');
  });

  it("renders and exports only masked import-history metadata", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const db = readProjectFile("./db.ts");

    expectSourceContract(page).toContain('defaultValue: "Masked email"');
    expectSourceContract(page).toContain("row.email");
    expectSourceContract(page).toContain(
      'defaultValue: "A privacy-safe operational record. Customer emails are masked'
    );
    expectSourceContract(page).toContain('status === "abuse_blocked"');
    expectSourceContract(db).toContain(
      "emailMasked: apiImportEvents.emailMasked"
    );
    expectSourceContract(db).toContain(
      'email: row.emailMasked ?? "Not available"'
    );
  });

  it("offers a protected versioned WordPress Connector download from the workspace", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const router = readProjectFile("./routers.ts");

    expectSourceContract(page).toContain("trpc.connector.download.useMutation");
    expectSourceContract(page).toContain(
      'data-testid="wordpress-connector-download"'
    );
    expectSourceContract(page).toContain(
      'defaultValue: "Download WordPress Connector"'
    );
    expectSourceContract(router).toContain(
      'storageGet( "connectors/get-phame-connector-2.2.0.zip" )'
    );
    expectSourceContract(router).toContain(
      'fileName: "get-phame-connector-2.2.0.zip"'
    );
  });

  it("provides a no-delivery payload simulator without exposing an API key", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const router = readProjectFile("./routers.ts");
    const api = readProjectFile("./publicApi.ts");

    expectSourceContract(page).toContain(
      'data-testid="webhook-verification-simulator"'
    );
    expectSourceContract(page).toContain(
      "trpc.apiKey.simulateContactImport.useMutation"
    );
    expectSourceContract(page).toContain('name="webhook-simulator-payload"');
    expectSourceContract(page).toContain("CONTACT_IMPORT_SIMULATOR_EXAMPLE");
    expect(page).not.toContain("gp_live_");
    expectSourceContract(router).toContain(
      "simulateContactImport: protectedProcedure"
    );
    expectSourceContract(router).toContain(
      "validateContactImportPayload(input.payload)"
    );
    expectSourceContract(api).toContain(
      "validateContactImportPayload(input: unknown)"
    );
    expectSourceContract(api).toContain("contactImportSchema.safeParse");
  });

  it("documents the canonical consent-aware import endpoint for every approved builder without embedding a raw key", () => {
    const guide = readProjectFile(
      "../client/src/components/IntegrationGuide.tsx"
    );

    expectSourceContract(guide).toContain("`${BASE_URL}/api/v1/contacts`");
    expect(guide).not.toContain("/api/public/send");
    expectSourceContract(guide).toContain('"wsform"');
    expectSourceContract(guide).toContain('"gravity"');
    expectSourceContract(guide).toContain('"fluent"');
    expectSourceContract(guide).toContain('"elementor"');
    expectSourceContract(guide).toContain('"generic"');
    expectSourceContract(guide).toContain('"curl"');
    expectSourceContract(guide).toContain("consentConfirmed");
    expectSourceContract(guide).toContain("Idempotency-Key");
    expectSourceContract(guide).toContain(
      'const API_KEY_PLACEHOLDER = "<YOUR_GET_PHAME_API_KEY>"'
    );
    expect(guide).not.toContain("gp_live_");
    expect(guide).not.toContain("apiKeyRaw");
    expectSourceContract(guide).toContain("never inserts an existing raw key");
  });

  it("turns generic WordPress pairing failures into accessible recovery guidance without exposing raw server errors", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );

    expectSourceContract(page).toContain(
      'return code === "NOT_FOUND" ? "not_found" : "unavailable"'
    );
    expectSourceContract(page).toContain(
      "{ enabled: Boolean(wordpressPairingId), retry: false }"
    );
    expectSourceContract(page).toContain('role="alert"');
    expectSourceContract(page).toContain(
      "data-testid={`wordpress-pairing-${wordpressPairingFailure}`}"
    );
    expectSourceContract(page).toContain(
      "developerIntegrations.wordpressPairing.notFoundDescription"
    );
    expectSourceContract(page).toContain(
      "developerIntegrations.wordpressPairing.failurePrivacy"
    );
    expectSourceContract(page).toContain(
      'wordpressPairingFailure === "not_found" ? "bg-rose-100 text-rose-800"'
    );
    expectSourceContract(page).toContain(
      'wordpressPairingFailure === "unavailable" ? "bg-amber-100 text-amber-900"'
    );
    expectSourceContract(page).toContain("focus-visible:ring-amber-700");
    expectSourceContract(page).toContain("focus-visible:ring-offset-2");
    expect(page).not.toContain("wordpressPairingQuery.error.message");
    expect(page).not.toContain("approveWordPressPairing.error.message");
  });

  it("ships pairing recovery copy in every served locale", () => {
    for (const locale of ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"]) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      );
      const pairing = catalog.developerIntegrations?.wordpressPairing;

      expect(pairing?.notFoundTitle).toBeTypeOf("string");
      expect(pairing?.notFoundDescription).toBeTypeOf("string");
      expect(pairing?.unavailableDescription).toBeTypeOf("string");
      expect(pairing?.failurePrivacy).toBeTypeOf("string");
    }
  });

  it("ships Connector CTA copy in every served locale and offline fallback", () => {
    const fallback = JSON.parse(
      readProjectFile("../client/src/lib/i18nCompleteFallbackResources.json")
    );
    for (const locale of ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"]) {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      );
      expect(catalog.developerIntegrations?.connector?.download).toBeTypeOf(
        "string"
      );
      expect(
        fallback[locale]?.developerIntegrations?.connector?.download
      ).toBeTypeOf("string");
    }
  });
});
