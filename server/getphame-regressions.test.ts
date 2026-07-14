import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Get Phame regression contracts", () => {
  it("keeps the approved brand lockup and language selector in public navigation", () => {
    const navbar = readProjectFile("../client/src/components/landing/Navbar.tsx");
    const lockup = readProjectFile("../client/src/components/BrandLockup.tsx");

    expect(navbar).toContain("<BrandLockup");
    expect(navbar).toContain("<LanguageFlyout");
    expect(lockup).toContain("https://assets.getphame.app/getphame-logo-mark.webp");
    expect(lockup).toContain("Get&nbsp;");
    expect(lockup).toContain(">Phame</span>");
    expect(lockup).not.toContain("phame-wordmark-transparent-clean.png");
  });

  it("uses the approved lockup throughout both onboarding experiences", () => {
    const guide = readProjectFile("../client/src/components/OnboardingGuide.tsx");
    const wizard = readProjectFile("../client/src/components/OnboardingWizard.tsx");

    expect(guide).toContain("<BrandLockup");
    expect(guide).toContain('id: 0,\n      icon: <BrandLockup showText={false}');
    expect(wizard).toContain("<BrandLockup");
    expect(guide).not.toContain("app-icon-192.png");
    expect(wizard).not.toContain("app-icon-192.png");
  });

  it("keeps account status and plan controls Life-aware", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");

    expect(layout).toContain("PLAN_LABELS[effectivePlan]");
    expect(layout).toContain("canManageSubscription(effectivePlan)");
    expect(upgrade).toContain('effectivePlan === "life"');
    expect(upgrade).toContain("createPortal.mutate");
    expect(upgrade).toContain('navigate("/cancel")');
  });

  it("keeps language access visible while Settings loads a branded skeleton", () => {
    const settings = readProjectFile("../client/src/pages/Settings.tsx");

    expect(settings).toContain("function SettingsSkeleton");
    expect(settings).toContain("<LanguageFlyout");
    expect(settings).toContain("<BrandLockup");
    expect(settings).toContain("profileLoading");
  });
});
