import { describe, expect, it } from "vitest";
import {
  buildGuideShareUrls,
  GUIDE_LANDING_URL,
  normalizeLeadEmail,
  validateLeadEmail,
} from "../client/src/lib/leadCapture";

describe("landing guide capture helpers", () => {
  it("normalizes addresses before validation and submission", () => {
    expect(normalizeLeadEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
    expect(validateLeadEmail("  Owner@Example.COM  ")).toEqual({
      normalized: "owner@example.com",
      error: null,
    });
  });

  it.each([
    ["", "required"],
    ["not-an-email", "format"],
    ["missing@domain", "format"],
    ["two words@example.com", "format"],
  ])("rejects invalid input %j with %s guidance", (input, expectedError) => {
    expect(validateLeadEmail(input).error).toBe(expectedError);
  });

  it("builds encoded X and LinkedIn share URLs without visitor data", () => {
    const urls = buildGuideShareUrls();
    const twitter = new URL(urls.twitter);
    const linkedin = new URL(urls.linkedin);

    expect(twitter.origin + twitter.pathname).toBe("https://twitter.com/intent/tweet");
    expect(twitter.searchParams.get("url")).toBe(GUIDE_LANDING_URL);
    expect(twitter.searchParams.get("text")).toContain("Get Phame");
    expect(linkedin.origin + linkedin.pathname).toBe("https://www.linkedin.com/sharing/share-offsite/");
    expect(linkedin.searchParams.get("url")).toBe(GUIDE_LANDING_URL);
    expect(urls.twitter + urls.linkedin).not.toMatch(/@|email|recipient/i);
  });
});
