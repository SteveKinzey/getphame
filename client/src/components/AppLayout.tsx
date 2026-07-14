// AppLayout — Responsive shell for authenticated app pages
// Mobile (< 768px): full-width content + BottomNav (existing behaviour, unchanged)
// Tablet (768–1023px): icon-only sidebar (64px) + content
// Desktop (1024px+): full sidebar (220px) with labels + content
import { useLocation } from "wouter";
import { Home, Send, BarChart2, Settings, Moon, Sun, Zap, Crown, ShieldCheck, Users } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ReactNode } from "react";
import BrandLockup from "@/components/BrandLockup";
import { canManageSubscription, getEffectivePlan, PLAN_LABELS } from "@shared/plans";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { buttonPressHaptic } = useHaptics();
  const { user } = useAuth();
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: !!user });
  const { data: subscription } = trpc.stripe.subscriptionStatus.useQuery(undefined, {
    enabled: !!user && profile?.tier !== "free" && profile?.tier !== "lifetime",
  });
  const isDark = theme === "dark";

  const NAV_ITEMS = [
    { path: "/", label: t("nav.home"), Icon: Home },
    { path: "/send", label: t("nav.send"), Icon: Send },
    { path: "/dashboard", label: t("nav.dashboard"), Icon: BarChart2 },
    { path: "/settings", label: t("nav.settings"), Icon: Settings },
    ...(user?.role === "admin" ? [{ path: "/admin/users", label: t("nav.manageUsers", { defaultValue: "Manage users" }), Icon: Users }] : []),
  ];

  const effectivePlan = getEffectivePlan(profile?.tier, user?.role);
  const planLabel = PLAN_LABELS[effectivePlan];
  const isLife = effectivePlan === "life";
  const manageSubscription = canManageSubscription(effectivePlan);
  const renewalDate = subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(subscription.currentPeriodEnd))
    : null;

  return (
    <>
      {/* ── Desktop / Tablet Sidebar ──────────────────────────────────── */}
      {/* Hidden on mobile — BottomNav handles mobile navigation */}
      <aside
        className="app-sidebar hidden md:flex flex-col fixed top-0 left-0 h-full z-40"
        style={{
          background: "var(--navy)",
          borderRight: "1px solid oklch(0.28 0.08 260)",
          // 64px on tablet (md), 220px on desktop (lg)
          width: "64px",
        }}
      >
        {/* Brand — sidebar responsive widths are in index.css (.app-sidebar, .app-main) */}
        <div
          className="flex items-center justify-center lg:justify-start gap-2.5 px-3 lg:px-4 py-4 border-b"
          style={{ borderColor: "oklch(0.28 0.08 260)", minHeight: "64px" }}
        >
          <BrandLockup
            className="justify-center lg:justify-start"
            iconClassName="w-8 h-8"
            textClassName="app-sidebar-brand-text text-lg hidden"
          />
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-1 px-2">
          {/* Gold Send Request CTA — desktop only (hidden on icon-only tablet) */}
          <button
            onClick={() => { buttonPressHaptic(); navigate("/send"); }}
            className="mb-2 flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-3 py-2.5 rounded-xl w-full transition-all duration-200"
            style={{
              background: "oklch(0.75 0.18 80)",
              boxShadow: "0 2px 8px oklch(0.75 0.18 80 / 0.35)",
            }}
            title="Send Request"
          >
            <Send
              size={18}
              strokeWidth={2.2}
              className="flex-shrink-0"
              style={{ color: "oklch(0.18 0.05 260)" }}
            />
            <span
              className="app-sidebar-label text-sm font-black hidden"
              style={{ color: "oklch(0.18 0.05 260)", whiteSpace: "nowrap" }}
            >
              Send Request
            </span>
          </button>

          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const isActive =
              location === path || (path !== "/" && location.startsWith(path));
            return (
              <button
                key={path}
                onClick={() => {
                  buttonPressHaptic();
                  navigate(path);
                }}
                title={label}
                className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl transition-all duration-200 group w-full text-left"
                style={{
                  background: isActive ? "oklch(0.80 0.18 80 / 0.12)" : "transparent",
                  border: isActive
                    ? "1px solid oklch(0.80 0.18 80 / 0.25)"
                    : "1px solid transparent",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="flex-shrink-0 transition-colors duration-200"
                  style={{
                    color: isActive
                      ? "oklch(0.80 0.18 80)"
                      : "oklch(0.65 0.04 260)",
                  }}
                />
                <span
                  className="app-sidebar-label text-sm font-semibold hidden transition-colors duration-200"
                  style={{
                    color: isActive ? "oklch(0.80 0.18 80)" : "oklch(0.65 0.04 260)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: plan badge + theme + user */}
        <div
          className="px-2 pb-4 flex flex-col gap-1.5 border-t pt-3"
          style={{ borderColor: "oklch(0.28 0.08 260)" }}
        >
          {user?.role === "admin" && (
            <div
              data-testid="admin-sidebar-badge"
              className="flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-3 py-2 rounded-xl"
              title={t("account.administratorAccount", { defaultValue: "Administrator account" })}
              style={{
                background: "oklch(0.30 0.08 260)",
                border: "1px solid oklch(0.80 0.18 80 / 0.42)",
              }}
            >
              <ShieldCheck size={14} className="flex-shrink-0" style={{ color: "oklch(0.80 0.18 80)" }} />
              <span className="app-sidebar-label text-xs font-black hidden text-white">
                {t("account.administrator", { defaultValue: "Administrator" })}
              </span>
            </div>
          )}

          {/* Account status is always visible; Life is terminal and has no upgrade action. */}
          <div
            className="flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-3 py-2 rounded-xl"
            title={`${planLabel} account`}
            style={{
              background: "oklch(0.80 0.18 80 / 0.10)",
              border: "1px solid oklch(0.80 0.18 80 / 0.22)",
            }}
          >
            <Crown size={14} className="flex-shrink-0" style={{ color: "oklch(0.80 0.18 80)" }} />
            <span className="app-sidebar-label text-xs font-bold hidden" style={{ color: "oklch(0.80 0.18 80)" }}>
              {t("account.status", { defaultValue: "Status" })}: {planLabel}
              {renewalDate && !isLife && (
                <span className="block mt-0.5 text-[10px] font-semibold text-white/70">
                  {subscription?.cancelAtPeriodEnd
                    ? t("account.accessUntil", { defaultValue: "Access until {{date}}", date: renewalDate })
                    : t("account.renewsOn", { defaultValue: "Renews {{date}}", date: renewalDate })}
                </span>
              )}
            </span>
          </div>

          {!isLife && (
            <button
              onClick={() => navigate("/upgrade")}
              title={manageSubscription ? t("account.managePlan", { defaultValue: "Manage plan" }) : t("account.upgrade", { defaultValue: "Upgrade" })}
              className="flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-3 py-2 rounded-xl transition-all duration-200 hover:opacity-80 w-full"
              style={{
                background: "oklch(0.80 0.18 80 / 0.08)",
                border: "1px solid oklch(0.80 0.18 80 / 0.20)",
              }}
            >
              <Zap
                size={14}
                className="flex-shrink-0"
                style={{ color: "oklch(0.80 0.18 80)" }}
              />
              <span
                className="app-sidebar-label text-xs font-bold hidden"
                style={{ color: "oklch(0.80 0.18 80)" }}
              >
                {manageSubscription ? t("account.managePlan", { defaultValue: "Manage plan" }) : t("account.upgrade", { defaultValue: "Upgrade" })}
              </span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => {
              buttonPressHaptic();
              toggleTheme?.();
            }}
            title={isDark ? "Switch to light" : "Switch to dark"}
            className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/5 w-full"
          >
            {isDark ? (
              <Sun
                size={18}
                className="flex-shrink-0"
                style={{ color: "oklch(0.80 0.18 80)" }}
              />
            ) : (
              <Moon
                size={18}
                className="flex-shrink-0"
                style={{ color: "oklch(0.65 0.04 260)" }}
              />
            )}
            <span
              className="app-sidebar-label text-sm font-medium hidden"
              style={{ color: "oklch(0.65 0.04 260)" }}
            >
              {isDark ? "Light" : "Dark"}
            </span>
          </button>

          {/* User avatar */}
          {user && (
            <div
              className="flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2 rounded-xl"
              style={{ background: "oklch(0.18 0.06 260)" }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                style={{
                  background: "oklch(0.80 0.18 80)",
                  color: "oklch(0.15 0.06 260)",
                }}
              >
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="app-sidebar-label flex-1 min-w-0 hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user.name || "User"}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "oklch(0.55 0.04 260)" }}
                >
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content — offset on md/lg, full-width on mobile ─────── */}
      <div className="app-main flex-1 min-h-screen">
        {children}
      </div>
    </>
  );
}
