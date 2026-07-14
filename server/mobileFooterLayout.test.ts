import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/components/BottomNav.tsx", import.meta.url),
  "utf8",
);

describe("authenticated mobile footer layout", () => {
  it("keeps the gold ribbon scoped to mobile navigation", () => {
    expect(source).toContain('className="md:hidden fixed bottom-0 left-0 right-0');
    expect(source).toContain('className="rr-bg-gold px-4 pt-2 pb-1"');
  });

  it("renders Privacy Policy, Terms of Service, and Compliance on the first row", () => {
    const primaryStart = source.indexOf('data-testid="mobile-footer-primary-links"');
    const secondaryStart = source.indexOf('data-testid="mobile-footer-secondary-links"');
    const primaryRow = source.slice(primaryStart, secondaryStart);

    expect(primaryStart).toBeGreaterThan(-1);
    expect(secondaryStart).toBeGreaterThan(primaryStart);
    expect(primaryRow.indexOf("footer.privacyPolicy")).toBeLessThan(
      primaryRow.indexOf("footer.termsOfService"),
    );
    expect(primaryRow.indexOf("footer.termsOfService")).toBeLessThan(
      primaryRow.indexOf("footer.compliance"),
    );
    expect(primaryRow).not.toContain("footer.whatsNew");
    expect(primaryRow).not.toContain("navigate('/security')");
  });

  it("renders Security and What's New on the second row in that order", () => {
    const secondaryStart = source.indexOf('data-testid="mobile-footer-secondary-links"');
    const copyrightStart = source.indexOf("{/* Copyright notice */}");
    const secondaryRow = source.slice(secondaryStart, copyrightStart);

    expect(secondaryStart).toBeGreaterThan(-1);
    expect(copyrightStart).toBeGreaterThan(secondaryStart);
    expect(secondaryRow.indexOf("navigate('/security')")).toBeLessThan(
      secondaryRow.indexOf("footer.whatsNew"),
    );
    expect(secondaryRow).not.toContain("footer.compliance");
  });
});
