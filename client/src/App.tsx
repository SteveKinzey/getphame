import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import BottomNav from "./components/BottomNav";
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
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";
import { useHapticEvents } from "./hooks/useHapticEvents";

// ── Lazy-loaded (public pages + heavy/rarely-visited pages) ─────────────────
// Public marketing pages — large, only needed before login
const LandingPage       = lazy(() => import("./pages/LandingPage"));
const OnboardingPage    = lazy(() => import("./pages/Onboarding"));
const AppleAuthLanding  = lazy(() => import("./pages/AppleAuthLanding"));

// Legal / utility — rarely visited, no need to block initial load
const PrivacyPolicyPage  = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));
const ChangelogPage      = lazy(() => import("./pages/Changelog"));
const UnsubscribePage    = lazy(() => import("./pages/Unsubscribe"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const ChurnSurveyPage    = lazy(() => import("./pages/ChurnSurvey"));

// Feature pages — authenticated, deferred until navigation
const WooCustomersPage    = lazy(() => import("./pages/WooCustomers"));
const SavedContactsPage   = lazy(() => import("./pages/SavedContacts"));
const EmailTemplatesPage  = lazy(() => import("./pages/EmailTemplates"));
const RemindersPage       = lazy(() => import("./pages/Reminders"));
const ImportContactsPage  = lazy(() => import("./pages/ImportContacts"));
const UpgradePage         = lazy(() => import("./pages/Upgrade"));
const CompliancePage      = lazy(() => import("./pages/Compliance"));
const ClientReviewsPage   = lazy(() => import("./pages/ClientReviews"));

// Admin pages — owner-only, always deferred
const AdminDashboardPage  = lazy(() => import("./pages/AdminDashboard"));
const AdminCodesPage      = lazy(() => import("./pages/AdminCodes"));
const AdminSmtpStatsPage  = lazy(() => import("./pages/AdminSmtpStats"));
const AdminChurnPage      = lazy(() => import("./pages/AdminChurn"));
const AdminRevenuePage    = lazy(() => import("./pages/AdminRevenue"));

// ── Shared loading fallback ──────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="mobile-screen flex items-center justify-center rr-bg-navy">
      <Loader2 className="animate-spin text-white" size={32} />
    </div>
  );
}

/**
 * PageTransition — wraps route output in a fade-up animation that triggers
 * whenever the wouter location changes. Uses a key-based remount so each
 * navigation gets a fresh animation without Framer Motion.
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
  const { open: guideOpen, setOpen: setGuideOpen, handleClose: handleGuideClose } = useOnboardingGuide(isAuthenticated);
  // Haptic feedback for email opens and review clicks — only active when logged in
  useHapticEvents(isAuthenticated);

  // Claim referral: if a ?ref= code was stored before login, link the new user to the referrer
  const claimReferral = trpc.referral.claimReferral.useMutation();
  useEffect(() => {
    if (!isAuthenticated) return;
    const refCode = localStorage.getItem("phame_ref");
    if (!refCode) return;
    // Remove immediately so it only fires once
    localStorage.removeItem("phame_ref");
    claimReferral.mutate({ code: refCode });
  }, [isAuthenticated]);

  // Show a toast if Google/Apple OAuth returned an error (e.g. user denied consent)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      if (authError === 'denied') {
        toast.error('Sign-in cancelled. Please try again.');
      } else {
        toast.error('Sign-in failed. Please try again or contact support.');
      }
      // Remove the query param so the toast doesn't re-appear on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const { data: onboardingStatus } = trpc.onboarding.status.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000,
  });

  const showWizard =
    !!user &&
    !!onboardingStatus &&
    !onboardingStatus.dismissed &&
    !onboardingStatus.allDone;

  if (loading) {
    return (
      <div className="mobile-screen flex items-center justify-center rr-bg-navy">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  // Public pages accessible without login
  const path = window.location.pathname;
  const globalLangFlyout = null;

  if (path === "/privacy-policy") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><PrivacyPolicyPage />{globalLangFlyout}</div></Suspense>;
  if (path === "/terms-of-service") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><TermsOfServicePage />{globalLangFlyout}</div></Suspense>;
  if (path === "/payment-success") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><PaymentSuccessPage />{globalLangFlyout}</div></Suspense>;
  if (path === "/unsubscribe") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><UnsubscribePage />{globalLangFlyout}</div></Suspense>;
  if (path === "/auth/apple/landing") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><AppleAuthLanding /></div></Suspense>;

  if (!user) {
    // Show the public marketing landing page at /, Onboarding at /onboarding
    if (path === "/onboarding") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><OnboardingPage />{globalLangFlyout}</div></Suspense>;
    // Changelog is public — render without BottomNav for unauthenticated visitors
    if (path === "/changelog") return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><ChangelogPage />{globalLangFlyout}</div></Suspense>;
    return <Suspense fallback={<PageLoader />}><div className="mobile-screen"><LandingPage />{globalLangFlyout}</div></Suspense>;
  }

  return (
    <div className="mobile-screen">
      {/* Skip to main content — visible on keyboard focus for screen readers */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {showWizard && (
        <OnboardingWizard
          onDismiss={() => {
            // Status will refetch automatically via the query
          }}
        />
      )}
      <OnboardingGuide open={guideOpen} onClose={handleGuideClose} />
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
        <Route path="/admin/codes" component={AdminCodesPage} />
        <Route path="/admin/smtp-stats" component={AdminSmtpStatsPage} />
        <Route path="/admin/churn" component={AdminChurnPage} />
        <Route path="/admin/revenue" component={AdminRevenuePage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/compliance" component={CompliancePage} />
        <Route path="/reviews" component={ClientReviewsPage} />
        <Route component={HomePage} />
      </Switch>
      </Suspense>
      </PageTransition>
      </main>
      <BottomNav />
      <PWAInstallPrompt />
      {/* LanguageFlyout is placed in each screen's header instead */}
    </div>
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
