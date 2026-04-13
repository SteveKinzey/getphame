import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import BottomNav from "./components/BottomNav";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

// Pages
import OnboardingPage from "./pages/Onboarding";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/Home";
import SendRequestPage from "./pages/SendRequest";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";

import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import PaymentSuccessPage from "./pages/PaymentSuccess";
import TermsOfServicePage from "./pages/TermsOfService";
import WooCustomersPage from "./pages/WooCustomers";
import SavedContactsPage from "./pages/SavedContacts";
import EmailTemplatesPage from "./pages/EmailTemplates";
import RemindersPage from "./pages/Reminders";
import ImportContactsPage from "./pages/ImportContacts";
import AdminCodesPage from "./pages/AdminCodes";
import AdminSmtpStatsPage from "./pages/AdminSmtpStats";
import ChangelogPage from "./pages/Changelog";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";
import OnboardingWizard from "./components/OnboardingWizard";
import OnboardingGuide, { useOnboardingGuide } from "./components/OnboardingGuide";


function AppShell() {
  const { user, loading, isAuthenticated } = useAuth();
  const { open: guideOpen, setOpen: setGuideOpen, handleClose: handleGuideClose } = useOnboardingGuide(isAuthenticated);

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
      <div className="mobile-screen flex items-center justify-center" style={{ background: "oklch(0.22 0.09 260)" }}>
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  // Public pages accessible without login
  const path = window.location.pathname;
  if (path === "/privacy-policy") return <PrivacyPolicyPage />;
  if (path === "/terms-of-service") return <TermsOfServicePage />;
  if (path === "/payment-success") return <PaymentSuccessPage />;
  if (path === "/changelog") return <ChangelogPage />;

  if (!user) {
    // Show the public marketing landing page at /, Onboarding at /onboarding
    if (path === "/onboarding") return <OnboardingPage />;
    return <LandingPage />;
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
        <Route path="/admin/codes" component={AdminCodesPage} />
        <Route path="/admin/smtp-stats" component={AdminSmtpStatsPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route component={HomePage} />
      </Switch>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
