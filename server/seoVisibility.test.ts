import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("public SEO visibility", () => {
  it("publishes direct Organization and SoftwareApplication schema plus complete root social cards", () => {
    const html = readProjectFile("../client/index.html");

    expect(html).toContain('id="getphame-organization-jsonld"');
    expect(html).toContain('"@type": "Organization"');
    expect(html).toContain('id="getphame-software-application-jsonld"');
    expect(html).toContain('"@type": "SoftwareApplication"');
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:title" content="Get Phame | Review Request Software for Local Businesses"');
    expect(html).toContain('property="og:url" content="https://getphame.app/"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:title" content="Get Phame | Review Request Software for Local Businesses"');
    expect(html).toContain('name="twitter:image:alt"');
  });

  it("keeps feature page metadata, internal links, and public routes aligned", () => {
    const app = readProjectFile("../client/src/App.tsx");
    const footer = readProjectFile("../client/src/components/landing/Footer.tsx");
    const seoHead = readProjectFile("../client/src/components/landing/SEOHead.tsx");
    const featurePage = readProjectFile("../client/src/pages/FeaturePage.tsx");
    const reviewRequests = readProjectFile("../client/src/pages/ReviewRequests.tsx");
    const emailCampaigns = readProjectFile("../client/src/pages/EmailCampaigns.tsx");
    const reputationManagement = readProjectFile("../client/src/pages/ReputationManagement.tsx");
    const authGateIndex = app.indexOf("if (!user)");

    for (const route of ["/review-requests", "/email-campaigns", "/reputation-management"]) {
      expect(app.indexOf(`if (path === \"${route}\")`)).toBeGreaterThan(-1);
      expect(app.indexOf(`if (path === \"${route}\")`)).toBeLessThan(authGateIndex);
      expect(footer).toContain(`href="${route}"`);
      expect(featurePage).toContain(`href: "${route}"`);
    }

    expect(reviewRequests).toContain("reviewRequestsFeature");
    expect(emailCampaigns).toContain("emailCampaignsFeature");
    expect(reputationManagement).toContain("reputationManagementFeature");
    expect(featurePage).toContain("Review Request Software");
    expect(featurePage).toContain("Email Campaigns for Review Requests");
    expect(featurePage).toContain("Reputation Management Software");
    expect(featurePage).toContain("<SEOHead");
    expect(seoHead).toContain('setOG("og:image"');
    expect(seoHead).toContain('setTwitter("twitter:card"');
    expect(seoHead).toContain('meta[name="keywords"]');
  });
});
