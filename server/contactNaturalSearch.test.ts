import { describe, expect, it } from "vitest";
import type { SavedContact } from "../drizzle/schema";
import {
  CONTACT_SEARCH_RESULT_LIMIT,
  filterContactsByNaturalQuery,
  interpretContactSearchQuery,
  parseContactSearchFallback,
  redactContactSearchSecrets,
  runNaturalContactSearch,
  toContactSearchResult,
} from "./contactNaturalSearch";

function contact(overrides: Partial<SavedContact> = {}): SavedContact {
  return {
    id: 1,
    userId: 10,
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+15550000001",
    notes: "Priority account",
    lastSentAt: null,
    totalSent: 0,
    tags: JSON.stringify(["VIP"]),
    source: "stripe",
    externalId: "cus_private_reference",
    sourceApp: "Stripe",
    importedViaApiKeyId: 99,
    consentBasis: "checkout",
    consentCapturedAt: Date.UTC(2026, 0, 2),
    consentSource: "private checkout record",
    optedOut: 0,
    optedOutAt: null,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("contact conversational search", () => {
  it("redacts secret-like values without removing a legitimate contact email", async () => {
    const secret = "gp_live_abcdefghijklmnop";
    const query = `find ada@example.com api_key=${secret}`;
    expect(redactContactSearchSecrets(query)).toEqual({
      text: "find ada@example.com [private value removed]",
      redacted: true,
    });

    let requestBody = "";
    const result = await interpretContactSearchQuery({
      query,
      locale: "en",
      invoke: async (request) => {
        requestBody = JSON.stringify(request);
        throw new Error("model unavailable");
      },
    });

    expect(requestBody).toContain("ada@example.com");
    expect(requestBody).not.toContain(secret);
    expect(result).toMatchObject({ source: "fallback", redacted: true });
    expect(result.filters.text).toBe("ada@example.com");
  });

  it("parses the documented safe fallback examples without accidental text filters", () => {
    expect(parseContactSearchFallback("Stripe contacts with recorded consent who have never been contacted")).toMatchObject({
      text: null,
      source: "stripe",
      sentState: "never",
      consent: "recorded",
    });
    expect(parseContactSearchFallback("Contacts who have never received a request")).toMatchObject({
      text: null,
      sentState: "never",
    });
    expect(parseContactSearchFallback("Customers not contacted in 90 days")).toMatchObject({
      text: null,
      sentState: "dormant",
      dormantDays: 90,
    });
  });

  it("applies source, consent, send-state, and tenant-provided record filters together", () => {
    const filters = parseContactSearchFallback("Stripe contacts with recorded consent who have never been contacted");
    const matches = filterContactsByNaturalQuery([
      contact({ id: 1 }),
      contact({ id: 2, source: "manual" }),
      contact({ id: 3, consentBasis: null, consentCapturedAt: null }),
      contact({ id: 4, totalSent: 2, lastSentAt: Date.UTC(2026, 0, 4) }),
    ], filters, Date.UTC(2026, 6, 28));

    expect(matches.map((item) => item.id)).toEqual([1]);
  });

  it("returns only the safe result projection and caps a broad match", async () => {
    const projected = toContactSearchResult(contact());
    expect(projected).toMatchObject({ id: 1, name: "Ada Lovelace", email: "ada@example.com" });
    expect(projected).not.toHaveProperty("userId");
    expect(projected).not.toHaveProperty("externalId");
    expect(projected).not.toHaveProperty("importedViaApiKeyId");
    expect(projected).not.toHaveProperty("consentSource");
    expect(projected).not.toHaveProperty("updatedAt");

    const contacts = Array.from({ length: CONTACT_SEARCH_RESULT_LIMIT + 5 }, (_, index) => contact({ id: index + 1 }));
    const result = await runNaturalContactSearch({
      query: "active contacts",
      locale: "en",
      contacts,
      invoke: async () => { throw new Error("model unavailable"); },
      now: new Date("2026-07-28T00:00:00.000Z"),
    });

    expect(result.matchedCount).toBe(CONTACT_SEARCH_RESULT_LIMIT + 5);
    expect(result.truncated).toBe(true);
    expect(result.results).toHaveLength(CONTACT_SEARCH_RESULT_LIMIT);
  });
});
