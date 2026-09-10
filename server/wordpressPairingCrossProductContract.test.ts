import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Contract = {
  contractVersion: number;
  application: {
    start: {
      path: string;
      cacheControl: string;
      rateLimit: { status: number; retryAfterBodyField: string };
    };
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
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const contract = JSON.parse(
  read("contracts/wordpress-pairing-contract.json")
) as Contract;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const quoted = (value: string) => `["']${escapeRegExp(value)}["']`;

function localizedValue(resource: unknown, dottedKey: string) {
  return dottedKey.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, resource);
}

describe("WordPress cross-product pairing contract", () => {
  it("binds public start and generic claim failures to the canonical HTTP contract", () => {
    const publicApi = read("server/publicApi.ts");
    const claimPath = contract.application.claim.pathTemplate.replace(
      "{pairingId}",
      ":pairingId"
    );

    expect(contract.contractVersion).toBe(1);
    expect(publicApi).toMatch(
      new RegExp(`app\\.post\\(\\s*${quoted(contract.application.start.path)}`)
    );
    expect(publicApi).toMatch(
      new RegExp(`app\\.post\\(\\s*${quoted(claimPath)}`)
    );
    expect(publicApi).toMatch(
      new RegExp(
        `req\\.header\\(\\s*${quoted(contract.application.claim.secretHeader)}\\s*\\)`
      )
    );
    expect(publicApi).toMatch(
      new RegExp(
        `code\\s*:\\s*${quoted(contract.application.claim.invalidBody.code)}`
      )
    );
    expect(publicApi).toMatch(
      new RegExp(
        `error\\s*:\\s*${quoted(contract.application.claim.invalidBody.error)}`
      )
    );
    expect(publicApi).toMatch(
      new RegExp(
        `res\\.status\\(\\s*${contract.application.claim.invalidStatus}\\s*\\)`
      )
    );
    expect(publicApi).toMatch(
      new RegExp(
        `res\\.status\\(\\s*${contract.application.start.rateLimit.status}\\s*\\)`
      )
    );
    expect(publicApi).toMatch(
      new RegExp(
        escapeRegExp(contract.application.start.rateLimit.retryAfterBodyField)
      )
    );
    expect(
      publicApi.match(
        /res\.setHeader\(\s*["']Cache-Control["']\s*,\s*["']no-store["']\s*\)/g
      )?.length
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps the shared limiter atomic, privacy-preserving, and independent of process memory", () => {
    const limiter = read("server/wordpressPairingRateLimit.ts");
    const schema = read("drizzle/schema.ts");

    expect(limiter).toMatch(/onDuplicateKeyUpdate/);
    expect(limiter).toMatch(/fingerprintAuthValue/);
    expect(limiter).not.toMatch(/new\s+Map/);
    expect(schema).toMatch(/wordpressPairingRateLimitWindows/);
    expect(schema).toMatch(
      /wordpress_pairing_rate_limit_dimension_window_unique/
    );
  });

  it("keeps both recovery kinds accessible and localized in every supported locale", () => {
    const page = read("client/src/pages/DeveloperIntegrations.tsx");
    const resources = JSON.parse(
      read("client/src/lib/i18nCompleteFallbackResources.json")
    ) as Record<string, unknown>;

    expect(page).toMatch(
      new RegExp(
        `return\\s+code\\s*===\\s*${quoted("NOT_FOUND")}\\s*\\?\\s*${quoted(contract.applicationUi.notFoundKind)}\\s*:\\s*${quoted(contract.applicationUi.unavailableKind)}`
      )
    );
    expect(page).toMatch(/role\s*=\s*["']alert["']/);
    expect(page).toMatch(
      /data-testid\s*=\s*\{\s*`wordpress-pairing-\$\{wordpressPairingFailure\}`\s*\}/
    );
    expect(
      `${contract.applicationUi.notFoundAlertTestId} ${contract.applicationUi.unavailableAlertTestId}`
    ).toContain("wordpress-pairing-");

    for (const [locale, resource] of Object.entries(resources)) {
      for (const key of [
        ...contract.applicationUi.notFoundTranslationKeys,
        ...contract.applicationUi.unavailableTranslationKeys,
      ]) {
        const value = localizedValue(resource, key);
        expect(value, `${locale}:${key}`).toEqual(expect.any(String));
        expect(
          (value as string).trim().length,
          `${locale}:${key}`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("forbids credential-bearing fields in generic failure fixtures", () => {
    const endpointTest = read("server/publicApi.wordpressPairing.test.ts");
    for (const field of contract.application.claim.forbiddenFailureFields) {
      expect(endpointTest).toMatch(
        new RegExp(
          `expect\\(\\s*response\\.body\\s*\\)\\s*\\.\\s*not\\s*\\.\\s*toHaveProperty\\(\\s*${quoted(field)}\\s*\\)`
        )
      );
    }
  });
});
