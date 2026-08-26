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
import SettingsPage, { SettingsBulkSenderTestFixture, ThemePreferenceCard } from "./pages/Settings";
import MagicLinkForm from "./components/auth/MagicLinkForm";
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
import { DashboardFeedbackPreviewHarness, DashboardQueryRecoveryPreviewHarness } from "./components/dashboard/DashboardFeedbackExperience";
import {
  ConnectionSavedNotice,
  SmtpAppPasswordHelpTooltip,
  SmtpCandidateConnectionActions,
} from "./components/SmtpConnectionFeedback";
import { handoffGuideNavigation } from "./lib/onboardingFlow";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "./const";
import { useHapticEvents } from "./hooks/useHapticEvents";
import { useTranslation } from "react-i18next";
import AutoTextLocalizer from "./components/AutoTextLocalizer";
import HelpAssistant from "./components/HelpAssistant";
import { UpdateSafetyProvider } from "./contexts/UpdateSafetyContext";
import { AppVersionProvider } from "./components/AppVersionUpdateController";
import WebMcpPublicDiscovery from "./components/WebMcpPublicDiscovery";
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
const authReturnPathStorageKey = "getphame:auth-return-path";

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
const EmailPreferencesPage = lazy(() => import("./pages/EmailPreferences"));
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
const AdminSignupRiskPage = lazy(() => import("./pages/AdminSignupRisk"));
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
const AdminSecurityAuditsPage = lazy(
  () => import("./pages/AdminSecurityAudits")
);
const AdminSecurityAuditReleaseVerificationPage = lazy(
  () => import("./pages/AdminSecurityAuditReleaseVerification")
);
const AdminEmailPreviewPage = lazy(() => import("./pages/AdminEmailPreview"));
const AdminAuditLogPage = lazy(() => import("./pages/AdminAuditLog"));
const AdminAuditRetentionPage = lazy(() => import("./pages/AdminAuditRetention"));
const AuthenticatedAdminEmailPreviewPage = () => <AdminEmailPreviewPage />;
const AuthenticatedDashboardPage = () => <DashboardPage />;
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

function AuthRequiredRedirect({ returnPath }: { returnPath: string }) {
  useEffect(() => {
    try {
      window.sessionStorage.setItem(authReturnPathStorageKey, returnPath);
    } catch {
      // The query parameter remains a safe fallback when session storage is blocked.
    }
    window.location.replace(getLoginUrl(returnPath));
  }, [returnPath]);

  return <PageLoader />;
}

function getSafeReturnPath(search: string) {
  const returnTo = new URLSearchParams(search).get("returnTo");
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return null;
  }

  return returnTo;
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
    if (loading || !user) return;

    let rememberedReturnPath: string | null = null;
    try {
      rememberedReturnPath = window.sessionStorage.getItem(authReturnPathStorageKey);
      window.sessionStorage.removeItem(authReturnPathStorageKey);
    } catch {
      // The query-string return path remains available when storage is blocked.
    }

    const returnPath =
      getSafeReturnPath(window.location.search) ??
      (rememberedReturnPath && getSafeReturnPath(`?returnTo=${encodeURIComponent(rememberedReturnPath)}`));

    if (returnPath && returnPath !== `${window.location.pathname}${window.location.search}`) {
      navigate(returnPath, { replace: true });
    }
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

  const path = window.location.pathname;
  // The static preview contains sample content only. In development, render it
  // immediately rather than waiting for an unavailable or stale local session.
  // Production remains read-only for guests and keeps all mutable actions behind
  // server-side administrator authorization.
  const isDevelopmentPreviewBypass =
    import.meta.env.DEV && path === "/admin/email-preview";

  if (loading && !isDevelopmentPreviewBypass) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-navy">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

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
  if (path === "/preferences")
    return (
      <Suspense fallback={<PageLoader />}>
        <EmailPreferencesPage />
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
    if (path === "/admin/email-preview") {
      return (
        <Suspense fallback={<PageLoader />}>
          <PublicLayout>
            <AdminEmailPreviewPage readOnly />
          </PublicLayout>
        </Suspense>
      );
    }

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
                  <Route path="/dashboard" component={AuthenticatedDashboardPage} />
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
                  <Route path="/admin/signup-risk" component={AdminSignupRiskPage} />
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
                  <Route
                    path="/admin/security-audits"
                    component={AdminSecurityAuditsPage}
                  />
                  <Route
                    path="/admin/security-audit-release"
                    component={AdminSecurityAuditReleaseVerificationPage}
                  />
                  <Route path="/admin/audit-log" component={AdminAuditLogPage} />
                  <Route path="/admin/audit-retention" component={AdminAuditRetentionPage} />
                  <Route path="/admin/email-preview" component={AuthenticatedAdminEmailPreviewPage} />
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

function SmtpConnectionFeedbackTestHarness() {
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean } | null>(null);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const translate = (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key;

  return (
    <div className="mx-auto max-w-xl space-y-5 p-6" data-testid="smtp-feedback-test-harness">
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold">Gmail App Password</label>
        <SmtpAppPasswordHelpTooltip provider="gmail" translate={translate} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold">Google Workspace App Password</label>
        <SmtpAppPasswordHelpTooltip provider="workspace" translate={translate} />
      </div>
      <SmtpCandidateConnectionActions
        result={testResult}
        testing={testing}
        connecting={connecting}
        translate={translate}
        onTest={() => {
          setTesting(true);
          window.setTimeout(() => {
            setTesting(false);
            setTestResult({ ok: true });
          }, 40);
        }}
        onConnect={() => {
          setConnecting(true);
          window.setTimeout(() => {
            setConnecting(false);
            setSmtpSaved(true);
          }, 40);
        }}
      />
      {smtpSaved && <div data-testid="smtp-saved-notice"><ConnectionSavedNotice message="Your email server is connected and ready for customer outreach." /></div>}
      <div data-testid="bulk-saved-notice"><ConnectionSavedNotice message="Your bulk mail server is connected and ready to use." /></div>
    </div>
  );
}

function ProviderDiscoveryTestHarness() {
  return (
    <main className="min-h-screen bg-white p-6">
      <SettingsBulkSenderTestFixture />
    </main>
  );
}

function FormAutofillTestHarness() {
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpTouched, setSmtpTouched] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpUsernameTouched, setSmtpUsernameTouched] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPasswordTouched, setSmtpPasswordTouched] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const normalizedSmtpEmail = smtpEmail.trim().toLowerCase();
  const smtpState =
    smtpTouched && normalizedSmtpEmail.length > 0
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedSmtpEmail)
        ? "valid"
        : "invalid"
      : "idle";
  const smtpUsernameState = smtpUsernameTouched
    ? smtpUsername.trim().length > 0 ? "valid" : "invalid"
    : "idle";
  const smtpPasswordState = smtpPasswordTouched
    ? smtpPassword.trim().length > 0 ? "valid" : "invalid"
    : "idle";

  return (
    <main className="min-h-screen bg-[#0F1B2D] px-6 py-10 text-white" data-testid="form-autofill-test-harness">
      <div className="mx-auto max-w-xl space-y-8">
      <section>
        <h1 className="mb-3 text-lg font-bold">Login email</h1>
        <MagicLinkForm idPrefix="autofill-login" />
      </section>
      <section aria-labelledby="autofill-smtp-title" className="rounded-2xl bg-white p-6 text-[#0F1B2D]">
        <h2 id="autofill-smtp-title" className="mb-3 text-lg font-bold">SMTP identity</h2>
        <label htmlFor="autofill-smtp-email" className="mb-1 block text-sm font-semibold">SMTP email</label>
        <input
          id="autofill-smtp-email"
          name="autofill-smtp-email"
          type="email"
          autoComplete="email"
          value={smtpEmail}
          onChange={(event) => {
            setSmtpEmail(event.target.value);
            setSmtpTouched(true);
          }}
          onBlur={() => setSmtpTouched(true)}
          aria-invalid={smtpState === "invalid"}
          aria-describedby={smtpState === "idle" ? undefined : "autofill-smtp-feedback"}
          className="w-full rounded-md border px-3 py-2"
        />
        {smtpState !== "idle" && (
          <p id="autofill-smtp-feedback" data-testid="autofill-smtp-feedback" role="status" aria-live="polite" className="mt-2 text-sm">
            {smtpState === "valid" ? "Email format looks good." : "Enter a valid email address."}
          </p>
        )}
        <label htmlFor="autofill-smtp-username" className="mb-1 mt-4 block text-sm font-semibold">SMTP username</label>
        <input id="autofill-smtp-username" name="autofill-smtp-username" autoComplete="username" value={smtpUsername} onChange={(event) => { setSmtpUsername(event.target.value); setSmtpUsernameTouched(true); }} onBlur={() => setSmtpUsernameTouched(true)} aria-invalid={smtpUsernameState === "invalid"} aria-describedby={smtpUsernameState === "idle" ? undefined : "autofill-smtp-username-feedback"} className="w-full rounded-md border px-3 py-2" />
        {smtpUsernameState !== "idle" && <p id="autofill-smtp-username-feedback" data-testid="autofill-smtp-username-feedback" role="status" aria-live="polite" className="mt-2 text-sm">{smtpUsernameState === "valid" ? "Looks good." : "This field is required."}</p>}
        <label htmlFor="autofill-smtp-password" className="mb-1 mt-4 block text-sm font-semibold">SMTP password</label>
        <div className="relative">
          <input id="autofill-smtp-password" name="autofill-smtp-password" type={showSmtpPassword ? "text" : "password"} autoComplete="current-password" value={smtpPassword} onChange={(event) => { setSmtpPassword(event.target.value); setSmtpPasswordTouched(true); }} onBlur={() => setSmtpPasswordTouched(true)} aria-invalid={smtpPasswordState === "invalid"} aria-describedby={smtpPasswordState === "idle" ? undefined : "autofill-smtp-password-feedback"} className="w-full rounded-md border px-3 py-2 pr-20" />
          <button type="button" data-testid="autofill-smtp-password-toggle" onClick={() => setShowSmtpPassword((value) => !value)} aria-label={showSmtpPassword ? "Hide password" : "Show password"} aria-pressed={showSmtpPassword} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold">{showSmtpPassword ? "Hide" : "Show"}</button>
        </div>
        {smtpPasswordState !== "idle" && <p id="autofill-smtp-password-feedback" data-testid="autofill-smtp-password-feedback" role="status" aria-live="polite" className="mt-2 text-sm">{smtpPasswordState === "valid" ? "Password entered. Test before saving." : "Password is required."}</p>}
      </section>
      </div>
    </main>
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

  if (import.meta.env.DEV && window.location.pathname === "/__test/dashboard-feedback") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <DashboardFeedbackPreviewHarness />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/dashboard-query-recovery") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <DashboardQueryRecoveryPreviewHarness />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/settings-theme-preference") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <main className="min-h-screen p-6 rr-bg-cream-warm">
            <div className="mx-auto max-w-md">
              <ThemePreferenceCard />
            </div>
          </main>
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/dashboard-page-query-recovery") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <UpdateSafetyProvider>
            <Toaster position="top-center" richColors />
            <DashboardPage testRecoveryMode="query" />
          </UpdateSafetyProvider>
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/dashboard-page-mutation-recovery") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <UpdateSafetyProvider>
            <Toaster position="top-center" richColors />
            <DashboardPage testRecoveryMode="mutation" />
          </UpdateSafetyProvider>
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/smtp-connection-feedback") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <SmtpConnectionFeedbackTestHarness />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/provider-discovery") {
    return (
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <ProviderDiscoveryTestHarness />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (import.meta.env.DEV && window.location.pathname === "/__test/form-autofill") {
    return (
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <UpdateSafetyProvider>
            <Toaster position="top-center" richColors />
            <FormAutofillTestHarness />
          </UpdateSafetyProvider>
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <UpdateSafetyProvider>
            <AppVersionProvider>
              <WebMcpPublicDiscovery />
              <AutoTextLocalizer />
              <Toaster position="top-center" richColors />
              <AppShell />
              <HelpAssistant />
              <PremiumUpgradeModal />
              <FirstVisitWelcome />
              <PWAInstallPrompt />
            </AppVersionProvider>
          </UpdateSafetyProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
