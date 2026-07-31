import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import BottomNav from "./components/BottomNav";
import AppLayout from "./components/AppLayout";
import SupportTicketAlerts from "./components/SupportTicketAlerts";
import PublicLayout from "./components/PublicLayout";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Always-eager (core authenticated shell — tiny, needed immediately) ──────
import HomePage from "./pages/Home";
import SendRequestPage from "./pages/SendRequest";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import OnboardingWizard from "./components/OnboardingWizard";
import OnboardingGuide, {
  useOnboardingGuide,
} from "./components/OnboardingGuide";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import FirstVisitWelcome from "./components/FirstVisitWelcome";
import PremiumUpgradeModal from "./components/PremiumUpgradeModal";
import PageLoader from "./components/PageLoader";
import {
  ApiReconnectingIndicator,
  DashboardReadinessGate,
  useDashboardReadiness,
} from "./components/ApiRecoveryExperience";
import { handoffGuideNavigation } from "./lib/onboardingFlow";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";
import { useHapticEvents } from "./hooks/useHapticEvents";
import { useTranslation } from "react-i18next";
import AutoTextLocalizer from "./components/AutoTextLocalizer";
import HelpAssistant from "./components/HelpAssistant";
import {
  GOOGLE_SIGN_IN_TOAST_ID,
  clearGoogleSignInPending,
  getLocalizedAuthErrorMessage,
  hasGoogleSignInPending,
} from "./lib/authFeedback";

// Keep both a same-tab guard and a per-user browser preference. The in-memory
// guard closes the modal synchronously; localStorage prevents a full reload from
// reopening it while the server-side dismissal preference is being persisted.
const onboardingDismissedUserIds = new Set<string>();
const onboardingDismissalKey = (userId: string) =>
  `getphame:onboarding-dismissed:${userId}`;

function wasOnboardingDismissed(userId: string | null) {
  if (!userId) return false;
  if (onboardingDismissedUserIds.has(userId)) return true;

  try {
    return window.localStorage.getItem(onboardingDismissalKey(userId)) === "1";
  } catch {
    return false;
  }
}

function rememberOnboardingDismissal(userId: string) {
  onboardingDismissedUserIds.add(userId);

  try {
    window.localStorage.setItem(onboardingDismissalKey(userId), "1");
  } catch {
    // The in-memory guard still guarantees immediate dismissal when storage is blocked.
  }
}

// ── Lazy-loaded (public pages + heavy/rarely-visited pages) ─────────────────
const LandingPage = lazy(() => import("./pages/LandingPage"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const AppleAuthLanding = lazy(() => import("./pages/AppleAuthLanding"));
const ReviewRequestsPage = lazy(() => import("./pages/ReviewRequests"));
const EmailCampaignsPage = lazy(() => import("./pages/EmailCampaigns"));
const ReputationManagementPage = lazy(
  () => import("./pages/ReputationManagement")
);

const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));
const DataUsagePage = lazy(() => import("./pages/DataUsage"));
const ChangelogPage = lazy(() => import("./pages/Changelog"));
const SecurityPolicyPage = lazy(() => import("./pages/SecurityPolicy"));
const UnsubscribePage = lazy(() => import("./pages/Unsubscribe"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const ChurnSurveyPage = lazy(() => import("./pages/ChurnSurvey"));
const LoginPage = lazy(() => import("./pages/Login"));

const WooCustomersPage = lazy(() => import("./pages/WooCustomers"));
const SavedContactsPage = lazy(() => import("./pages/SavedContacts"));
const EmailTemplatesPage = lazy(() => import("./pages/EmailTemplates"));
const RemindersPage = lazy(() => import("./pages/Reminders"));
const ImportContactsPage = lazy(() => import("./pages/ImportContacts"));
const UpgradePage = lazy(() => import("./pages/Upgrade"));
const CompliancePage = lazy(() => import("./pages/Compliance"));
const ClientReviewsPage = lazy(() => import("./pages/ClientReviews"));
const DeveloperIntegrationsPage = lazy(
  () => import("./pages/DeveloperIntegrations")
);
const ManualPage = lazy(() => import("./pages/Manual"));

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsers"));
const AdminCodesPage = lazy(() => import("./pages/AdminCodes"));
const AdminPromotionsPage = lazy(() => import("./pages/AdminPromotions"));
const AdminSupportInboxPage = lazy(() => import("./pages/AdminSupportInbox"));
const AdminSmtpStatsPage = lazy(() => import("./pages/AdminSmtpStats"));
const AdminAuthDiagnosticsPage = lazy(
  () => import("./pages/AdminAuthDiagnostics")
);
const AdminChurnPage = lazy(() => import("./pages/AdminChurn"));
const AdminRevenuePage = lazy(() => import("./pages/AdminRevenue"));
const AdminRevenueControlsPage = lazy(
  () => import("./pages/AdminRevenueControls")
);
const AdminReferralRewardsPage = lazy(
  () => import("./pages/AdminReferralRewards")
);
const AdminReminderPerformancePage = lazy(
  () => import("./pages/AdminReminderPerformance")
);
const AdminKoalendarRetryPage = lazy(
  () => import("./pages/AdminKoalendarRetry")
);
const AdminGithubCleanupShowcasePage = lazy(
  () => import("./pages/AdminGithubCleanupShowcase")
);
const AdminAutomationHealthPage = lazy(
  () => import("./pages/AdminAutomationHealth")
);

const ReferralLandingPage = lazy(() => import("./pages/ReferralLanding"));

/**
 * PageTransition — fade-up animation on route change.
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [key, setKey] = useState(location);
  const prevRef = useRef(location);

  useEffect(() => {
    if (prevRef.current !== location) {
      prevRef.current = location;
      setKey(location);
    }
  }, [location]);

  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  );
}

function AppShell() {
  const { t } = useTranslation("translation");
  const { user, loading, isAuthenticated } = useAuth();
  const dashboardReadiness = useDashboardReadiness(Boolean(user));
  const [, navigate] = useLocation();
  const userId = user?.id == null ? null : String(user.id);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    wasOnboardingDismissed(userId)
  );
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery(
    undefined,
    {
      enabled: !!user && dashboardReadiness.data?.ok === true,
      refetchInterval: 5000,
    }
  );
  const {
    open: guideOpen,
    handleClose: handleGuideClose,
    autoShowEligible: guideAutoShowEligible,
  } = useOnboardingGuide({
    isAuthenticated,
    userId: user?.id,
    onboardingStatus,
  });
  useHapticEvents(isAuthenticated);

  const claimReferral = trpc.referral.claimReferral.useMutation();
  useEffect(() => {
    if (!isAuthenticated) return;
    const refCode = localStorage.getItem("phame_ref");
    if (!refCode) return;
    localStorage.removeItem("phame_ref");
    claimReferral.mutate({ code: refCode });
  }, [isAuthenticated]);

  useEffect(() => {
    if (window.location.pathname === "/login") return;

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      clearGoogleSignInPending();
      toast.error(getLocalizedAuthErrorMessage(authError, t), {
        id: GOOGLE_SIGN_IN_TOAST_ID,
      });
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [t]);

  useEffect(() => {
    if (loading || !user || !hasGoogleSignInPending()) return;

    clearGoogleSignInPending();
    toast.success(
      t("authFeedback.googleSuccess", {
        defaultValue: "Google sign-in successful. Welcome to Get Phame.",
      }),
      {
        id: GOOGLE_SIGN_IN_TOAST_ID,
      }
    );
  }, [loading, t, user]);

  useEffect(() => {
    if (loading || !user || window.location.pathname !== "/onboarding") return;
    navigate("/", { replace: true });
  }, [loading, navigate, user]);

  useEffect(() => {
    setOnboardingDismissed(wasOnboardingDismissed(userId));
  }, [userId]);

  const dismissOnboardingForSession = () => {
    if (userId) rememberOnboardingDismissal(userId);
    setOnboardingDismissed(true);
  };

  const showWizard =
    !!user &&
    !!onboardingStatus &&
    !guideOpen &&
    !guideAutoShowEligible &&
    !onboardingDismissed &&
    !onboardingStatus.dismissed &&
    !onboardingStatus.allDone;

  const closeGuideForSession = () => {
    handleGuideClose();
    dismissOnboardingForSession();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-navy">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  const path = window.location.pathname;

  // ── Public pages — always accessible, wrapped in PublicLayout ───────────
  if (path === "/landing")
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    );
  if (path === "/review-requests")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ReviewRequestsPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/email-campaigns")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <EmailCampaignsPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/reputation-management")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ReputationManagementPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/privacy-policy")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <PrivacyPolicyPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/terms-of-service")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <TermsOfServicePage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/data-usage")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <DataUsagePage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/payment-success")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <PaymentSuccessPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/unsubscribe")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <UnsubscribePage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/login")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <LoginPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/changelog")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ChangelogPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/security")
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <SecurityPolicyPage />
        </PublicLayout>
      </Suspense>
    );
  if (path === "/auth/apple/landing")
    return (
      <Suspense fallback={<PageLoader />}>
        <div className="min-h-screen rr-bg-navy flex items-center justify-center">
          <AppleAuthLanding />
        </div>
      </Suspense>
    );
  if (path.startsWith("/ref/"))
    return (
      <Suspense fallback={<PageLoader />}>
        <ReferralLandingPage />
      </Suspense>
    );

  if (!user) {
    if (path === "/onboarding")
      return (
        <Suspense fallback={<PageLoader />}>
          <div className="min-h-screen rr-bg-navy">
            <OnboardingPage />
          </div>
        </Suspense>
      );
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    );
  }

  // ── Authenticated app shell ──────────────────────────────────────────────
  return (
    <>
      <ApiReconnectingIndicator />
      <DashboardReadinessGate readiness={dashboardReadiness}>
        {/* Skip to main content — screen reader accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {showWizard && (
          <OnboardingWizard onDismiss={dismissOnboardingForSession} />
        )}
        <OnboardingGuide
          open={guideOpen}
          onClose={closeGuideForSession}
          onNavigate={path =>
            handoffGuideNavigation({
              path,
              dismissWizard: dismissOnboardingForSession,
              closeGuide: closeGuideForSession,
              navigate,
            })
          }
        />
        <SupportTicketAlerts />

        {/* AppLayout provides the sidebar on tablet/desktop */}
        <AppLayout>
          <main id="main-content">
            <PageTransition>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/" component={HomePage} />
                  <Route path="/send" component={SendRequestPage} />
                  <Route path="/dashboard" component={DashboardPage} />
                  <Route
                    path="/developer"
                    component={DeveloperIntegrationsPage}
                  />
                  <Route path="/settings" component={SettingsPage} />
                  <Route path="/manual" component={ManualPage} />
                  <Route
                    path="/payment-success"
                    component={PaymentSuccessPage}
                  />
                  <Route path="/privacy-policy" component={PrivacyPolicyPage} />
                  <Route
                    path="/terms-of-service"
                    component={TermsOfServicePage}
                  />
                  <Route path="/woo-customers" component={WooCustomersPage} />
                  <Route path="/contacts" component={SavedContactsPage} />
                  <Route path="/templates" component={EmailTemplatesPage} />
                  <Route path="/reminders" component={RemindersPage} />
                  <Route path="/import" component={ImportContactsPage} />
                  <Route path="/pricing" component={UpgradePage} />
                  <Route path="/upgrade" component={UpgradePage} />
                  <Route path="/cancel" component={ChurnSurveyPage} />
                  <Route path="/admin" component={AdminDashboardPage} />
                  <Route path="/admin/users" component={AdminUsersPage} />
                  <Route path="/admin/codes" component={AdminCodesPage} />
                  <Route
                    path="/admin/promotions"
                    component={AdminPromotionsPage}
                  />
                  <Route
                    path="/admin/support"
                    component={AdminSupportInboxPage}
                  />
                  <Route
                    path="/admin/smtp-stats"
                    component={AdminSmtpStatsPage}
                  />
                  <Route
                    path="/admin/auth-diagnostics"
                    component={AdminAuthDiagnosticsPage}
                  />
                  <Route path="/admin/churn" component={AdminChurnPage} />
                  <Route path="/admin/revenue" component={AdminRevenuePage} />
                  <Route
                    path="/admin/revenue-controls"
                    component={AdminRevenueControlsPage}
                  />
                  <Route
                    path="/admin/referral-rewards"
                    component={AdminReferralRewardsPage}
                  />
                  <Route
                    path="/admin/reminder-performance"
                    component={AdminReminderPerformancePage}
                  />
                  <Route
                    path="/admin/koalendar-retry"
                    component={AdminKoalendarRetryPage}
                  />
                  <Route
                    path="/admin/github-cleanup"
                    component={AdminGithubCleanupShowcasePage}
                  />
                  <Route
                    path="/admin/automation-health"
                    component={AdminAutomationHealthPage}
                  />
                  <Route path="/compliance" component={CompliancePage} />
                  <Route path="/reviews" component={ClientReviewsPage} />
                  <Route path="/ref/:code" component={ReferralLandingPage} />
                  <Route component={HomePage} />
                </Switch>
              </Suspense>
            </PageTransition>
          </main>
        </AppLayout>

        {/* BottomNav — mobile only (hidden on md+) */}
        <BottomNav />
      </DashboardReadinessGate>
    </>
  );
}

function ApiRecoveryTestHarness() {
  const readiness = useDashboardReadiness(true, { retry: false });

  return (
    <DashboardReadinessGate readiness={readiness}>
      <div data-testid="api-recovery-test-ready">Ready</div>
    </DashboardReadinessGate>
  );
}

function App() {
  if (
    import.meta.env.DEV &&
    window.location.pathname === "/__test/api-recovery"
  ) {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <ApiRecoveryTestHarness />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <AutoTextLocalizer />
          <Toaster position="top-center" richColors />
          <AppShell />
          <HelpAssistant />
          <PremiumUpgradeModal />
          <FirstVisitWelcome />
          <PWAInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
