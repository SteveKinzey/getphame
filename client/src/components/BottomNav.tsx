// ReviewLink — Bottom Navigation Bar
// Design: Navy background, gold active state, large tap targets (48px+)

import { useLocation } from 'wouter';
import { Home, Send, BarChart2, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_ITEMS = [
  { path: '/', label: 'Home', Icon: Home },
  { path: '/send', label: 'Send', Icon: Send },
  { path: '/dashboard', label: 'Dashboard', Icon: BarChart2 },
  { path: '/settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bottom-nav rr-bg-navy" style={{ borderTop: "1px solid oklch(0.30 0.08 260)", maxWidth: "480px", margin: "0 auto" }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = location === path || (path !== '/' && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all duration-150 active:scale-95"
              style={{ minHeight: '60px' }}
              aria-label={label}
            >
              <div className="relative">
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: '40px',
                    height: '32px',
                    background: isActive ? 'oklch(0.80 0.18 80 / 0.15)' : 'transparent',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{
                      color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.70 0.04 260)',
                    }}
                  />
                </div>
              </div>
              <span
                className="text-xs font-semibold tracking-wide"
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: isActive ? 'oklch(0.80 0.18 80)' : 'oklch(0.60 0.04 260)',
                  fontSize: '10px',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center py-3 gap-1 transition-all duration-150 active:scale-95 px-3"
          style={{ minHeight: '60px' }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <div
            className="flex items-center justify-center rounded-full transition-all duration-200 bg-transparent" style={{ width: "40px", height: "32px" }}
          >
            {isDark ? (
              <Sun size={20} strokeWidth={1.8} className="rr-text-gold" />
            ) : (
              <Moon size={20} strokeWidth={1.8} style={{ color: 'oklch(0.70 0.04 260)' }} />
            )}
          </div>
          <span
            className="text-xs font-semibold tracking-wide"
            style={{
              fontFamily: "'Nunito', sans-serif",
              color: 'oklch(0.60 0.04 260)',
              fontSize: '10px',
            }}
          >
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>
      </div>

      {/* ── Legal footer strip ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-4 py-1.5 rr-bg-gold"
      >
        <button
          onClick={() => navigate('/privacy-policy')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          Privacy Policy
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/terms-of-service')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          Terms of Service
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/changelog')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          What's New
        </button>
        <span style={{ color: 'oklch(0.35 0.08 260)', fontSize: '10px' }}>·</span>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs font-semibold hover:underline transition-colors rr-text-navy"
        >
          Compliance
        </button>
      </div>
    </nav>
  );
}
