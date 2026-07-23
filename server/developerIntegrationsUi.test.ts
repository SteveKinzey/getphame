import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Developer Integrations workspace", () => {
  it("registers a protected app route and persistent desktop/tablet navigation entry", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(app).toContain('lazy(() => import("./pages/DeveloperIntegrations"))');
    expect(app).toContain('<Route path="/developer" component={DeveloperIntegrationsPage} />');
    expect(layout).toContain('{ path: "/developer"');
    expect(layout).toContain('defaultValue: "Developer"');
  });

  it("keeps the workspace discoverable on mobile through Settings", () => {
    const settings = readProjectFile("../client/src/pages/Settings.tsx");

    expect(settings).toContain('onClick={() => navigate("/developer")}');
    expect(settings).toContain('defaultValue: "Open developer workspace"');
    expect(settings).not.toContain("trpc.apiKey.generate.useMutation");
  });

  it("supports scoped creation, optional expiry, rotation, revocation, and one-time secret display", () => {
    const page = readProjectFile("../client/src/pages/DeveloperIntegrations.tsx");

    expect(page).toContain('data-testid="developer-key-form"');
    expect(page).toContain('"contacts:write"');
    expect(page).toContain('"review_requests:send"');
    expect(page).toContain('trpc.apiKey.generate.useMutation');
    expect(page).toContain('trpc.apiKey.rotate.useMutation');
    expect(page).toContain('trpc.apiKey.revoke.useMutation');
    expect(page).toContain('data-testid="revealed-api-key"');
    expect(page).toContain('setRevealedSecret(null)');
    expect(page).not.toContain('localStorage.setItem("api');
  });

  it("explains and surfaces inactive-key expiration plus temporary abuse suspension", () => {
    const page = readProjectFile("../client/src/pages/DeveloperIntegrations.tsx");
    const keys = readProjectFile("./developerApiKeys.ts");

    expect(keys).toContain("365 * 24 * 60 * 60 * 1000");
    expect(keys).toContain('statusReason: "inactivity"');
    expect(keys).toContain('status: "suspended"');
    expect(page).toContain("key.warningLevel");
    expect(page).toContain('defaultValue: "Expires within 30 days"');
    expect(page).toContain('defaultValue: "Expires within 7 days"');
    expect(page).toContain('defaultValue: "Inactive-key expiry"');
    expect(page).toContain('defaultValue: "Temporarily suspended by abuse protection.');
    expect(page).toContain('key.statusReason === "inactivity"');
    expect(page).toContain('key.status === "suspended"');
  });

  it("renders and exports only masked import-history metadata", () => {
    const page = readProjectFile("../client/src/pages/DeveloperIntegrations.tsx");
    const db = readProjectFile("./db.ts");

    expect(page).toContain('defaultValue: "Masked email"');
    expect(page).toContain("row.email");
    expect(page).toContain('defaultValue: "A privacy-safe operational record. Customer emails are masked');
    expect(page).toContain('status === "abuse_blocked"');
    expect(db).toContain("emailMasked: apiImportEvents.emailMasked");
    expect(db).toContain('email: row.emailMasked ?? "Not available"');
  });

  it("documents the canonical consent-aware import endpoint for every approved builder without embedding a raw key", () => {
    const guide = readProjectFile("../client/src/components/IntegrationGuide.tsx");

    expect(guide).toContain('`${BASE_URL}/api/v1/contacts`');
    expect(guide).not.toContain("/api/public/send");
    expect(guide).toContain('"wsform"');
    expect(guide).toContain('"gravity"');
    expect(guide).toContain('"fluent"');
    expect(guide).toContain('"elementor"');
    expect(guide).toContain('"generic"');
    expect(guide).toContain('"curl"');
    expect(guide).toContain("consentConfirmed");
    expect(guide).toContain("Idempotency-Key");
    expect(guide).toContain('const API_KEY_PLACEHOLDER = "gp_live_YOUR_API_KEY"');
    expect(guide).not.toContain("apiKeyRaw");
    expect(guide).toContain("never inserts an existing raw key");
  });
});
