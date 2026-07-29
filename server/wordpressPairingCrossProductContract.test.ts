import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Contract = {
  contractVersion: number;
  application: {
    start: { path: string; cacheControl: string; rateLimit: { status: number; retryAfterBodyField: string } };
    claim: {
      pathTemplate: string;
      secretHeader: string;
      invalidStatus: number;
      invalidBody: { error: string; code: string };
      cacheControl: string;
      forbiddenFailureFields: string[];
    };
  };
  applicationUi: {
    notFoundKind: string;
    unavailableKind: string;
    notFoundTranslationKeys: string[];
    unavailableTranslationKeys: string[];
    notFoundAlertTestId: string;
    unavailableAlertTestId: string;
  };
};

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const contract = JSON.parse(read("contracts/wordpress-pairing-contract.json")) as Contract;

function localizedValue(resource: unknown, dottedKey: string) {
  return dottedKey.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, resource);
}

describe("WordPress cross-product pairing contract", () => {
  it("binds public start and generic claim failures to the canonical HTTP contract", () => {
    const publicApi = read("server/publicApi.ts");

    expect(contract.contractVersion).toBe(1);
    expect(publicApi).toContain(`app.post("${contract.application.start.path}"`);
    expect(publicApi).toContain(`app.post("${contract.application.claim.pathTemplate.replace("{pairingId}", ":pairingId")}"`);
    expect(publicApi).toContain(`req.header("${contract.application.claim.secretHeader}")`);
    expect(publicApi).toContain(`code: "${contract.application.claim.invalidBody.code}"`);
    expect(publicApi).toContain(`error: "${contract.application.claim.invalidBody.error}"`);
    expect(publicApi).toContain(`res.status(${contract.application.claim.invalidStatus})`);
    expect(publicApi).toContain(`res.status(${contract.application.start.rateLimit.status})`);
    expect(publicApi).toContain(contract.application.start.rateLimit.retryAfterBodyField);
    expect(publicApi.match(/res\.setHeader\("Cache-Control", "no-store"\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the shared limiter atomic, privacy-preserving, and independent of process memory", () => {
    const limiter = read("server/wordpressPairingRateLimit.ts");
    const schema = read("drizzle/schema.ts");

    expect(limiter).toContain("onDuplicateKeyUpdate");
    expect(limiter).toContain("fingerprintAuthValue");
    expect(limiter).not.toContain("new Map");
    expect(schema).toContain("wordpressPairingRateLimitWindows");
    expect(schema).toContain("wordpress_pairing_rate_limit_dimension_window_unique");
  });

  it("keeps both recovery kinds accessible and localized in every supported locale", () => {
    const page = read("client/src/pages/DeveloperIntegrations.tsx");
    const resources = JSON.parse(read("client/src/lib/i18nCompleteFallbackResources.json")) as Record<string, unknown>;

    expect(page).toContain(`return code === "NOT_FOUND" ? "${contract.applicationUi.notFoundKind}" : "${contract.applicationUi.unavailableKind}"`);
    expect(page).toContain("role=\"alert\"");
    expect(page).toContain("data-testid={`wordpress-pairing-${wordpressPairingFailure}`}");
    expect(`${contract.applicationUi.notFoundAlertTestId} ${contract.applicationUi.unavailableAlertTestId}`).toContain("wordpress-pairing-");

    for (const [locale, resource] of Object.entries(resources)) {
      for (const key of [
        ...contract.applicationUi.notFoundTranslationKeys,
        ...contract.applicationUi.unavailableTranslationKeys,
      ]) {
        const value = localizedValue(resource, key);
        expect(value, `${locale}:${key}`).toEqual(expect.any(String));
        expect((value as string).trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("forbids credential-bearing fields in generic failure fixtures", () => {
    const endpointTest = read("server/publicApi.wordpressPairing.test.ts");
    for (const field of contract.application.claim.forbiddenFailureFields) {
      expect(endpointTest).toContain(`expect(response.body).not.toHaveProperty("${field}")`);
    }
  });
});
