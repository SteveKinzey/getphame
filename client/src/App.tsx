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
import { trpc } from "./lib/trpc";

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

  if (!user) {
    return <OnboardingPage />;
  }

  return (
    <div className="mobile-screen">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/send" component={SendRequestPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/upgrade" component={UpgradePage} />
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
