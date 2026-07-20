import { describe, expect, it } from "vitest";
import { renderPublicFeatureHtml, shouldPrerenderUserAgent } from "./publicFeaturePrerender";

const feature = {
  route: "/review-requests" as const,
  title: "Review Request Software for Local Businesses | Get Phame",
  description: "Create personalized review request emails, direct customers to the right review link, and track campaign engagement from one simple workspace.",
  keywords: ["review request software", "review request emails", "customer feedback", "local business reviews"],
  socialImage: "/manus-storage/getphame-review-requests-og_54168ce9.png",
  socialImageAlt: "Abstract email and destination-link workflow illustration for Get Phame Review Requests",
  headline: "Make every review request feel like a personal follow-up",
  introduction: "Get Phame helps local businesses send timely, branded review requests without turning a customer relationship into a bulk-email exercise.",
  faq: [
    { question: "Can I use my own business email?", answer: "Yes. Get Phame is designed to send through the email account your business already uses for customer communication." },
  ],
};

const template = `<!doctype html><html><head><title>Default title</title><meta name="description" content="Default description"><meta property="og:image" content="https://assets.getphame.app/default.png"><link rel="canonical" href="https://getphame.app/"></head><body><div id="root"></div></body></html>`;

describe("public feature prerender", () => {
  it("injects route-specific metadata, visible FAQ schema, and crawlable feature content into the root shell", () => {
    const html = renderPublicFeatureHtml(template, feature);

    expect(html).toContain("<title>Review Request Software for Local Businesses | Get Phame</title>");
    expect(html).toContain('property="og:url" content="https://getphame.app/review-requests"');
    expect(html).toContain('property="og:image" content="https://getphame.app/manus-storage/getphame-review-requests-og_54168ce9.png"');
    expect(html).toContain('id="getphame-feature-faq-jsonld"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain("Can I use my own business email?");
    expect(html).toContain('data-prerendered-public-feature="true"');
    expect(html).toContain('data-feature-route="/review-requests"');
  });

  it("serves crawler-ready route HTML only to recognized social and search crawlers", () => {
    expect(shouldPrerenderUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(shouldPrerenderUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(shouldPrerenderUserAgent("Twitterbot/1.0")).toBe(true);
    expect(shouldPrerenderUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBe(false);
  });
});
