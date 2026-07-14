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

  it("orders the shared language selector as EN, CN, ES, FR, TH, TW, uses the USA flag, and preserves hidden Italian work", () => {
    const flyout = readProjectFile("../client/src/components/LanguageFlyout.tsx");
    const i18n = readProjectFile("../client/src/lib/i18n.ts");
    const preservedItalian = readProjectFile("../client/public/locales/it/translation.json");
    const localeOrder = [
      '{ code: "en"',
      '{ code: "zh-CN"',
      '{ code: "es"',
      '{ code: "fr"',
      '{ code: "th"',
      '{ code: "zh-TW"',
    ];

    let previousIndex = -1;
    for (const locale of localeOrder) {
      const currentIndex = flyout.indexOf(locale);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }

    expect(flyout).toContain('flag: "🇺🇸"');
    expect(flyout).not.toContain('flag: "🇬🇧"');
    expect(flyout).not.toContain('{ code: "it"');
    expect(i18n).toContain(
      'export const SUPPORTED_LANGS = ["en", "zh-CN", "es", "fr", "th", "zh-TW"] as const;',
    );
    expect(preservedItalian).toContain('"account"');
  });

  it("discloses that WooCommerce synchronization requires a paid plan in every supported language", () => {
    const faq = readProjectFile("../client/src/components/landing/FAQ.tsx");
    const paidPlanPhrases: Record<string, string> = {
      en: "paid plans",
      es: "planes de pago",
      fr: "formules payantes",
      it: "piani a pagamento",
      th: "แผนแบบชำระเงิน",
      "zh-CN": "付费方案",
      "zh-TW": "付費方案",
    };

    expect(faq).toContain("The WooCommerce connector is available only on paid plans.");
    expect(faq).not.toContain("Install our free WooCommerce plugin");

    for (const [locale, paidPlanPhrase] of Object.entries(paidPlanPhrases)) {
      const bundle = JSON.parse(
        readProjectFile(
          locale === "it"
            ? "../client/public/locales/it/translation.json"
            : `../client/public/locales/${locale}/landing.json`,
        ),
      ) as {
        faq?: { a11: string };
        landing?: { faq: { a11: string } };
      };
      const localizedFaq = bundle.landing?.faq ?? bundle.faq;

      expect(localizedFaq?.a11).toContain(paidPlanPhrase);
      expect(localizedFaq?.a11.toLowerCase()).not.toContain("free woocommerce");
    }
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

  it("places a translated logout action between the theme control and unchanged profile block", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");
    const themeIndex = layout.indexOf("{/* Theme toggle */}");
    const logoutIndex = layout.indexOf("data-testid=\"sidebar-logout\"");
    const profileIndex = layout.indexOf("{/* User avatar */}");

    expect(themeIndex).toBeGreaterThan(-1);
    expect(logoutIndex).toBeGreaterThan(themeIndex);
    expect(profileIndex).toBeGreaterThan(logoutIndex);
    expect(layout).toContain('t("logout.button", { defaultValue: "Log Out" })');
    expect(layout).toContain('void logout().then(() => navigate("/"))');
    expect(layout).toContain("<LogOut");
  });

  it("keeps translated logout reachable from the mobile More menu", () => {
    const bottomNav = readProjectFile("../client/src/components/BottomNav.tsx");

    expect(bottomNav).toContain("<DropdownMenu");
    expect(bottomNav).toContain('data-testid="mobile-logout"');
    expect(bottomNav).toContain("t('logout.button', { defaultValue: 'Log Out' })");
    expect(bottomNav).toContain("void logout().then(() => navigate('/'))");
    expect(bottomNav).toContain("<LogOut");
  });

  it("replaces authenticated magic-link onboarding URLs with the app home route", () => {
    const app = readProjectFile("../client/src/App.tsx");

    expect(app).toContain('window.location.pathname !== "/onboarding"');
    expect(app).toContain('navigate("/", { replace: true })');
  });

  it("uses first-party secure cookie policy behind the managed proxy", () => {
    const cookies = readProjectFile("./_core/cookies.ts");
    const server = readProjectFile("./_core/index.ts");

    expect(cookies).toContain('sameSite: "lax"');
    expect(cookies).toContain("secure: isSecureRequest(req)");
    expect(server).toContain('app.set("trust proxy", 1)');
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
