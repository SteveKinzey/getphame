import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Google OAuth branding-verification homepage", () => {
  it("states the application category and workflow above the fold", () => {
    const hero = read("client/src/components/landing/Hero.tsx");

    expect(hero).toContain("Review-request email software for local businesses");
    expect(hero).toContain("landing.purpose.steps.customers");
    expect(hero).toContain("landing.purpose.steps.send");
    expect(hero).toContain("landing.purpose.steps.reviews");
    expect(hero).toContain("initial: false as const");
    expect(hero).not.toContain("initial: { opacity: 0");
    expect(hero.indexOf('role="note"')).toBeLessThan(hero.indexOf("href={loginUrl}"));
  });

  it("keeps the explicit app-purpose and limited Google sign-in disclosure on the public homepage", () => {
    const landingPage = read("client/src/pages/LandingPage.tsx");
    const purpose = read("client/src/components/landing/AppPurpose.tsx");

    expect(landingPage.indexOf("<AppPurpose />")).toBeGreaterThan(landingPage.indexOf("<Hero />"));
    expect(purpose).toContain("What Get Phame does");
    expect(purpose).toContain("We do not request access to your Gmail messages, contacts, Google Drive files, or Google Calendar");
    expect(purpose).toContain("Privacy Policy");
  });

  it("publishes a reviewer-facing product category in every supported landing locale", () => {
    for (const locale of ["en", "es", "fr", "th", "zh-CN", "zh-TW"]) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/landing.json`));
      expect(catalog.landing.hero.categoryLabel).toBeTruthy();
      expect(catalog.landing.hero.description).toContain("Get Phame");
      expect(catalog.landing.purpose.description).toContain("Get Phame");
      expect(catalog.landing.purpose.googleDescription).toBeTruthy();
    }
  });

  it("refreshes cached landing translations for returning reviewers", () => {
    const i18n = read("client/src/lib/i18n.ts");
    expect(i18n).toContain("{{ns}}.json?v=phame17");
  });

  it("keeps root SEO metadata and navigation-logo alternative text within the required limits", () => {
    const indexHtml = read("client/index.html");
    const landingPage = read("client/src/pages/LandingPage.tsx");
    const brandLockup = read("client/src/components/BrandLockup.tsx");
    const title = "Get Phame | Review Request Software for Local Businesses";
    const description = "Send personalized review-request emails, track engagement, and help local businesses earn more customer feedback with Get Phame.";
    const keywords = [
      "review request software",
      "review request emails",
      "customer review management",
      "local business reputation",
      "Google review requests",
      "email review campaigns",
    ];

    expect(title).toHaveLength(56);
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description).toHaveLength(128);
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(keywords).toHaveLength(6);
    expect(indexHtml).toContain(`<title>${title}</title>`);
    expect(indexHtml).toContain(`name="description" content="${description}"`);
    expect(indexHtml).toContain(`name="keywords" content="${keywords.join(", ")}"`);
    expect(landingPage).toContain(`title="${title}"`);
    expect(landingPage).toContain(`description="${description}"`);
    expect(brandLockup).toContain('alt="Get Phame logo"');
    expect(brandLockup).not.toContain('alt=""');
  });
});
