// Phame — Bottom Navigation Bar
// Design: Navy background, gold active state, large tap targets (48px+)
// Animations: active tab gold underline slide, icon scale pulse, press haptic,
//             hover scale + gold glow on icon container, label colour lift

import { useLocation } from 'wouter';
import { Home, Send, BarChart2, Settings, Moon, Sun, ShieldCheck, MoreHorizontal, LogOut } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { buttonPressHaptic } = useHaptics();
  const { user, logout, loading: authLoading } = useAuth();
  const isDark = theme === 'dark';

  const NAV_ITEMS = [
    { path: '/', label: t('nav.home'), Icon: Home },
    { path: '/send', label: t('nav.send'), Icon: Send },
    { path: '/dashboard', label: t('nav.dashboard'), Icon: BarChart2 },
    { path: '/settings', label: t('nav.settings'), Icon: Settings },
    ...(user?.role === 'admin' ? [{ path: '/admin/users', label: t('nav.admin', { defaultValue: 'Admin' }), Icon: ShieldCheck }] : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav rr-bg-navy"
      style={{ borderTop: "1px solid oklch(0.30 0.08 260)" }}
    >
      {/* Equal-width app tabs plus account menu; admins receive one extra tab. */}
      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length + 1}, 1fr)` }}>
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = location === path || (path !== '/' && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => {
                buttonPressHaptic();
                navigate(path);
              }}
              className="nav-item flex flex-col items-center justify-center py-3 gap-1 relative overflow-hidden group"
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
                className="text-xs font-semibold tracking-wide transition-all duration-200 group-hover:opacity-100"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.80 0.02 260)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center justify-center py-3 gap-1 group"
              style={{ minHeight: '60px' }}
              aria-label={t('nav.more', { defaultValue: 'More' })}
            >
              <div
                className="flex items-center justify-center rounded-full transition-all duration-200 ease-out bg-transparent group-hover:scale-110 group-active:scale-95"
                style={{ width: '40px', height: '32px' }}
              >
                <MoreHorizontal
                  size={22}
                  strokeWidth={1.8}
                  className="transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.5)]"
                  style={{ color: 'oklch(0.85 0.02 260)' }}
                />
              </div>
              <span
                className="text-xs font-semibold tracking-wide transition-colors duration-200"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: 'oklch(0.80 0.02 260)',
                  fontSize: '12px',
                }}
              >
                {t('nav.more', { defaultValue: 'More' })}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-56 border-white/15 bg-[#08172b] p-2 text-white shadow-2xl"
          >
            <DropdownMenuItem
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
      <div className="rr-bg-gold px-4 pt-2 pb-1">
        {/* Mobile legal links — deliberate two-row order for readability. */}
        <div data-testid="mobile-footer-primary-links" className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate('/privacy-policy')}
            className="text-sm font-bold leading-tight hover:underline transition-colors rr-text-navy"
          >
            {t('footer.privacyPolicy')}
          </button>
          <span aria-hidden="true" style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
          <button
            onClick={() => navigate('/terms-of-service')}
            className="text-sm font-bold leading-tight hover:underline transition-colors rr-text-navy"
          >
            {t('footer.termsOfService')}
          </button>
          <span aria-hidden="true" style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
          <button
            onClick={() => navigate('/compliance')}
            className="text-sm font-bold leading-tight hover:underline transition-colors rr-text-navy"
          >
            {t('footer.compliance')}
          </button>
        </div>

        <div data-testid="mobile-footer-secondary-links" className="mt-1 flex items-center justify-center gap-2">
          <button
            onClick={() => navigate('/security')}
            className="text-sm font-bold leading-tight hover:underline transition-colors rr-text-navy"
          >
            Security
          </button>
          <span aria-hidden="true" style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
          <button
            onClick={() => navigate('/changelog')}
            className="text-sm font-bold leading-tight hover:underline transition-colors rr-text-navy"
          >
            {t('footer.whatsNew')}
          </button>
        </div>

        {/* Copyright notice */}
        <p
          className="text-center mt-0.5 pb-0.5"
          style={{
            fontSize: '11px',
            color: '#000a29',
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: '0.02em',
            paddingTop: '8px',
          }}
        >
          Copyright &copy; 2026 SK America
        </p>
      </div>
    </nav>
  );
}
