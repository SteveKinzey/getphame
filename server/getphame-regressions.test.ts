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
    expect(lockup).toContain("https://assets.getphame.app/getphame-logo.svg");
    expect(lockup).toContain("Get&nbsp;");
    expect(lockup).toContain(">Phame</span>");
    expect(lockup).not.toContain("phame-wordmark-transparent-clean.png");
  });

  it("uses the supplied P-star artwork for browser, PWA, metadata, and in-app branding", () => {
    const html = readProjectFile("../client/index.html");
    const manifest = readProjectFile("../client/public/manifest.json");
    const appLayout = readProjectFile("../client/src/components/AppLayout.tsx");
    const bottomNav = readProjectFile("../client/src/components/BottomNav.tsx");
    const home = readProjectFile("../client/src/pages/Home.tsx");

    expect(html).toContain('href="https://assets.getphame.app/getphame-logo.svg"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/favicon-16x16.png"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('"logo": "https://assets.getphame.app/getphame-logo-512.png"');
    expect(manifest).toContain('"src": "/icons/icon-192.png"');
    expect(manifest).toContain('"src": "/icons/icon-512.png"');
    expect(manifest).toContain('"src": "/icons/icon-maskable-192.png"');
    expect(manifest).toContain('"src": "/icons/icon-maskable-512.png"');
    expect(manifest).toContain('"purpose": "maskable"');

    for (const source of [html, manifest, appLayout, bottomNav, home]) {
      expect(source).not.toContain("getphame-logo-mark.webp");
    }
  });

  it("uses the official mark alone at constrained authenticated widths and restores the full lockup when space permits", () => {
    const appLayout = readProjectFile("../client/src/components/AppLayout.tsx");
    const home = readProjectFile("../client/src/pages/Home.tsx");
    const styles = readProjectFile("../client/src/index.css");

    expect(appLayout).toContain('className="flex justify-center lg:hidden"');
    expect(appLayout).toContain('className="hidden lg:block"');
    expect(appLayout).toContain("showText={false}");
    expect(appLayout).not.toContain('textClassName="app-sidebar-brand-text text-lg hidden"');
    expect(home).toContain('className="home-brand-full"');
    expect(home).toContain('className="home-brand-mark shrink-0"');
    expect(home).toMatch(/home-brand-mark shrink-0[\s\S]*?showText=\{false\}/);
    expect(styles).toContain("@media (min-width: 640px) and (max-width: 1279px)");
    expect(styles).toContain(".home-brand-full { display: none; }");
    expect(styles).toContain(".home-brand-mark { display: block; }");
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

  it("keeps both follow-up stages independently configurable with projected dates and honest timing performance", () => {
    const settings = readProjectFile("../client/src/pages/Settings.tsx");
    const reminders = readProjectFile("./reminders.ts");
    const router = readProjectFile("./routers.ts");
    const scheduledReminders = readProjectFile("./scheduledReminders.ts");
    const serverIndex = readProjectFile("./_core/index.ts");

    expect(settings).toContain("value={followUpDelayInput}");
    expect(settings).toContain("onChange={(e) => setFollowUpDelayInput(e.target.value)}");
    expect(settings).toContain("value={followUpSecondDelayInput}");
    expect(settings).toContain("onChange={(e) => setFollowUpSecondDelayInput(e.target.value)}");
    expect(settings).toContain("FOLLOW_UP_DELAY_PRESETS.map");
    expect(settings).toContain("!followUpTimingHasChanges");
    expect(settings).toContain("utils.reminders.getSettings.invalidate()");
    expect(settings).toContain('toast.success("Follow-up settings saved!")');
    expect(settings).toContain("editedFollowUpDelayDays + editedFollowUpSecondDelayDays");
    expect(settings).toContain('aria-label="Enable first follow-up"');
    expect(settings).toContain('aria-label="Enable second follow-up"');
    expect(settings).toContain("getProjectedFollowUpDates");
    expect(settings).toContain("Timing performance");
    expect(settings).toContain("directional last-touch attribution");
    expect(settings).toContain("reminderPerformance.slice(0, 6)");
    expect(router).toContain("followUpSecondDelayDays: z.number().int().min(1).max(14)");
    expect(router).toContain("followUpSecondDelayDays: input.followUpSecondDelayDays");
    expect(router).toContain("followUpFirstEnabled: z.number().int().min(0).max(1)");
    expect(router).toContain("followUpSecondEnabled: z.number().int().min(0).max(1)");
    expect(router).toContain("timingPerformance: protectedProcedure.query");
    expect(reminders).toContain("profile?.followUpSecondDelayDays ?? 7");
    expect(reminders).toContain("firstStageEnabledSnapshot");
    expect(reminders).toContain("secondStageEnabledSnapshot");
    expect(reminders).toContain("getAffectedRows(claimResult) !== 1");
    expect(scheduledReminders).toContain("reminderHeartbeatHandler");
    expect(serverIndex).toContain('app.post("/api/scheduled/process-reminders", reminderHeartbeatHandler)');
    expect(serverIndex).not.toContain("startReminderScheduler");
  });

  it("keeps form values, placeholders, autofill, disabled, and read-only content readable in both themes", () => {
    const styles = readProjectFile("../client/src/index.css");
    const input = readProjectFile("../client/src/components/ui/input.tsx");
    const textarea = readProjectFile("../client/src/components/ui/textarea.tsx");
    const select = readProjectFile("../client/src/components/ui/select.tsx");
    const settings = readProjectFile("../client/src/pages/Settings.tsx");

    expect(styles).toContain("color: var(--foreground);");
    expect(styles).toContain("color: var(--muted-foreground);");
    expect(styles).toContain(".rr-form-field");
    expect(styles).toContain("-webkit-text-fill-color: var(--card-foreground);");
    expect(styles).toContain(".dark :is(input, textarea, select).bg-white");
    expect(input).toContain('"rr-form-field');
    expect(textarea).toContain('"rr-form-field');
    expect(select).toContain('"rr-form-field');
    expect(settings.match(/rr-form-field/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("shows Life entitlements on the dashboard usage card instead of the Free label or quota", () => {
    const home = readProjectFile("../client/src/pages/Home.tsx");
    const quotaStatus = readProjectFile("../client/src/components/FreeQuotaStatus.tsx");

    expect(home).toContain("getEffectivePlan(profile?.tier, user?.role)");
    expect(home).toContain('effectivePlan === "life" ? t("homePage.lifePlan"');
    expect(home).toContain("<FreeQuotaStatus");
    expect(quotaStatus).toContain('data-testid="free-quota-status"');
    expect(quotaStatus).toContain('quota?.phase === "rolling"');
  });

  it("wires the isolated 10-to-5 Free quota transition into the production database path", () => {
    const database = readProjectFile("./db.ts");
    const quota = readProjectFile("../shared/quota.ts");
    const constants = readProjectFile("../shared/const.ts");

    expect(database).toContain("offset(FREE_INITIAL_REQUESTS - 1)");
    expect(database).toContain("const postInitial = or(");
    expect(database).toContain("gte(customerRequests.sentAt, cutoff), postInitial");
    expect(database).toContain("return buildFreeQuotaSummary({");
    expect(quota).toContain("FREE_INITIAL_REQUESTS ? \"initial\" : \"rolling\"");
    expect(constants).toContain("FREE_INITIAL_REQUESTS = 10");
    expect(constants).toContain("FREE_ROLLING_REQUESTS = 5");
    expect(constants).toContain("FREE_ROLLING_WINDOW_DAYS = 30");
  });

  it("uses one Free quota decision service for in-app and public API sends", () => {
    const routers = readProjectFile("./routers.ts");
    const publicApi = readProjectFile("./publicApi.ts");
    const enforcement = readProjectFile("./quotaEnforcement.ts");

    expect(routers).toContain("evaluateFreeQuotaAccess(userId, tier)");
    expect(publicApi).toContain("evaluateFreeQuotaAccess(userId, profile.tier)");
    expect(publicApi).not.toContain("total >= FREE_LIMIT");
    expect(enforcement).toContain('tier !== "free"');
    expect(enforcement).toContain('=== "admin"');
    expect(enforcement).toContain("allowed: !quota.blocked");
  });

  it("renders initial, rolling, and blocked Free quota states in the dashboard", () => {
    const home = readProjectFile("../client/src/pages/Home.tsx");
    const quotaStatus = readProjectFile("../client/src/components/FreeQuotaStatus.tsx");

    expect(home).toContain("<FreeQuotaStatus");
    expect(quotaStatus).toContain('quota?.phase === "rolling"');
    expect(quotaStatus).toContain('t("homePage.freeAllowanceMonthly"');
    expect(quotaStatus).toContain('t("homePage.freeAllowanceInitial"');
    expect(quotaStatus).toContain("quota?.blocked && quota.nextAvailableAt");
    expect(quotaStatus).toContain('t("homePage.nextFreeRequest"');
  });

  it("renders a distinct localized administrator badge in the sidebar", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(layout).toContain('user?.role === "admin"');
    expect(layout).toContain('data-testid="admin-sidebar-badge"');
    expect(layout).toContain('t("account.administrator"');
    expect(layout).toContain("<ShieldCheck");
  });

  it("keeps translated logout inside the account menu after the theme control", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");
    const themeIndex = layout.indexOf("{/* Theme toggle */}");
    const accountMenuIndex = layout.indexOf("data-testid=\"sidebar-account-menu-trigger\"");
    const logoutIndex = layout.indexOf("data-testid=\"sidebar-logout\"");

    expect(themeIndex).toBeGreaterThan(-1);
    expect(accountMenuIndex).toBeGreaterThan(themeIndex);
    expect(logoutIndex).toBeGreaterThan(accountMenuIndex);
    expect(layout).toContain('aria-label={t("profileMenu.open"');
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

  it("routes every administrator control to a centralized secured operations hub", () => {
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");
    const bottomNav = readProjectFile("../client/src/components/BottomNav.tsx");
    const dashboard = readProjectFile("../client/src/pages/AdminDashboard.tsx");
    const reminderPerformance = readProjectFile("../client/src/pages/AdminReminderPerformance.tsx");
    const app = readProjectFile("../client/src/App.tsx");
    const routers = readProjectFile("./routers.ts");

    expect(layout).toContain('user?.role === "admin"');
    expect(layout).toContain('navigate("/admin")');
    expect(layout).toContain('data-testid="admin-sidebar-badge"');
    expect(bottomNav).toContain("user?.role === 'admin'");
    expect(bottomNav).toContain("path: '/admin'");
    expect(dashboard).toContain('data-testid="admin-operations-hub"');
    expect(dashboard).toContain('path: "/admin/users"');
    expect(dashboard).toContain('path: "/admin/auth-diagnostics"');
    expect(dashboard).toContain('path: "/admin/reminder-performance"');
    expect(dashboard).toContain('path: "/admin/smtp-stats"');
    expect(dashboard).toContain('path: "/admin/revenue"');
    expect(app).toContain('path="/admin/reminder-performance"');
    expect(routers).toContain("stats: adminProcedure");
    expect(routers).toContain("reminderPerformance: adminProcedure");
    expect(routers).toContain("pendingReminders");
    expect(routers).toContain("dueReminders");
    expect(reminderPerformance).toContain('user?.role !== "admin"');
    expect(reminderPerformance).toContain("trpc.admin.reminderPerformance.useQuery");
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

  it("uses the approved GetPhame mark and a responsive professional growth visual on Upgrade", () => {
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");
    expect(upgrade).toContain("/manus-storage/getphame-pro-whiteboard-growth_3e9448fc.png");
    expect(upgrade).toContain("https://assets.getphame.app/getphame-logo.svg");
    expect(upgrade).toContain("GET <span");
    expect(upgrade).toContain("PHAME</span> PRO");
    expect(upgrade).toContain("lg:grid-cols-[0.78fr_1.22fr]");
    expect(upgrade).toContain("max-w-6xl mx-auto");
    expect(upgrade).not.toContain("rr-upgrade-hero.webp");
  });

  it("lets customers close setup immediately from the X, Escape key, backdrop, and every skip route", () => {
    const wizard = readProjectFile("../client/src/components/OnboardingWizard.tsx");
    const app = readProjectFile("../client/src/App.tsx");
    expect(wizard).toContain("const handleDismiss = useCallback(() => {");
    expect(wizard).toContain("onDismiss();");
    expect(wizard).toContain("dismissMutation.mutate(undefined");
    expect(wizard).toContain('event.key === "Escape"');
    expect(wizard).toContain("event.target === event.currentTarget");
    expect(wizard).toContain('aria-modal="true"');
    expect(wizard).toContain("onClick={handleDismiss}");
    expect(wizard).toContain("<Step4Connector onDismiss={handleDismiss} />");
    expect(app).toContain("const onboardingDismissedUserIds = new Set<string>();");
    expect(app).toContain('`getphame:onboarding-dismissed:${userId}`');
    expect(app).toContain('window.localStorage.getItem(onboardingDismissalKey(userId)) === "1"');
    expect(app).toContain('window.localStorage.setItem(onboardingDismissalKey(userId), "1")');
    expect(app).toContain("rememberOnboardingDismissal(userId)");
    expect(app).toContain("<OnboardingWizard onDismiss={dismissOnboardingForSession} />");
  });

  it("keeps daily activity analytics portable by aggregating raw UTC timestamps outside SQL DATE grouping", () => {
    const routers = readProjectFile("./routers.ts");
    const start = routers.indexOf("dailyTrend: protectedProcedure");
    const end = routers.indexOf("overallStats: protectedProcedure");
    const dailyTrend = routers.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(dailyTrend).toContain(".select({ sentAt: crTable.sentAt })");
    expect(dailyTrend).toContain("createdAt: evTable.createdAt");
    expect(dailyTrend).toContain('inArrayOp(evTable.type, ["open", "click"])');
    expect(dailyTrend).toContain("return buildDailyTrend({ days: input.days, nowMs, sendRows, eventRows })");
    expect(dailyTrend).not.toContain("DATE(");
    expect(dailyTrend).not.toContain(".groupBy(");
  });

  it("keeps the cancellation screen localized and wired to distinct refund and renewal actions", () => {
    const churn = readProjectFile("../client/src/pages/ChurnSurvey.tsx");
    const i18n = readProjectFile("../client/src/lib/i18n.ts");
    const routers = readProjectFile("./routers.ts");
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];

    expect(churn).toContain('useTranslation("cancellation")');
    expect(churn).toContain("trpc.stripe.guaranteeStatus.useQuery");
    expect(churn).toContain("trpc.stripe.claimGuarantee.useMutation");
    expect(churn).toContain("trpc.stripe.cancelRenewal.useMutation");
    expect(churn).toContain('t("confirmRefundCheckbox")');
    expect(churn).toContain('t("confirmRenewalCheckbox")');
    expect(churn).toContain('guarantee.data?.reason === "already_refunded"');
    expect(churn).toContain('guarantee.data?.reason === "expired"');
    expect(i18n).toContain('["landing", "translation", "cancellation"]');
    expect(i18n).toContain("v=phame10");
    expect(routers).toContain("guaranteeStatus: protectedProcedure");
    expect(routers).toContain("claimGuarantee: protectedProcedure");
    expect(routers).toContain("cancelRenewal: protectedProcedure");

    for (const locale of locales) {
      const messages = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/cancellation.json`),
      ) as Record<string, string>;
      expect(Object.keys(messages)).toHaveLength(53);
      expect(messages.refundButton).toBeTruthy();
      expect(messages.cancelRenewalButton).toBeTruthy();
      expect(messages.stripeVerified).toBeTruthy();
      expect(messages.eligibleText).toContain("{{amount}}");
      expect(messages.eligibleText).toContain("{{deadline}}");
    }
  });
});
