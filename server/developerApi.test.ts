import express from "express";
import { describe, expect, it } from "vitest";
import {
  DEVELOPER_API_KEY_INACTIVITY_MS,
  DEVELOPER_API_KEY_URGENT_WARNING_MS,
  DEVELOPER_API_KEY_WARNING_MS,
  DEVELOPER_API_SCOPES,
  buildDeveloperApiKeyHint,
  describeDeveloperApiKeyLifecycle,
  developerApiKeyHasScope,
  getDeveloperApiKeyInactivityExpiresAt,
  hashDeveloperApiKey,
  parseDeveloperApiScopes,
  type DeveloperApiPrincipal,
} from "./developerApiKeys";
import { hashDeveloperApiRequest } from "./developerApiImports";
import {
  normalizeContactImportPayload,
  registerPublicApiRoutes,
} from "./publicApi";

describe("developer API key security helpers", () => {
  it("parses only supported scopes and removes duplicates", () => {
    expect(
      parseDeveloperApiScopes('["contacts:write","contacts:write","unknown"]')
    ).toEqual(["contacts:write"]);
    expect(parseDeveloperApiScopes(null)).toEqual([]);
    expect(DEVELOPER_API_SCOPES).toContain("review_requests:send");
  });

  it("derives a non-secret display prefix and a deterministic full hash", () => {
    const rawKey = `rl_${"a".repeat(64)}`;
    expect(buildDeveloperApiKeyHint(rawKey)).toBe("rl_aaaaa…aaaa");
    expect(hashDeveloperApiKey(rawKey)).toHaveLength(64);
    expect(hashDeveloperApiKey(rawKey)).toBe(hashDeveloperApiKey(rawKey));
    expect(hashDeveloperApiKey(rawKey)).not.toContain(rawKey);
  });

  it("enforces exact scopes from the authenticated principal", () => {
    const principal: DeveloperApiPrincipal = {
      userId: 1,
      apiKeyId: 2,
      label: "Forms",
      scopes: ["contacts:write"],
      expiresAt: null,
      inactivityExpiresAt: Date.now() + DEVELOPER_API_KEY_INACTIVITY_MS,
    };
    expect(developerApiKeyHasScope(principal, "contacts:write")).toBe(true);
    expect(developerApiKeyHasScope(principal, "review_requests:send")).toBe(
      false
    );
  });

  it("expires keys after twelve months without a successful use and resets from the last successful use", () => {
    const createdAt = Date.UTC(2025, 0, 1);
    const lastUsedAt = createdAt + 60 * 24 * 60 * 60 * 1000;
    expect(
      getDeveloperApiKeyInactivityExpiresAt({ createdAt, lastUsedAt: null })
    ).toBe(createdAt + DEVELOPER_API_KEY_INACTIVITY_MS);
    expect(
      getDeveloperApiKeyInactivityExpiresAt({ createdAt, lastUsedAt })
    ).toBe(lastUsedAt + DEVELOPER_API_KEY_INACTIVITY_MS);

    const expired = describeDeveloperApiKeyLifecycle(
      {
        createdAt,
        lastUsedAt: null,
        revokedAt: null,
        expiresAt: null,
      },
      createdAt + DEVELOPER_API_KEY_INACTIVITY_MS + 1
    );
    expect(expired).toMatchObject({
      status: "expired",
      statusReason: "inactivity",
    });
  });

  it("surfaces thirty-day and seven-day warnings plus temporary abuse suspensions", () => {
    const createdAt = Date.UTC(2025, 0, 1);
    const inactivityExpiresAt = createdAt + DEVELOPER_API_KEY_INACTIVITY_MS;
    const warning = describeDeveloperApiKeyLifecycle(
      { createdAt, lastUsedAt: null, revokedAt: null, expiresAt: null },
      inactivityExpiresAt - DEVELOPER_API_KEY_WARNING_MS
    );
    const urgent = describeDeveloperApiKeyLifecycle(
      { createdAt, lastUsedAt: null, revokedAt: null, expiresAt: null },
      inactivityExpiresAt - DEVELOPER_API_KEY_URGENT_WARNING_MS
    );
    const suspended = describeDeveloperApiKeyLifecycle(
      {
        createdAt,
        lastUsedAt: null,
        revokedAt: null,
        expiresAt: null,
        suspendedAt: createdAt + 1,
        suspensionExpiresAt: createdAt + 60_000,
        suspensionReason: "send_account_burst",
      },
      createdAt + 2
    );

    expect(warning.warningLevel).toBe("warning");
    expect(urgent.warningLevel).toBe("urgent");
    expect(suspended).toMatchObject({
      status: "suspended",
      statusReason: "send_account_burst",
    });
  });
});

describe("developer API import primitives", () => {
  it("hashes identical normalized payloads consistently", () => {
    const payload = JSON.stringify({
      email: "person@example.com",
      sourceApp: "gravity-forms",
    });
    expect(hashDeveloperApiRequest(payload)).toHaveLength(64);
    expect(hashDeveloperApiRequest(payload)).toBe(
      hashDeveloperApiRequest(payload)
    );
    expect(hashDeveloperApiRequest(payload)).not.toBe(
      hashDeveloperApiRequest(`${payload} `)
    );
  });

  it("registers public routes without requiring runtime credentials", () => {
    const app = express();
    expect(() => registerPublicApiRoutes(app)).not.toThrow();
  });

  it("normalizes flat form-builder consent aliases without weakening affirmative consent", () => {
    expect(
      normalizeContactImportPayload({
        name: "Jordan Lee",
        email: "jordan@example.com",
        consentConfirmed: "yes",
        consentBasis: "customer_relationship",
        consentCapturedAt: "2026-07-22T20:00:00.000Z",
        consentSource: "Website service form",
      })
    ).toMatchObject({
      consent: {
        confirmed: true,
        basis: "customer_relationship",
        capturedAt: "2026-07-22T20:00:00.000Z",
        source: "Website service form",
      },
    });

    expect(
      normalizeContactImportPayload({ consentConfirmed: "false" })
    ).toMatchObject({
      consent: { confirmed: "false" },
    });
  });
});
