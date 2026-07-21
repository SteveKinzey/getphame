import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../client/src/pages/Upgrade.tsx", import.meta.url),
  "utf8",
);

describe("upgrade pricing layout", () => {
  it("uses the approved public product screenshot instead of the retired private asset", () => {
    expect(source).toContain(
      'const UPGRADE_IMG = "https://assets.getphame.app/phame-app-screenshot.png";',
    );
    expect(source).toContain("https://assets.getphame.app/getphame-logo-mark.webp");
    expect(source).not.toContain("/manus-storage/getphame-pro-whiteboard-growth_3e9448fc.png");
    expect(source).toContain("onError={() => setUpgradeImageFailed(true)}");
    expect(source).toContain("<UpgradeVisualFallback />");
  });

  it("defines a three-plan desktop grid with a deliberate tablet and mobile reflow", () => {
    expect(source).toContain('data-testid="upgrade-plan-grid"');
    expect(source).toMatch(/sm:grid-cols-2\s+lg:grid-cols-3/);
    expect(source).toMatch(/sm:col-span-2\s+lg:col-span-1/);
    expect(source).toContain('data-testid={`upgrade-plan-card-${plan}`}');
    expect(source).toContain('const PLAN_ORDER: Plan[] = ["monthly", "annual", "lifetime"];');
  });

  it("keeps each card connected to the existing secure plan-specific checkout path", () => {
    expect(source).toContain("function handleStripeCheckout(plan: Plan = selectedPlan)");
    expect(source).toContain("onCheckout={handleStripeCheckout}");
    expect(source).toContain("onClick={() => onCheckout(plan)}");
  });
});
