// Phame — Bottom Navigation Bar
// Design: Navy background, gold active state, large tap targets (48px+)
// Animations: active tab gold underline slide, icon scale pulse, press haptic,
//             hover scale + gold glow on icon container, label colour lift

import { useLocation } from 'wouter';
import { Home, Send, BarChart2, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useHaptics } from '@/hooks/useHaptics';

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { buttonPressHaptic } = useHaptics();
  const isDark = theme === 'dark';

  const NAV_ITEMS = [
    { path: '/', label: t('nav.home'), Icon: Home },
    { path: '/send', label: t('nav.send'), Icon: Send },
    { path: '/dashboard', label: t('nav.dashboard'), Icon: BarChart2 },
    { path: '/settings', label: t('nav.settings'), Icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bottom-nav rr-bg-navy"
      style={{ borderTop: "1px solid oklch(0.30 0.08 260)" }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = location === path || (path !== '/' && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => {
                buttonPressHaptic();
                navigate(path);
              }}
              className="nav-item flex-1 flex flex-col items-center justify-center py-3 gap-1 relative overflow-hidden group"
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
                  // Gold glow on hover via box-shadow applied through CSS class below
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.7)]"
                  style={{
                    color: isActive
                      ? 'oklch(0.80 0.18 80)'
                      : 'oklch(0.70 0.04 260)',
                  }}
                />
              </div>

              {/* Label — lifts to gold on hover */}
              <span
                className="text-xs font-semibold tracking-wide transition-all duration-200 group-hover:opacity-100"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.60 0.04 260)',
                  fontSize: '10px',
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}

        {/* Dark mode toggle */}
        <button
          onClick={() => {
            buttonPressHaptic();
            toggleTheme?.();
          }}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 group"
          style={{ minHeight: '60px' }}
          aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
        >
          <div
            className="flex items-center justify-center rounded-full transition-all duration-200 ease-out bg-transparent group-hover:scale-110 group-active:scale-95"
            style={{ width: "40px", height: "32px" }}
          >
            {isDark ? (
              <Sun
                size={20}
                strokeWidth={1.8}
                className="rr-text-gold transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.7)]"
              />
            ) : (
              <Moon
                size={20}
                strokeWidth={1.8}
                className="transition-all duration-200 group-hover:drop-shadow-[0_0_6px_oklch(0.80_0.18_80/0.5)]"
                style={{ color: 'oklch(0.70 0.04 260)' }}
              />
            )}
          </div>
          <span
            className="text-xs font-semibold tracking-wide transition-colors duration-200"
            style={{
              fontFamily: "'Nunito', sans-serif",
              color: 'oklch(0.60 0.04 260)',
              fontSize: '10px',
            }}
          >
            {isDark ? t('theme.light') : t('theme.dark')}
          </span>
        </button>
      </div>

      {/* ── Legal footer strip ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 py-1.5 rr-bg-gold">
        <button
          onClick={() => navigate('/privacy-policy')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          {t('footer.privacyPolicy')}
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/terms-of-service')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          {t('footer.termsOfService')}
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/changelog')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          {t('footer.whatsNew')}
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          {t('footer.compliance')}
        </button>
      </div>
    </nav>
  );
}
