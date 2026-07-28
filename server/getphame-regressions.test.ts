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
    expect(lockup).not.toContain("iconHref");
  });

  it("locks the restored public landing composition, metadata, language control, and footer", () => {
    const landing = readProjectFile("../client/src/pages/LandingPage.tsx");
    const navbar = readProjectFile("../client/src/components/landing/Navbar.tsx");
    const footer = readProjectFile("../client/src/components/landing/Footer.tsx");
    const html = readProjectFile("../client/index.html");

    for (const section of [
      "<Hero />",
      "<AppPurpose />",
      "<TrustBar />",
      "<VideoDemo />",
      "<Features />",
      "<HowItWorks />",
      "<ProductShowcase />",
      "<Stats />",
      "<Pricing />",
      "<Comparison />",
      "<FAQ />",
      "<LeadCapture />",
      "<FinalCTA />",
      "<Footer />",
    ]) {
      expect(landing).toContain(section);
    }

    expect(landing).not.toContain("<SocialProofBar />");
    expect(landing).not.toContain("<Testimonials />");

    expect(landing).toContain("Get Phame | Review Request Software for Local Businesses");
    expect(navbar).toContain("<LanguageFlyout");
    expect(footer).toContain('href="/privacy-policy"');
    expect(footer).toContain('href="/terms-of-service"');
    expect(html).toContain("Get Phame | Review Request Software for Local Businesses");
    expect(html).toContain("Send personalized review-request emails, track engagement, and help local businesses earn more customer feedback with Get Phame.");
    expect(html).toContain('name="keywords"');
  });

  it("keeps translated gold stat headings inside narrow comparison cards", () => {
    const stats = readProjectFile("../client/src/components/landing/Stats.tsx");

    expect(stats).toContain("max-w-full");
    expect(stats).toContain("break-words");
    expect(stats).toContain("text-base");
    expect(stats).toContain("min-[350px]:text-lg");
    expect(stats).toContain("lg:text-2xl");
    expect(stats).toContain("xl:text-3xl");
    expect(stats).not.toContain("text-3xl md:text-4xl");
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

  it("publishes complete social-share and mobile PWA launch contracts", () => {
    const html = readProjectFile("../client/index.html");
    const manifest = JSON.parse(readProjectFile("../client/public/manifest.json")) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ sizes: string; purpose: string }>;
      launch_handler: { client_mode: string[] };
    };
    const serviceWorker = readProjectFile("../client/public/sw.js");
    const offlinePage = readProjectFile("../client/public/offline.html");
    const installPrompt = readProjectFile("../client/src/components/PWAInstallPrompt.tsx");
    const installBanner = readProjectFile("../client/src/components/HomeInstallBanner.tsx");
    const shareHelper = readProjectFile("../client/src/lib/pwaShare.ts");
    const main = readProjectFile("../client/src/main.tsx");
    const styles = readProjectFile("../client/src/index.css");
    const home = readProjectFile("../client/src/pages/Home.tsx");
    const pwaAnalytics = readProjectFile("./pwaAnalytics.ts");
    const app = readProjectFile("../client/src/App.tsx");

    expect(html).toContain('content="width=device-width, initial-scale=1.0, maximum-scale=1, viewport-fit=cover"');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Get Phame"');
    expect(html).toContain('property="og:image" content="https://assets.getphame.app/getphame-og-image.png?v=4"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://assets.getphame.app/getphame-og-image.png?v=4"');
    expect(html).toContain('name="twitter:description"');
    expect(html).toContain('"image": "https://assets.getphame.app/getphame-og-image.png?v=4"');
    expect(html).toContain('property="og:image:type" content="image/png"');
    expect(html.match(/rel="apple-touch-startup-image"/g)).toHaveLength(30);
    expect(html).toContain("launch-iphone-390x844@3x-portrait.png");
    expect(html).toContain("launch-ipad-1024x1366@2x-landscape.png");

    expect(manifest.name).toContain("Get Phame");
    expect(manifest.short_name).toBe("Get Phame");
    expect(manifest.start_url).toBe("/?source=pwa");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#0F1F4B");
    expect(manifest.theme_color).toBe("#0F1F4B");
    expect(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any")).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);
    expect(manifest.launch_handler.client_mode).toContain("navigate-existing");

    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v22'");
    expect(serviceWorker).toContain("'/locales/en/landing.json'");
    expect(serviceWorker).toContain("'/locales/zh-TW/landing.json'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.en.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.es.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.fr.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.it.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.de.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.pt.vtt'");
    expect(serviceWorker).toContain("self.addEventListener('install'");
    expect(serviceWorker).toContain("self.addEventListener('fetch'");
    expect(serviceWorker).toContain("url.pathname.startsWith('/manus-storage/')");
    expect(serviceWorker.indexOf("url.pathname.startsWith('/manus-storage/')"))
      .toBeLessThan(serviceWorker.indexOf("event.respondWith("));
    expect(serviceWorker).toContain("media byte ranges and redirects are handled natively");
    expect(serviceWorker).toContain("const OFFLINE_PAGES = {");
    expect(serviceWorker).toContain("it: '/offline.it.html'");
    expect(serviceWorker).toContain("'zh-CN': '/offline.zh-CN.html'");
    expect(serviceWorker).toContain("event.data.type === 'SET_LANGUAGE'");
    expect(serviceWorker).toContain("return getOfflinePage()");
    expect(serviceWorker).toContain("'/offline.html'");
    expect(serviceWorker).toContain("cache.match('/offline.html')");
    expect(serviceWorker).toContain("return self.clients.claim()");
    expect(offlinePage).toContain("You’re offline");
    expect(offlinePage).toContain("GET PHAME");
    expect(offlinePage).toContain('onclick="window.location.reload()"');
    expect(installPrompt).toContain('window.addEventListener("beforeinstallprompt"');
    expect(installPrompt).toContain('window.addEventListener("appinstalled"');
    expect(installPrompt).toContain("registerPwaInstallRequest");
    expect(installPrompt).toContain("Install Get Phame");
    expect(installPrompt).toContain("Get Phame will appear on your home screen");
    expect(installBanner).toContain('data-testid="home-install-banner"');
    expect(installBanner).toContain("requestPwaInstall");
    expect(installBanner).toContain("installState.eligible && !installState.installed && !dismissed");
    expect(installBanner).toContain('event: "install_banner_viewed"');
    expect(installBanner).toContain('event: "install_banner_clicked"');
    expect(installBanner).toContain('event: "install_banner_dismissed"');
    expect(installBanner).toContain('event: "install_banner_remind_later"');
    expect(installBanner).toContain("ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000");
    expect(installBanner).toContain("window.localStorage.setItem(REMIND_UNTIL_KEY");
    expect(installBanner).toContain('t("pwaInstallBanner.remindLater"');
    expect(installBanner).toContain("home-install-banner-enter");
    expect(installBanner).toContain('typeof window === "undefined"');
    expect(home).toContain("<HomeInstallBanner />");
    expect(home).toContain("shareGetPhame()");
    expect(home).toContain('event: "share_completed"');
    expect(home).toContain('event: "share_copied"');
    expect(home).toContain('event: "share_cancelled"');
    expect(home).toContain('role="status" aria-live="polite"');
    expect(shareHelper).toContain('title: "Get Phame — Turn Happy Customers into 5-Star Reviews"');
    expect(shareHelper).toContain('url: "https://getphame.app/"');
    expect(shareHelper).toContain("getLocalizedGetPhameShareData");
    expect(shareHelper).toContain("navigator.share(await getLocalizedGetPhameShareData())");
    expect(shareHelper).toContain("navigator.clipboard.writeText(GET_PHAME_SHARE_DATA.url");
    expect(main).toContain('postMessage({ type: "SET_LANGUAGE", language })');
    expect(main).toContain('i18n.on("languageChanged", syncCurrentLanguage)');
    expect(styles).toContain("@keyframes homeInstallBannerEnter");
    expect(styles).toContain(".home-install-banner-enter");
    expect(styles).toMatch(/prefers-reduced-motion: reduce[\s\S]*?\.home-install-banner-enter/);
    expect(pwaAnalytics).toContain('"install_banner_viewed"');
    expect(pwaAnalytics).toContain('"install_banner_clicked"');
    expect(pwaAnalytics).toContain('"install_banner_dismissed"');
    expect(pwaAnalytics).toContain('"install_banner_remind_later"');
    expect(app).toMatch(/<AppShell \/>[\s\S]*?<PWAInstallPrompt \/>/);
    expect(app.match(/<PWAInstallPrompt \/>/g)).toHaveLength(1);

    const installCopyKeys = [
      "title",
      "description",
      "cta",
      "iosCta",
      "opening",
      "openingStatus",
      "dismiss",
      "remindLater",
      "shareSuccess",
      "shareCopied",
      "shareCancelled",
      "shareError",
    ];
    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const translations = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`),
      ) as { pwaInstallBanner?: Record<string, unknown> };

      for (const key of installCopyKeys) {
        expect(translations.pwaInstallBanner?.[key], `${locale}.${key}`).toEqual(expect.any(String));
      }

      const localizedOffline = readProjectFile(`../client/public/offline.${locale}.html`);
      expect(localizedOffline).toContain("GET PHAME");
      expect(localizedOffline).toContain('onclick="window.location.reload()"');
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

  it("orders the shared language selector as EN, CN, ES, FR, IT, TH, TW and uses the USA flag", () => {
    const flyout = readProjectFile("../client/src/components/LanguageFlyout.tsx");
    const i18n = readProjectFile("../client/src/lib/i18n.ts");
    const preservedItalian = readProjectFile("../client/public/locales/it/translation.json");
    const localeOrder = [
      '{ code: "en"',
      '{ code: "zh-CN"',
      '{ code: "es"',
      '{ code: "fr"',
      '{ code: "it"',
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
    expect(flyout).toContain('{ code: "it"');
    expect(i18n).toContain(
      'export const SUPPORTED_LANGS = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;',
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

    expect(guide).toContain("<LandingBrandLink");
    expect(guide).toContain('id: 0,\n      icon: <LandingBrandLink showText={false}');
    expect(wizard).toContain("<LandingBrandLink");
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
    expect(settings).toContain("<LandingBrandLink");
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
    expect(stripe).toContain('const CANONICAL_STRIPE_RETURN_ORIGIN = "https://getphame.app"');
    expect(stripe).toContain("getStripeReturnOrigin(origin)");
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

  it("uses the approved GetPhame mark, public product visual, and responsive pricing cards on Upgrade", () => {
    const upgrade = readProjectFile("../client/src/pages/Upgrade.tsx");
    expect(upgrade).toContain("https://assets.getphame.app/phame-app-screenshot.png");
    expect(upgrade).toContain("https://assets.getphame.app/getphame-logo-mark.webp");
    expect(upgrade).toContain("GET <span");
    expect(upgrade).toContain("PHAME</span> PRO");
    expect(upgrade).toContain("lg:grid-cols-[0.78fr_1.22fr]");
    expect(upgrade).toContain('data-testid="upgrade-plan-grid"');
    expect(upgrade).toContain("sm:grid-cols-2 lg:grid-cols-3");
    expect(upgrade).toContain("sm:col-span-2 lg:col-span-1");
    expect(upgrade).toContain("onError={() => setUpgradeImageFailed(true)}");
    expect(upgrade).not.toContain("/manus-storage/getphame-pro-whiteboard-growth_3e9448fc.png");
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
    expect(i18n).toContain("v=phame36");
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

  it("keeps root-page SEO metadata and image alternatives within the required audit limits", () => {
    const html = readProjectFile("../client/index.html");
    const landingPage = readProjectFile("../client/src/pages/LandingPage.tsx");
    const seoHead = readProjectFile("../client/src/components/landing/SEOHead.tsx");
    const appLayout = readProjectFile("../client/src/components/AppLayout.tsx");

    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ?? "";
    const keywords = html.match(/<meta name="keywords" content="([^"]+)"/i)?.[1].split(", ") ?? [];
    expect(title).toBe("Get Phame | Review Request Software for Local Businesses");
    expect(title).toHaveLength(56);
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description).toBe("Send personalized review-request emails, track engagement, and help local businesses earn more customer feedback with Get Phame.");
    expect(description).toHaveLength(128);
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(keywords).toEqual([
      "review request software",
      "review request emails",
      "customer review management",
      "local business reputation",
      "Google review requests",
      "email review campaigns",
    ]);
    expect(keywords.length).toBeGreaterThanOrEqual(3);
    expect(keywords.length).toBeLessThanOrEqual(8);
    expect(landingPage).toContain('title="Get Phame | Review Request Software for Local Businesses"');
    expect(landingPage).toContain('description="Send personalized review-request emails, track engagement, and help local businesses earn more customer feedback with Get Phame."');
    expect(html).toContain('meta name="keywords"');

    expect(seoHead).toContain("document.title = title");
    expect(seoHead).toContain('keywords.join(", ")');
    expect(seoHead).toContain('meta[name="keywords"]');
    expect(appLayout).not.toContain('alt=""');
    expect(appLayout).toContain('profile photo`');
    expect(appLayout).toContain('"Get Phame account profile"');
  });

  it("keeps the public header readable and anchored to the landing document for signed-in visitors", () => {
    const navbar = readProjectFile("../client/src/components/landing/Navbar.tsx");

    expect(navbar).toContain('["/", "/landing"].includes(window.location.pathname)');
    expect(navbar).toContain('href="/landing"');
    expect(navbar).toContain('`/landing${link.href}`');
    expect(navbar).toContain('className="hidden lg:flex items-center');
    expect(navbar).toContain('className="hidden lg:flex shrink-0');
    expect(navbar).toContain('className="lg:hidden flex items-center');
    expect(navbar).not.toContain('className="hidden md:flex items-center gap-8"');
  });

  it("uses the shared full-width public footer and one complete copyright statement", () => {
    const layout = readProjectFile("../client/src/components/PublicLayout.tsx");
    const footer = readProjectFile("../client/src/components/landing/Footer.tsx");
    const app = readProjectFile("../client/src/App.tsx");

    expect(layout).toContain("<Navbar />");
    expect(layout).toContain("<Footer />");
    expect(footer).toContain('className="w-full border-t');
    expect(footer).toContain('defaultValue: "© {{year}} Get Phame. All rights reserved."');
    expect(footer).toContain('href="/privacy-policy"');
    expect(footer).toContain('href="/terms-of-service"');
    expect(footer).toContain("<SupportDialog />");
    expect(footer).not.toContain('mailto:support@getphame.app');
    expect(footer).toContain("https://assets.getphame.app/getphame-logo-mark.webp");

    const authGateIndex = app.indexOf("if (!user)");
    for (const publicRoute of [
      'if (path === "/privacy-policy")',
      'if (path === "/terms-of-service")',
      'if (path === "/data-usage")',
      'if (path === "/payment-success")',
      'if (path === "/unsubscribe")',
      'if (path === "/login")',
      'if (path === "/changelog")',
      'if (path === "/security")',
    ]) {
      expect(app.indexOf(publicRoute)).toBeGreaterThan(-1);
      expect(app.indexOf(publicRoute)).toBeLessThan(authGateIndex);
    }
    expect(app).toContain("<PublicLayout><PrivacyPolicyPage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><TermsOfServicePage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><DataUsagePage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><PaymentSuccessPage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><UnsubscribePage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><LoginPage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><ChangelogPage /></PublicLayout>");
    expect(app).toContain("<PublicLayout><SecurityPolicyPage /></PublicLayout>");
    expect(app).not.toContain('<Route path="/changelog" component={ChangelogPage} />');
    expect(app).not.toContain('<Route path="/security" component={SecurityPolicyPage} />');
  });

  it("uses an accessible Resend-backed support form and high-contrast Privacy Policy content", () => {
    const supportDialog = readProjectFile("../client/src/components/landing/SupportDialog.tsx");
    const supportEmail = readProjectFile("./supportEmail.ts");
    const supportRouter = readProjectFile("./routers.ts");
    const privacy = readProjectFile("../client/src/pages/PrivacyPolicy.tsx");

    expect(supportDialog).toContain("trpc.support.submit.useMutation");
    expect(supportDialog).toContain('aria-invalid={Boolean(fieldError("email"))}');
    expect(supportDialog).toContain('role="status"');
    expect(supportDialog).toContain('role="alert"');
    expect(supportDialog).toContain("Do not include passwords or card information.");
    expect(supportEmail).toContain('SUPPORT_FROM_EMAIL = "hello@getphame.app"');
    expect(supportEmail).toContain('SUPPORT_TO_EMAIL = "support@getphame.app"');
    expect(supportEmail).toContain("replyTo: safeEmail");
    expect(supportRouter).toContain("checkSupportSubmissionRateLimit(requestKey)");
    expect(supportRouter).toContain("website: z.string().max(250).optional()");
    expect(privacy).toContain("text-slate-100");
    expect(privacy).toContain("text-slate-300");
    expect(privacy).toContain("[&_a:focus-visible]:ring-2");
    expect(privacy).toContain('<time dateTime="2026-04-13">');
    expect(privacy).toContain("border-primary pl-3 text-slate-100");
    expect(privacy).not.toContain("rr-text-navy");
  });

  it("keeps routed support submissions, safe screenshots, and the admin inbox connected", () => {
    const supportDialog = readProjectFile("../client/src/components/landing/SupportDialog.tsx");
    const supportIntake = readProjectFile("./supportIntake.ts");
    const supportRouter = readProjectFile("./routers.ts");
    const schema = readProjectFile("../drizzle/schema.ts");
    const inbox = readProjectFile("../client/src/pages/AdminSupportInbox.tsx");
    const app = readProjectFile("../client/src/App.tsx");
    const adminDashboard = readProjectFile("../client/src/pages/AdminDashboard.tsx");
    const ticketAlerts = readProjectFile("../client/src/components/SupportTicketAlerts.tsx");

    expect(supportDialog).toContain('topic: "billing" | "onboarding" | "technical"');
    expect(supportDialog).toContain("trpc.support.uploadScreenshot.useMutation");
    expect(supportDialog).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(supportIntake).toContain('SUPPORT_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]');
    expect(supportIntake).toContain("MAX_SUPPORT_ATTACHMENT_BYTES = 8 * 1024 * 1024");
    expect(supportIntake).toContain("isValidSupportScreenshot");
    expect(supportIntake).toContain('SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"]');
    expect(schema).toContain("export const supportSubmissions");
    expect(schema).toContain("supportPriorityEnum");
    expect(schema).toContain("assigneeUserId");
    expect(supportRouter).toContain("uploadScreenshot: publicProcedure");
    expect(supportRouter).toContain("supportSubmissions");
    expect(supportRouter).toContain("adminList: adminProcedure");
    expect(supportRouter).toContain("updateStatus: adminProcedure");
    expect(supportRouter).toContain("adminAssignees: adminProcedure");
    expect(supportRouter).toContain("updatePriority: adminProcedure");
    expect(supportRouter).toContain("updateAssignee: adminProcedure");
    expect(supportRouter).toContain("updateDueAt: adminProcedure");
    expect(supportRouter).toContain("internalNotes: adminProcedure");
    expect(supportRouter).toContain("addInternalNote: adminProcedure");
    expect(supportRouter).toContain("myTicketAlerts: adminProcedure");
    expect(supportRouter).toContain("markTicketAlertsRead: adminProcedure");
    expect(supportRouter).toContain("queueSupportTicketAlerts");
    expect(supportRouter).toContain('eq(users.role, "admin")');
    expect(supportRouter).toContain("storageGet(row.attachmentKey)");
    expect(schema).toContain("dueAt");
    expect(schema).toContain("slaTargetAt");
    expect(schema).toContain("supportInternalNotes");
    expect(schema).toContain("supportTicketAlerts");
    expect(schema).toContain("supportInternalNoteMentions");
    expect(schema).toContain("firstRespondedAt");
    expect(schema).toContain("bodyPlainText");
    expect(schema).toContain("// Stores sanitized, constrained rich HTML.");
    expect(supportIntake).toContain("SUPPORT_SLA_DURATION_MS");
    expect(supportIntake).toContain("SUPPORT_TICKET_ALERT_DEDUP_WINDOW_MS");
    expect(supportIntake).toContain("renderSupportInternalNoteHtml");
    expect(supportIntake).toContain("MAX_SUPPORT_INTERNAL_NOTE_MENTIONS");
    expect(inbox).toContain("trpc.support.adminList.useQuery");
    expect(inbox).toContain("trpc.support.updateStatus.useMutation");
    expect(inbox).toContain("trpc.support.updatePriority.useMutation");
    expect(inbox).toContain("trpc.support.updateAssignee.useMutation");
    expect(inbox).toContain("support-priority-filter");
    expect(inbox).toContain("support-assignee-filter");
    expect(inbox).toContain("TicketDeadlineControls");
    expect(inbox).toContain("TicketInternalNotes");
    expect(inbox).toContain("trpc.support.updateDueAt.useMutation");
    expect(inbox).toContain("trpc.support.addInternalNote.useMutation");
    expect(inbox).toContain('id="support-sla-filter"');
    expect(inbox).toContain('id="support-sort"');
    expect(inbox).toContain('<option value="sla_soonest">SLA due soonest</option>');
    expect(inbox).toContain("Tag administrators");
    expect(inbox).toContain("mentionUserIds");
    expect(inbox).toContain("support-note-rich-text");
    expect(inbox).toContain("Internal resolution notes");
    expect(inbox).toContain("SLA timer");
    expect(inbox).toContain("Unassigned");
    expect(inbox).toContain("Open screenshot");
    expect(ticketAlerts).toContain("trpc.support.myTicketAlerts.useQuery");
    expect(ticketAlerts).toContain("trpc.support.markTicketAlertsRead.useMutation");
    expect(ticketAlerts).toContain("refetchInterval: 5_000");
    expect(ticketAlerts).toContain('alert.type === "mention"');
    expect(ticketAlerts).toContain("mentioned you in a private update");
    expect(app).toContain("<SupportTicketAlerts />");
    expect(app).toContain('const AdminSupportInboxPage = lazy(() => import("./pages/AdminSupportInbox"))');
    expect(app).toContain('<Route path="/admin/support" component={AdminSupportInboxPage} />');
    expect(adminDashboard).toContain('{ path: "/admin/support", label: "Support inbox"');
    expect(adminDashboard).toContain('data-testid="admin-support-reporting"');
    expect(adminDashboard).toContain("trpc.support.adminMetrics.useQuery");
    expect(adminDashboard).toContain("Average first response");
    expect(supportRouter).toContain("adminMetrics: adminProcedure");
    expect(supportRouter).toContain("exportMetricsCsv: adminProcedure");
    expect(supportRouter).toContain("savedViews: adminProcedure");
    expect(supportRouter).toContain("saveView: adminProcedure");
    expect(supportRouter).toContain("deleteView: adminProcedure");
    expect(supportRouter).toContain("checkSlaBreach: adminProcedure");
    expect(supportRouter).toContain('type: "sla_breach"');
    expect(schema).toContain("supportSavedQueueViews");
    expect(inbox).toContain("Saved queue views");
    expect(inbox).toContain("data-sla-breached");
    expect(ticketAlerts).toContain('alert.type === "sla_breach"');
    expect(adminDashboard).toContain('data-testid="admin-support-sla-csv-export"');
    expect(supportRouter).toContain("firstRespondedAt");
    expect(supportRouter).toContain("mentionUserIds");
    expect(supportRouter).toContain("slaDeadline");
    expect(supportRouter).toContain("renderSupportInternalNoteHtml");
  });

  it("uses corrected permanent mockups without the obsolete embedded P-plus-star artwork", () => {
    const showcase = readProjectFile("../client/src/components/landing/ProductShowcase.tsx");

    expect(showcase).toContain("pCdaXCzmWWOVhxVT.webp");
    expect(showcase).toContain("PqrlbFzQDKfwKKdq.png");
    expect(showcase).toContain("iMKazWeeJzbtaJOP.webp");
    expect(showcase).toContain("AGpQkxLxqBlmXRos.png");
    expect(showcase).not.toContain('"https://assets.getphame.app/phame-customer-import.webp"');
    expect(showcase).not.toContain('"https://assets.getphame.app/phame-review-tracking.webp"');
  });

  it("forces authenticated P icons to the public landing alias", () => {
    const landingLink = readProjectFile("../client/src/components/LandingBrandLink.tsx");

    expect(landingLink).toContain('href="/landing"');
    expect(landingLink).toContain('window.location.assign("/landing")');
    expect(landingLink).toContain("event.preventDefault()");
  });

  it("keeps PDF guide access independent from app signup and resilient to persistence or email failures", () => {
    const schema = readProjectFile("../drizzle/schema.ts");
    const router = readProjectFile("./routers.ts");
    const guideEmail = readProjectFile("./leadGuideEmail.ts");
    const leadCapture = readProjectFile("../client/src/components/landing/LeadCapture.tsx");
    const leadCaptureHelpers = readProjectFile("../client/src/lib/leadCapture.ts");

    expect(schema).toContain('createdAt: bigint("createdAt", { mode: "number" })');
    expect(schema).toContain('guideSentAt: bigint("guideSentAt", { mode: "number" })');
    expect(router).toContain("createdAt: now");
    expect(router).toContain("guideSentAt: Date.now()");
    expect(router).toContain("downloadUrl: GUIDE_PDF_URL");
    expect(router).toContain("A persistence outage must not block access to the promised guide");
    expect(router).toContain("z.string().trim().toLowerCase().email()");
    expect(router).toContain("providerAccepted: sent");
    expect(guideEmail).toContain("https://assets.getphame.app/getphame-30-day-review-playbook.pdf");
    expect(guideEmail).not.toContain("/manus-storage/");
    expect(guideEmail).toContain("Provider response");
    expect(guideEmail).toContain("providerMessageId");
    expect(guideEmail).not.toContain("recipientEmail: toEmail");
    expect(leadCapture).toContain("result.downloadUrl");
    expect(leadCapture).toContain("Download the PDF guide");
    expect(leadCapture).toContain('id="guide"');
    expect(leadCapture).toContain("validateLeadEmail");
    expect(leadCapture).toContain('aria-invalid={showEmailError}');
    expect(leadCapture).toContain('aria-live="polite"');
    expect(leadCapture).toContain("Provider acceptance does not guarantee inbox placement");
    expect(leadCapture).toContain("Edit email");
    expect(leadCapture).toContain("Try email again");
    expect(leadCaptureHelpers).toContain("twitter.com/intent/tweet");
    expect(leadCaptureHelpers).toContain("linkedin.com/sharing/share-offsite");
    expect(leadCaptureHelpers).toContain("https://getphame.app/landing#guide");
    expect(leadCapture).not.toContain("Check your inbox — guide is on the way!");
  });
});
