import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/components/BottomNav.tsx", import.meta.url),
  "utf8"
);

describe("authenticated mobile footer layout", () => {
  it("keeps the gold ribbon scoped to mobile navigation", () => {
    expect(source).toContain(
      'className="md:hidden fixed bottom-0 left-0 right-0'
    );
    expect(source).toContain(
      'className="rr-bg-gold px-4 pt-2 pb-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] sm:px-5"'
    );
    expect(source).toContain("env(safe-area-inset-bottom)");
  });

  it("uses compact-screen-safe grids and touch targets for localized footer links", () => {
    expect(source).toMatch(
      /data-testid=["']mobile-footer-primary-links["'][\s\S]*?className=["']grid grid-cols-3 gap-1["']/
    );
    expect(source).toMatch(
      /data-testid=["']mobile-footer-secondary-links["'][\s\S]*?className=["']mx-auto mt-1 grid max-w-56 grid-cols-2 gap-1["']/
    );
    expect(source).toContain("min-h-9 min-w-0 rounded-md");
  });

  it("truncates long localized primary-navigation labels on compact phones instead of splitting words", () => {
    expect(source).toContain(
      'className="block w-full truncate px-0.5 text-center text-[9px]'
    );
    expect(source).toContain("sm:whitespace-normal sm:text-xs");
    expect(source).toContain("aria-label={accessibleLabel}");
    expect(source).toContain("premiumConversion.marker.contains");
    expect(source).toContain("nav.mobileSettings");
    expect(source).toContain("nav.mobileDashboard");
    expect(source).toContain("nav.mobileAdmin");
    expect(source).toContain('data-auto-localize="off"');
    expect(source).toContain('className="sm:hidden"');
  });

  it("renders Privacy Policy, Terms of Service, and Compliance on the first row", () => {
    const primaryStart = source.search(
      /data-testid=["']mobile-footer-primary-links["']/
    );
    const secondaryStart = source.search(
      /data-testid=["']mobile-footer-secondary-links["']/
    );
    const primaryRow = source.slice(primaryStart, secondaryStart);

    expect(primaryStart).toBeGreaterThan(-1);
    expect(secondaryStart).toBeGreaterThan(primaryStart);
    expect(primaryRow.search(/footer\.privacyPolicy/)).toBeLessThan(
      primaryRow.search(/footer\.termsOfService/)
    );
    expect(primaryRow.search(/footer\.termsOfService/)).toBeLessThan(
      primaryRow.search(/footer\.compliance/)
    );
    expect(primaryRow).not.toContain("footer.whatsNew");
    expect(primaryRow).not.toContain("navigate('/security')");
  });

  it("renders Security and What's New on the second row in that order", () => {
    const secondaryStart = source.search(
      /data-testid=["']mobile-footer-secondary-links["']/
    );
    const copyrightStart = source.indexOf("{/* Copyright notice */}");
    const secondaryRow = source.slice(secondaryStart, copyrightStart);

    expect(secondaryStart).toBeGreaterThan(-1);
    expect(copyrightStart).toBeGreaterThan(secondaryStart);
    expect(
      secondaryRow.search(/navigate\(\s*["']\/security["']\s*\)/)
    ).toBeLessThan(secondaryRow.search(/footer\.whatsNew/));
    expect(secondaryRow).not.toContain("footer.compliance");
  });
});
