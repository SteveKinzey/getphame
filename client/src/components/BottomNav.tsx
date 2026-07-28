// Phame — Bottom Navigation Bar
// Design: Navy background, gold active state, large tap targets (48px+)
// Animations: active tab gold underline slide, icon scale pulse, press haptic,
//             hover scale + gold glow on icon container, label colour lift

import { useLocation } from 'wouter';
import { Home, Send, BarChart2, Settings, Moon, Sun, ShieldCheck, UserRound, LogOut, BookOpen } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import NetworkStatusBadge from '@/components/NetworkStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { buttonPressHaptic } = useHaptics();
  const { user, logout, loading: authLoading } = useAuth();
  const { data: accountProfile } = trpc.accountProfile.get.useQuery(undefined, { enabled: !!user });
  const isDark = theme === 'dark';
  const manualLabel = user?.role === 'admin'
    ? t('nav.adminManual', { defaultValue: 'Admin Manual' })
    : t('nav.userManual', { defaultValue: 'User Manual' });

  const NAV_ITEMS = [
    { path: '/', label: t('nav.home'), Icon: Home },
    { path: '/send', label: t('nav.send'), Icon: Send },
    {
      path: '/dashboard',
      label: t('nav.dashboard'),
      compactLabel: t('nav.mobileDashboard', { defaultValue: t('nav.dashboard') }),
      Icon: BarChart2,
    },
    {
      path: '/settings',
      label: t('nav.settings'),
      compactLabel: t('nav.mobileSettings', { defaultValue: t('nav.settings') }),
      Icon: Settings,
    },
    ...(user?.role === 'admin' ? [{
      path: '/admin',
      label: t('nav.admin', { defaultValue: 'Admin' }),
      compactLabel: t('nav.mobileAdmin', { defaultValue: t('nav.admin', { defaultValue: 'Admin' }) }),
      Icon: ShieldCheck,
    }] : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav rr-bg-navy"
      style={{ borderTop: "1px solid oklch(0.30 0.08 260)" }}
    >
      <NetworkStatusBadge variant="mobile" />

      {/* Equal-width app tabs plus account menu; admins receive one extra tab. */}
      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length + 1}, minmax(0, 1fr))` }}>
        {NAV_ITEMS.map(({ path, label, compactLabel, Icon }) => {
          const isActive = location === path || (path !== '/' && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => {
                buttonPressHaptic();
                navigate(path);
              }}
              className="nav-item group relative flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 py-2"
              style={{ minHeight: '60px' }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Gold underline indicator — slides in from below when active */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: isActive ? '28px' : '0px',
                  background: 'oklch(0.80 0.18 80)',
                  opacity: isActive ? 1 : 0,
                }}
              />

              {/* Icon container — scales up and shows gold glow on hover */}
              <div
                className="flex items-center justify-center rounded-full transition-all duration-200 ease-out group-hover:scale-110 group-active:scale-95"
                style={{
                  width: '40px',
                  height: '32px',
                  background: isActive
                    ? 'oklch(0.80 0.18 80 / 0.15)'
                    : 'transparent',
                  transform: isActive ? 'scale(1.08)' : undefined,
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.7)]"
                  style={{
                    color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.85 0.02 260)',
                  }}
                />
              </div>

              {/* Label — lifts to gold on hover */}
              <span
                data-auto-localize="off"
                className="block w-full truncate px-0.5 text-center text-[9px] font-semibold leading-[1.1] tracking-wide transition-all duration-200 group-hover:opacity-100 sm:whitespace-normal sm:text-xs"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.80 0.02 260)',
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {compactLabel ? (
                  <>
                    <span className="sm:hidden">{compactLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                ) : label}
              </span>
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="mobile-account-menu-trigger"
              className="group flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2"
              style={{ minHeight: '60px' }}
              aria-label={t('profileMenu.open', { defaultValue: 'Open account menu' })}
            >
              <div
                className="flex items-center justify-center rounded-full transition-all duration-200 ease-out bg-transparent group-hover:scale-110 group-active:scale-95"
                style={{ width: '40px', height: '32px' }}
              >
                <img
                  src={accountProfile?.avatarUrl || 'https://assets.getphame.app/getphame-logo.svg'}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.5)]"
                />
              </div>
              <span
                className="line-clamp-2 max-w-full break-words text-center text-[10px] font-semibold leading-[1.1] tracking-wide transition-colors duration-200 sm:text-xs"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: 'oklch(0.80 0.02 260)',
                }}
              >
                {t('profileMenu.account', { defaultValue: 'Account' })}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-56 border-white/15 bg-[#08172b] p-2 text-white shadow-2xl"
          >
            {user && (
              <>
                <DropdownMenuLabel className="px-3 py-2 font-normal">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/50">
                    {t('profileMenu.signedInAs', { defaultValue: 'Signed in as' })}
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold text-white">{user.name || 'User'}</span>
                  <span className="block truncate text-xs text-white/60">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/15" />
                <DropdownMenuItem
                  data-testid="mobile-dashboard-link"
                  onSelect={() => {
                    buttonPressHaptic();
                    navigate('/dashboard');
                  }}
                  className="min-h-12 cursor-pointer gap-3 rounded-lg text-sm font-semibold focus:bg-white/10 focus:text-white"
                >
                  <BarChart2 size={18} className="rr-text-gold" />
                  {t('profileMenu.dashboard', { defaultValue: 'Dashboard' })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="mobile-account-details"
                  onSelect={() => {
                    buttonPressHaptic();
                    navigate('/settings');
                  }}
                  className="min-h-12 cursor-pointer gap-3 rounded-lg text-sm font-semibold focus:bg-white/10 focus:text-white"
                >
                  <UserRound size={18} className="rr-text-gold" />
                  {t('profileMenu.accountDetails', { defaultValue: 'Account details' })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="mobile-manual-link"
                  onSelect={() => {
                    buttonPressHaptic();
                    navigate('/manual');
                  }}
                  className="min-h-12 cursor-pointer gap-3 rounded-lg text-sm font-semibold focus:bg-white/10 focus:text-white"
                >
                  <BookOpen size={18} className="rr-text-gold" />
                  {manualLabel}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/15" />
              </>
            )}
            <DropdownMenuItem
              data-testid="mobile-theme-toggle"
              onSelect={() => {
                buttonPressHaptic();
                toggleTheme?.();
              }}
              className="min-h-12 cursor-pointer gap-3 rounded-lg text-sm font-semibold focus:bg-white/10 focus:text-white"
            >
              {isDark ? <Sun size={18} className="rr-text-gold" /> : <Moon size={18} className="text-white" />}
              {isDark ? t('theme.light') : t('theme.dark')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/15" />
            <DropdownMenuItem
              data-testid="mobile-logout"
              disabled={authLoading}
              onSelect={() => {
                buttonPressHaptic();
                void logout().then(() => navigate('/'));
              }}
              className="min-h-12 cursor-pointer gap-3 rounded-lg text-sm font-semibold text-white focus:bg-white/10 focus:text-white disabled:cursor-wait"
            >
              <LogOut size={18} className="text-white" />
              {t('logout.button', { defaultValue: 'Log Out' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Gold ribbon footer ─────────────────────────────────────────── */}
      <div className="rr-bg-gold px-4 pt-2 pb-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] sm:px-5">
        {/* Mobile legal links — deliberate two-row order for readability. */}
        <div data-testid="mobile-footer-primary-links" className="grid grid-cols-3 gap-1">
          <button
            onClick={() => navigate('/privacy-policy')}
            className="min-h-9 min-w-0 rounded-md px-1 py-1 text-[11px] font-bold leading-[1.1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1d4d] rr-text-navy sm:text-xs"
          >
            {t('footer.privacyPolicy')}
          </button>
          <button
            onClick={() => navigate('/terms-of-service')}
            className="min-h-9 min-w-0 rounded-md px-1 py-1 text-[11px] font-bold leading-[1.1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1d4d] rr-text-navy sm:text-xs"
          >
            {t('footer.termsOfService')}
          </button>
          <button
            onClick={() => navigate('/compliance')}
            className="min-h-9 min-w-0 rounded-md px-1 py-1 text-[11px] font-bold leading-[1.1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1d4d] rr-text-navy sm:text-xs"
          >
            {t('footer.compliance')}
          </button>
        </div>

        <div data-testid="mobile-footer-secondary-links" className="mx-auto mt-1 grid max-w-56 grid-cols-2 gap-1">
          <button
            onClick={() => navigate('/security')}
            className="min-h-9 min-w-0 rounded-md px-1 py-1 text-[11px] font-bold leading-[1.1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1d4d] rr-text-navy sm:text-xs"
          >
            Security
          </button>
          <button
            onClick={() => navigate('/changelog')}
            className="min-h-9 min-w-0 rounded-md px-1 py-1 text-[11px] font-bold leading-[1.1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1d4d] rr-text-navy sm:text-xs"
          >
            {t('footer.whatsNew')}
          </button>
        </div>

        {/* Copyright notice */}
        <p
          className="mt-0.5 max-w-full text-center text-[10px] leading-tight sm:text-[11px]"
          style={{
            color: '#000a29',
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: '0.02em',
            paddingTop: '6px',
          }}
        >
          Copyright &copy; 2026 SK America
        </p>
      </div>
    </nav>
  );
}
