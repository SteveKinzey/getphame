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

  it("shows Life entitlements on the dashboard usage card instead of the Free label or quota", () => {
    const home = readProjectFile("../client/src/pages/Home.tsx");

    expect(home).toContain("getEffectivePlan(profile?.tier, user?.role)");
    expect(home).toContain('effectivePlan === "life" ? t("homePage.lifePlan"');
    expect(home).toContain('`${profile?.freeQuota?.remaining ?? 10}/${profile?.freeQuota?.limit ?? 10}`');
    expect(home).toContain('profile?.freeQuota?.phase === "rolling"');
  });

  it("renders a distinct localized administrator badge in the sidebar", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(layout).toContain('user?.role === "admin"');
    expect(layout).toContain('data-testid="admin-sidebar-badge"');
    expect(layout).toContain('t("account.administrator"');
    expect(layout).toContain("<ShieldCheck");
  });

  it("requires a clear plan-switch confirmation before handing Monthly or Annual users to Stripe", () => {
    const dialog = readProjectFile("../client/src/components/PlanSwitchDialog.tsx");
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");
    const settings = readProjectFile("../client/src/pages/Settings.tsx");

    expect(dialog).toContain('currentPlan === "monthly" ? "annual" : "monthly"');
    expect(dialog).toContain('t("paidUser.switchConfirm.currentPlan"');
    expect(dialog).toContain('t("paidUser.switchConfirm.newPlan"');
    expect(dialog).toContain('t("paidUser.switchConfirm.timing"');
    expect(dialog).toContain("onConfirm();");
    expect(upgrade).toContain("setPlanSwitchOpen(true)");
    expect(settings).toContain("setPlanSwitchOpen(true)");
    expect(upgrade).toContain("<PlanSwitchDialog");
    expect(settings).toContain("<PlanSwitchDialog");
  });

  it("keeps user management administrator-only and exposes explicit role plus Life controls", () => {
    const routers = readProjectFile("./routers.ts");
    const adminUsers = readProjectFile("../client/src/pages/AdminUsers.tsx");

    expect(routers).toContain("listUsers: adminProcedure");
    expect(routers).toContain("setUserRole: adminProcedure");
    expect(routers).toContain("setLifeAccess: adminProcedure");
    expect(routers).toContain("You cannot remove your own administrator access");
    expect(adminUsers).toContain("trpc.admin.listUsers.useQuery");
    expect(adminUsers).toContain("trpc.admin.setUserRole.useMutation");
    expect(adminUsers).toContain("trpc.admin.setLifeAccess.useMutation");
    expect(adminUsers).toContain('id="admin-user-search"');
    expect(adminUsers).toContain('account.role === "admin"');
    expect(adminUsers).toContain("account.lifeAccess");
    expect(adminUsers).toContain("Stored plan: {{tier}}");
  });

  it("shows recurring renewal context and confirms successful Stripe returns in app", () => {
    const routers = readProjectFile("./routers.ts");
    const stripe = readProjectFile("./stripe.ts");
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");
    const paymentSuccess = readProjectFile("../client/src/pages/PaymentSuccess.tsx");

    expect(routers).toContain("currentPeriodEnd: snapshot.currentPeriodEnd");
    expect(stripe).toContain("/payment-success?stripe=1&plan=${plan}");
    expect(layout).toContain("subscription?.currentPeriodEnd");
    expect(upgrade).toContain("subscriptionStatus?.currentPeriodEnd");
    expect(paymentSuccess).toContain('t("paymentSuccess.confirmed"');
    expect(paymentSuccess).toContain('params.get("stripe") !== "1"');
  });

  it("localizes the plan-switch modal and administrator badge in every supported locale", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-TW"];

    for (const locale of locales) {
      const messages = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`),
      );

      expect(messages.paidUser.switchConfirm.title).toBeTruthy();
      expect(messages.paidUser.switchConfirm.currentPlan).toBeTruthy();
      expect(messages.paidUser.switchConfirm.newPlan).toBeTruthy();
      expect(messages.paidUser.switchConfirm.timing).toBeTruthy();
      expect(messages.paidUser.switchConfirm.cancel).toBeTruthy();
      expect(messages.paidUser.switchConfirm.continue).toBeTruthy();
      expect(messages.account.administrator).toBeTruthy();
      expect(messages.account.administratorAccount).toBeTruthy();
    }
  });
});
