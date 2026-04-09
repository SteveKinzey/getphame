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
import HomePage from "./pages/Home";
import SendRequestPage from "./pages/SendRequest";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import UpgradePage from "./pages/Upgrade";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import PaymentSuccessPage from "./pages/PaymentSuccess";
import TermsOfServicePage from "./pages/TermsOfService";
import WooCustomersPage from "./pages/WooCustomers";
import SavedContactsPage from "./pages/SavedContacts";
import EmailTemplatesPage from "./pages/EmailTemplates";
import RemindersPage from "./pages/Reminders";
import ImportContactsPage from "./pages/ImportContacts";
import AdminCodesPage from "./pages/AdminCodes";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";

// Route guard: redirects free-tier users to /upgrade before rendering protected pages
function PaidRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "oklch(0.975 0.003 100)" }}>
        <Loader2 className="animate-spin" size={24} style={{ color: "oklch(0.22 0.09 260)" }} />
      </div>
    );
  }

  const tier = profile?.tier;
  const isPaid = tier === "pro" || tier === "annual" || tier === "lifetime";

  if (!isPaid) {
    // Redirect to upgrade — use effect to avoid render-phase navigation
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/upgrade")) {
      navigate("/upgrade");
    }
    return null;
  }

  return <Component />;
}

function AppShell() {
  const { user, loading } = useAuth();

  // Check for Gmail OAuth callback result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "1") {
      toast.success("Gmail connected! You can now send review requests from your Gmail account.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gmail_error") === "1") {
      toast.error("Gmail connection failed. Please try again in Settings.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

  if (!user) {
    return <OnboardingPage />;
  }

  return (
    <div className="mobile-screen">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/send">{() => <PaidRoute component={SendRequestPage} />}</Route>
        <Route path="/dashboard">{() => <PaidRoute component={DashboardPage} />}</Route>
        <Route path="/settings" component={SettingsPage} />
        <Route path="/upgrade" component={UpgradePage} />
        <Route path="/payment-success" component={PaymentSuccessPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        <Route path="/woo-customers">{() => <PaidRoute component={WooCustomersPage} />}</Route>
        <Route path="/contacts">{() => <PaidRoute component={SavedContactsPage} />}</Route>
        <Route path="/templates">{() => <PaidRoute component={EmailTemplatesPage} />}</Route>
        <Route path="/reminders">{() => <PaidRoute component={RemindersPage} />}</Route>
        <Route path="/import">{() => <PaidRoute component={ImportContactsPage} />}</Route>
        <Route path="/admin/codes" component={AdminCodesPage} />
        <Route component={HomePage} />
      </Switch>
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
