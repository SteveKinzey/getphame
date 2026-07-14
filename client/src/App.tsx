import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import BottomNav from "./components/BottomNav";
import AppLayout from "./components/AppLayout";
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
import OnboardingGuide, { useOnboardingGuide } from "./components/OnboardingGuide";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PageLoader from "./components/PageLoader";
import { handoffGuideNavigation } from "./lib/onboardingFlow";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";
import { useHapticEvents } from "./hooks/useHapticEvents";

// ── Lazy-loaded (public pages + heavy/rarely-visited pages) ─────────────────
const LandingPage       = lazy(() => import("./pages/LandingPage"));
const OnboardingPage    = lazy(() => import("./pages/Onboarding"));
const AppleAuthLanding  = lazy(() => import("./pages/AppleAuthLanding"));

const PrivacyPolicyPage  = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));
const DataUsagePage      = lazy(() => import("./pages/DataUsage"));
const ChangelogPage      = lazy(() => import("./pages/Changelog"));
const SecurityPolicyPage = lazy(() => import("./pages/SecurityPolicy"));
const UnsubscribePage    = lazy(() => import("./pages/Unsubscribe"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const ChurnSurveyPage    = lazy(() => import("./pages/ChurnSurvey"));
const LoginPage          = lazy(() => import("./pages/Login"));

const WooCustomersPage    = lazy(() => import("./pages/WooCustomers"));
const SavedContactsPage   = lazy(() => import("./pages/SavedContacts"));
const EmailTemplatesPage  = lazy(() => import("./pages/EmailTemplates"));
const RemindersPage       = lazy(() => import("./pages/Reminders"));
const ImportContactsPage  = lazy(() => import("./pages/ImportContacts"));
const UpgradePage         = lazy(() => import("./pages/Upgrade"));
const CompliancePage      = lazy(() => import("./pages/Compliance"));
const ClientReviewsPage   = lazy(() => import("./pages/ClientReviews"));

const AdminDashboardPage  = lazy(() => import("./pages/AdminDashboard"));
const AdminUsersPage      = lazy(() => import("./pages/AdminUsers"));
const AdminCodesPage      = lazy(() => import("./pages/AdminCodes"));
const AdminSmtpStatsPage  = lazy(() => import("./pages/AdminSmtpStats"));
const AdminAuthDiagnosticsPage = lazy(() => import("./pages/AdminAuthDiagnostics"));
const AdminChurnPage      = lazy(() => import("./pages/AdminChurn"));
const AdminRevenuePage    = lazy(() => import("./pages/AdminRevenue"));
const AdminReferralRewardsPage = lazy(() => import("./pages/AdminReferralRewards"));

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
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { open: guideOpen, setOpen: setGuideOpen, handleClose: handleGuideClose } = useOnboardingGuide(isAuthenticated);
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
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      if (authError === 'denied') {
        toast.error('Sign-in cancelled. Please try again.');
      } else if (authError === 'magic_link_expired') {
        toast.error('That sign-in link has expired. Please request a new one.');
      } else if (authError === 'invalid_magic_link') {
        toast.error('Invalid or already-used sign-in link. Please request a new one.');
      } else {
        toast.error('Sign-in failed. Please try again or contact support.');
      }
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const { data: onboardingStatus } = trpc.onboarding.status.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    setOnboardingDismissed(false);
  }, [user?.id]);

  const showWizard =
    !!user &&
    !!onboardingStatus &&
    !guideOpen &&
    !onboardingDismissed &&
    !onboardingStatus.dismissed &&
    !onboardingStatus.allDone;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-navy">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  const path = window.location.pathname;

  // ── Public pages — always accessible, wrapped in PublicLayout ───────────
  if (path === "/privacy-policy") return (
    <Suspense fallback={<PageLoader />}>
      <PublicLayout><PrivacyPolicyPage /></PublicLayout>
    </Suspense>
  );
  if (path === "/terms-of-service") return (
    <Suspense fallback={<PageLoader />}>
      <PublicLayout><TermsOfServicePage /></PublicLayout>
    </Suspense>
  );
  if (path === "/data-usage") return (
    <Suspense fallback={<PageLoader />}>
      <PublicLayout><DataUsagePage /></PublicLayout>
    </Suspense>
  );
  if (path === "/payment-success") return (
    <Suspense fallback={<PageLoader />}>
      <PublicLayout><PaymentSuccessPage /></PublicLayout>
    </Suspense>
  );
  if (path === "/unsubscribe") return (
    <Suspense fallback={<PageLoader />}>
      <PublicLayout><UnsubscribePage /></PublicLayout>
    </Suspense>
  );
  if (path === "/auth/apple/landing") return (
    <Suspense fallback={<PageLoader />}>
      <div className="min-h-screen rr-bg-navy flex items-center justify-center">
        <AppleAuthLanding />
      </div>
    </Suspense>
  );
  if (path.startsWith("/ref/")) return (
    <Suspense fallback={<PageLoader />}><ReferralLandingPage /></Suspense>
  );

  if (!user) {
    if (path === "/onboarding") return (
      <Suspense fallback={<PageLoader />}>
        <div className="min-h-screen rr-bg-navy">
          <OnboardingPage />
        </div>
      </Suspense>
    );
    if (path === "/login") return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout><LoginPage /></PublicLayout>
      </Suspense>
    );
    if (path === "/changelog") return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout><ChangelogPage /></PublicLayout>
      </Suspense>
    );
    if (path === "/security") return (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout><SecurityPolicyPage /></PublicLayout>
      </Suspense>
    );
    return <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>;
  }

  // ── Authenticated app shell ──────────────────────────────────────────────
  return (
    <>
      {/* Skip to main content — screen reader accessibility */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {showWizard && (
        <OnboardingWizard onDismiss={() => setOnboardingDismissed(true)} />
      )}
      <OnboardingGuide
        open={guideOpen}
        onClose={handleGuideClose}
        onNavigate={(path) => handoffGuideNavigation({
          path,
          dismissWizard: () => setOnboardingDismissed(true),
          closeGuide: handleGuideClose,
          navigate,
        })}
      />

      {/* AppLayout provides the sidebar on tablet/desktop */}
      <AppLayout>
        <main id="main-content">
          <PageTransition>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/send" component={SendRequestPage} />
                <Route path="/dashboard" component={DashboardPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/payment-success" component={PaymentSuccessPage} />
                <Route path="/privacy-policy" component={PrivacyPolicyPage} />
                <Route path="/terms-of-service" component={TermsOfServicePage} />
                <Route path="/woo-customers" component={WooCustomersPage} />
                <Route path="/contacts" component={SavedContactsPage} />
                <Route path="/templates" component={EmailTemplatesPage} />
                <Route path="/reminders" component={RemindersPage} />
                <Route path="/import" component={ImportContactsPage} />
                <Route path="/upgrade" component={UpgradePage} />
                <Route path="/cancel" component={ChurnSurveyPage} />
                <Route path="/admin" component={AdminDashboardPage} />
                <Route path="/admin/users" component={AdminUsersPage} />
                <Route path="/admin/codes" component={AdminCodesPage} />
                <Route path="/admin/smtp-stats" component={AdminSmtpStatsPage} />
                <Route path="/admin/auth-diagnostics" component={AdminAuthDiagnosticsPage} />
                <Route path="/admin/churn" component={AdminChurnPage} />
                <Route path="/admin/revenue" component={AdminRevenuePage} />
                <Route path="/admin/referral-rewards" component={AdminReferralRewardsPage} />
                <Route path="/changelog" component={ChangelogPage} />
                <Route path="/compliance" component={CompliancePage} />
                <Route path="/security" component={SecurityPolicyPage} />
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
      <PWAInstallPrompt />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
