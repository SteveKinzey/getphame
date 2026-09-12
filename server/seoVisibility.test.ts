import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const quoted = (value: string) => `["']${escapeRegExp(value)}["']`;

describe("public SEO visibility", () => {
  it("publishes direct Organization and SoftwareApplication schema plus complete root social cards", () => {
    const html = readProjectFile("../client/index.html");

    expect(html).toMatch(/id\s*=\s*["']getphame-organization-jsonld["']/);
    expect(html).toMatch(/["']@type["']\s*:\s*["']Organization["']/);
    expect(html).toMatch(
      /id\s*=\s*["']getphame-software-application-jsonld["']/
    );
    expect(html).toMatch(/["']@type["']\s*:\s*["']SoftwareApplication["']/);
    expect(html).toMatch(
      /property\s*=\s*["']og:type["']\s+content\s*=\s*["']website["']/
    );
    expect(html).toMatch(
      /property\s*=\s*["']og:title["']\s+content\s*=\s*["']Get Phame \| Review Request Software for Local Businesses["']/
    );
    expect(html).toMatch(
      /property\s*=\s*["']og:url["']\s+content\s*=\s*["']https:\/\/getphame\.app\/["']/
    );
    expect(html).toMatch(/property\s*=\s*["']og:image:alt["']/);
    expect(html).toMatch(
      /name\s*=\s*["']twitter:card["']\s+content\s*=\s*["']summary_large_image["']/
    );
    expect(html).toMatch(
      /name\s*=\s*["']twitter:title["']\s+content\s*=\s*["']Get Phame \| Review Request Software for Local Businesses["']/
    );
    expect(html).toMatch(/name\s*=\s*["']twitter:image:alt["']/);
  });

  it("keeps feature page metadata, social images, visible-FAQ schema, internal links, and public routes aligned", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const footer = readProjectFile(
      "../client/src/components/landing/Footer.tsx"
    );
    const seoHead = readProjectFile(
      "../client/src/components/landing/SEOHead.tsx"
    );
    const featurePage = readProjectFile("../client/src/pages/FeaturePage.tsx");
    const reviewRequests = readProjectFile(
      "../client/src/pages/ReviewRequests.tsx"
    );
    const emailCampaigns = readProjectFile(
      "../client/src/pages/EmailCampaigns.tsx"
    );
    const reputationManagement = readProjectFile(
      "../client/src/pages/ReputationManagement.tsx"
    );
    const authGateIndex = app.search(/if\s*\(\s*!user\s*\)/);

    for (const route of [
      "/review-requests",
      "/email-campaigns",
      "/reputation-management",
    ]) {
      const routeIndex = app.search(
        new RegExp(`if\\s*\\(\\s*path\\s*===\\s*${quoted(route)}\\s*\\)`)
      );
      expect(routeIndex).toBeGreaterThan(-1);
      expect(routeIndex).toBeLessThan(authGateIndex);
      expect(footer).toMatch(new RegExp(`href\\s*=\\s*${quoted(route)}`));
      expect(featurePage).toMatch(new RegExp(`href\\s*:\\s*${quoted(route)}`));
    }

    expect(reviewRequests).toMatch(/reviewRequestsFeature/);
    expect(emailCampaigns).toMatch(/emailCampaignsFeature/);
    expect(reputationManagement).toMatch(/reputationManagementFeature/);
    expect(featurePage).toMatch(/Review\s+Request\s+Software/);
    expect(featurePage).toMatch(/Email\s+Campaigns\s+for\s+Review\s+Requests/);
    expect(featurePage).toMatch(/Reputation\s+Management\s+Software/);
    expect(featurePage).toMatch(/<SEOHead\b/);
    for (const image of [
      "UhORQpjNTcwKpeBp.webp",
      "uvvaVNerCoMHTwhX.webp",
      "vHMUvHplgLmsaIxk.webp",
    ]) {
      expect(featurePage).toMatch(
        new RegExp(
          `socialImage\\s*:\\s*${quoted(`https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/${image}`)}`
        )
      );
    }
    expect(featurePage).not.toMatch(/\/manus-storage\//);
    expect(featurePage).toMatch(/getFeatureFaqJsonLd/);
    expect(featurePage).toMatch(/["']@type["']\s*:\s*["']FAQPage["']/);
    expect(featurePage).toMatch(/mainEntity\s*:\s*feature\.faq\.map/);
    expect(featurePage).toMatch(/jsonLd\s*=\s*\{\s*faqJsonLd\s*\}/);
    expect(featurePage).toMatch(/comparisonRows\s*:/);
    expect(featurePage).toMatch(
      /data-public-feature-comparison\s*=\s*["']true["']/
    );
    expect(featurePage).toMatch(/Compare\s+the\s+workflow,\s+not\s+the\s+hype/);
    expect(featurePage).toMatch(/Common\s+fragmented\s+approach/);
    expect(featurePage).toMatch(
      /data-public-feature-related-features\s*=\s*["']true["']/
    );
    expect(featurePage).toMatch(
      /featureLinks\.filter\(\s*link\s*=>\s*link\.slug\s*!==\s*feature\.slug\s*\)/
    );
    expect(featurePage).toMatch(
      /aria-label\s*=\s*["']Related Get Phame features["']/
    );
    expect(seoHead).toMatch(/setOG\(\s*["']og:image["']/);
    expect(seoHead).toMatch(/setTwitter\(\s*["']twitter:card["']/);
    expect(seoHead).toMatch(/meta\[name\s*=\s*["']keywords["']\]/);
    expect(seoHead).toMatch(/data-seo-head-jsonld/);
    expect(seoHead).toMatch(/toAbsoluteUrl/);
  });
});
