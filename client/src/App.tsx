// ReviewRocket App
// Design: Bold Consumer App / Sports-Energy meets Local Business Tool
// Colors: Deep Navy (#0F1F4B) + Bright Gold (#FFB800)
// Fonts: Syne (headings) + Nunito (body)

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import BottomNav from "./components/BottomNav";
import { useReminders } from "./hooks/useReminders";

// Pages
import OnboardingPage from "./pages/Onboarding";
import HomePage from "./pages/Home";
import SendRequestPage from "./pages/SendRequest";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import UpgradePage from "./pages/Upgrade";

function ReminderProcessor() {
  useReminders();
  return null;
}

function AppShell() {
  const { profile } = useApp();

  // Show onboarding if no profile set up
  if (!profile?.onboardingComplete) {
    return (
      <div className="mobile-screen">
        <OnboardingPage />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      <ReminderProcessor />
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
          <AppProvider>
            <Toaster position="top-center" richColors />
            <AppShell />
          </AppProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
