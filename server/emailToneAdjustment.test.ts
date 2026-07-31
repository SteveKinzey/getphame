import { describe, expect, it } from "vitest";

import {
  adjustEmailTone,
  validateAdjustedReviewDraft,
} from "./emailToneAdjustment";

describe("email tone adjustment", () => {
  const source = {
    subject: "A quick request from {{businessName}}",
    body: "Hi {{customerName}},\n\nPlease share feedback at {{platformLinks}}.\n\nReply unsubscribe to opt out.",
    businessName: "Acme Services",
  };

  it("keeps required placeholders while applying a structured rewrite", async () => {
    const result = await adjustEmailTone({
      ...source,
      tone: "warmer",
      userId: 991_001,
      invoke: async () => ({
        choices: [{ message: { content: JSON.stringify({
          subject: "A warm request from {{businessName}}",
          body: "Hi {{customerName}},\n\nIf you have a moment, we welcome your honest feedback at {{platformLinks}}.\n\nReply unsubscribe to opt out.",
          rationales: [
            { field: "subject", rationale: "Uses a warmer, more inviting opening." },
            { field: "body", rationale: "Softens the request while retaining a respectful, neutral ask." },
          ],
        }) } }],
      }) as never,
    });

    expect(result.subject).toContain("{{businessName}}");
    expect(result.body).toContain("{{customerName}}");
    expect(result.body).toContain("{{platformLinks}}");
    expect(result.rationales).toEqual([
      { field: "subject", rationale: "Uses a warmer, more inviting opening." },
      { field: "body", rationale: "Softens the request while retaining a respectful, neutral ask." },
    ]);
  });

  it("rejects a changed draft when its rationale exposes a required placeholder", async () => {
    await expect(adjustEmailTone({
      ...source,
      tone: "professional",
      userId: 991_002,
      invoke: async () => ({
        choices: [{ message: { content: JSON.stringify({
          subject: "A professional request from {{businessName}}",
          body: source.body,
          rationales: [{ field: "subject", rationale: "Highlights {{businessName}} with a formal voice." }],
        }) } }],
      }) as never,
    })).rejects.toThrow("could not adjust this email");
  });

  it("rejects a rewrite that removes a required placeholder", () => {
    expect(() => validateAdjustedReviewDraft({
      sourceSubject: source.subject,
      sourceBody: source.body,
      adjustedSubject: "A quick request",
      adjustedBody: "Hi there, please share your feedback.",
      businessName: source.businessName,
    })).toThrow("required placeholders");
  });

  it("normalizes direct Yelp links into a safe search instruction", () => {
    const result = validateAdjustedReviewDraft({
      sourceSubject: "Feedback for {{businessName}}",
      sourceBody: "Search https://www.yelp.com/biz/acme and reply unsubscribe to opt out.",
      adjustedSubject: "Feedback for {{businessName}}",
      adjustedBody: "Search https://www.yelp.com/biz/acme and reply unsubscribe to opt out.",
      businessName: "Acme Services",
    });

    expect(result.body).toContain('Search "Acme Services" on Yelp');
    expect(result.body).not.toContain("yelp.com");
  });
});
