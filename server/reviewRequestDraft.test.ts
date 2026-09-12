import { describe, expect, it } from "vitest";
import {
  buildSafePlatformLinks,
  containsDirectYelpLink,
  getFallbackReviewRequestDraft,
  getReviewPlatformValue,
  renderReviewRequestDraft,
  wrapPlainTextReviewRequestHtml,
} from "../shared/reviewRequestDraft";

describe("review request draft rendering", () => {
  it("replaces Yelp listing URLs with a plain-text business search instruction", () => {
    const platforms = [
      { platform: "google", label: "Google", url: "https://g.page/r/example" },
      {
        platform: "yelp",
        label: "Yelp",
        url: "https://www.yelp.com/biz/example",
      },
    ];

    const links = buildSafePlatformLinks(platforms, "Acme Bakery");

    expect(links).toContain("- Google: https://g.page/r/example");
    expect(links).toContain('- Yelp: Search "Acme Bakery" on Yelp');
    expect(links).not.toContain("yelp.com/biz");
    expect(getReviewPlatformValue(platforms[1], "Acme Bakery")).toBe(
      'Search "Acme Bakery" on Yelp'
    );
  });

  it("renders supported placeholders and sanitizes a direct Yelp link inside edited copy", () => {
    const rendered = renderReviewRequestDraft(
      "Hi {{customerName}} from {{business_name}}. {{reviewLink}} {{platformLinks}} https://yelp.com/biz/acme",
      {
        customerName: "Sam",
        businessName: "Acme Bakery",
        reviewValue: "https://g.page/r/example",
        platformLinks: "- Google: https://g.page/r/example",
      }
    );

    expect(rendered).toContain("Hi Sam from Acme Bakery.");
    expect(rendered).toContain("https://g.page/r/example");
    expect(rendered).toContain(
      '- Google: https://g.page/r/example Search "Acme Bakery" on Yelp'
    );
    expect(containsDirectYelpLink(rendered)).toBe(false);
  });

  it("escapes edited body HTML before preserving line breaks", () => {
    const html = wrapPlainTextReviewRequestHtml(
      "Hello <script>alert('x')</script>\nNext line"
    );

    expect(html).toContain(
      "&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;<br>Next line"
    );
    expect(html).not.toContain("<script>");
  });

  it("uses neutral fallback copy with review and unsubscribe placeholders", () => {
    const draft = getFallbackReviewRequestDraft();

    expect(draft.subject).toContain("{{businessName}}");
    expect(draft.body).toContain("honest feedback");
    expect(draft.body).toContain("{{platformLinks}}");
    expect(draft.body).toContain('reply with "unsubscribe"');
    expect(draft.body).not.toContain("great experience");
  });
});
