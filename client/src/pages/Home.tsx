// ReviewRocket — Home Screen
// Design: Navy header panel with rocket + stats, white content area below
// Shows quick stats, recent activity, and quick-send CTA

import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { Rocket, Star, Send, TrendingUp, Clock, ChevronRight, Crown } from 'lucide-react';
import { format } from 'date-fns';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d');
}

export default function HomePage() {
  const { profile, requests, monthlyCount, totalCount, atFreeLimit, remainingFree, freeTierLimit } = useApp();
  const [, navigate] = useLocation();

  const recentRequests = requests.slice(0, 5);
  const isPro = profile?.tier === 'pro';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy Header Panel */}
      <div
        className="relative px-5 pt-14 pb-8 overflow-hidden"
        style={{ background: 'oklch(0.22 0.09 260)' }}
      >
        {/* Background rocket image */}
        <div
          className="absolute right-0 top-0 w-40 h-40 opacity-15 pointer-events-none"
          style={{ transform: 'translate(10%, -10%)' }}
        >
          <img src={HERO_IMG} alt="" className="w-full h-full object-contain" />
        </div>

        {/* Header top row */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Rocket size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
              >
                ReviewRocket
              </span>
            </div>
            <h1
              className="text-2xl leading-tight"
              style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
            >
              Hey, {profile?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Ready to collect more reviews today?
            </p>
          </div>
          {isPro && (
            <div
              className="flex items-center gap-1 px-3 py-1.5 rounded-full"
              style={{ background: 'oklch(0.80 0.18 80)' }}
            >
              <Crown size={12} style={{ color: 'oklch(0.22 0.09 260)' }} />
              <span
                className="text-xs font-bold"
                style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                PRO
              </span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { label: 'This Month', value: monthlyCount, icon: TrendingUp },
            { label: 'All Time', value: totalCount, icon: Send },
            {
              label: isPro ? 'Unlimited' : 'Remaining',
              value: isPro ? '∞' : remainingFree,
              icon: Star,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center py-3 px-2 rounded-xl"
              style={{ background: 'oklch(0.30 0.08 260)' }}
            >
              <Icon size={14} style={{ color: 'oklch(0.80 0.18 80)', marginBottom: '4px' }} />
              <span
                className="rr-stat-number text-2xl leading-none"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
              >
                {value}
              </span>
              <span
                className="text-xs mt-1 text-center"
                style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Free tier progress bar */}
        {!isPro && (
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center mb-1.5">
              <span
                className="text-xs"
                style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                Free tier: {monthlyCount}/{freeTierLimit} requests used this month
              </span>
              {atFreeLimit && (
                <span
                  className="text-xs font-bold"
                  style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
                >
                  Limit reached
                </span>
              )}
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: 'oklch(0.30 0.08 260)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (monthlyCount / freeTierLimit) * 100)}%`,
                  background: atFreeLimit
                    ? 'oklch(0.65 0.22 27)'
                    : 'oklch(0.80 0.18 80)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="px-5 pt-5">
        {/* Quick Send CTA */}
        {atFreeLimit ? (
          <button
            onClick={() => navigate('/upgrade')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl mb-5 transition-all active:scale-98"
            style={{
              background: 'linear-gradient(135deg, oklch(0.22 0.09 260) 0%, oklch(0.30 0.08 260) 100%)',
              border: '2px solid oklch(0.80 0.18 80)',
            }}
          >
            <div className="flex items-center gap-3">
              <Crown size={24} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <div className="text-left">
                <p
                  className="font-bold text-sm"
                  style={{ color: 'white', fontFamily: "'Syne', sans-serif" }}
                >
                  Upgrade to Pro
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                >
                  Unlimited requests + auto-reminders
                </p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: 'oklch(0.80 0.18 80)' }} />
          </button>
        ) : (
          <button
            onClick={() => navigate('/send')}
            className="rr-gold-btn w-full flex items-center justify-center gap-3 text-lg mb-5"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            <Send size={22} />
            Send a Review Request
          </button>
        )}

        {/* Recent Activity */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg"
              style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
            >
              Recent Activity
            </h2>
            {requests.length > 5 && (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Nunito', sans-serif" }}
              >
                View all <ChevronRight size={14} />
              </button>
            )}
          </div>

          {recentRequests.length === 0 ? (
            <div
              className="rr-card p-8 flex flex-col items-center text-center"
            >
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={24}
                    fill="oklch(0.88 0.15 80)"
                    style={{ color: 'oklch(0.88 0.15 80)' }}
                  />
                ))}
              </div>
              <p
                className="font-bold text-base mb-1"
                style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                No requests yet
              </p>
              <p
                className="text-sm"
                style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                Send your first review request and start collecting those 5-star reviews!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentRequests.map((req, i) => (
                <div
                  key={req.id}
                  className="rr-card flex items-center gap-4 px-4 py-3.5 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{
                      background: 'oklch(0.22 0.09 260)',
                      color: 'oklch(0.80 0.18 80)',
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {req.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-sm truncate"
                      style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
                    >
                      {req.customerName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                    >
                      {req.method === 'email' ? '📧 Email' : req.method === 'sms' ? '📱 SMS' : '📧📱 Email & SMS'} · {formatRelativeTime(req.sentAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {req.status === 'reminded' ? (
                      <span
                        className="text-xs px-2 py-1 rounded-full font-semibold"
                        style={{
                          background: 'oklch(0.88 0.15 80 / 0.2)',
                          color: 'oklch(0.68 0.18 75)',
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        Reminded
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-1 rounded-full font-semibold"
                        style={{
                          background: 'oklch(0.22 0.09 260 / 0.08)',
                          color: 'oklch(0.30 0.08 260)',
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        Sent
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade nudge for free users */}
        {!isPro && !atFreeLimit && monthlyCount > 0 && (
          <button
            onClick={() => navigate('/upgrade')}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl mt-2 mb-4"
            style={{ background: 'oklch(0.80 0.18 80 / 0.12)', border: '1.5px solid oklch(0.80 0.18 80 / 0.3)' }}
          >
            <div className="flex items-center gap-3">
              <Crown size={18} style={{ color: 'oklch(0.68 0.18 75)' }} />
              <span
                className="text-sm font-bold"
                style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                Go Pro — Unlimited requests for $29/mo
              </span>
            </div>
            <ChevronRight size={16} style={{ color: 'oklch(0.68 0.18 75)' }} />
          </button>
        )}

        {/* Pending reminders notice */}
        {profile?.tier === 'pro' && (
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl mb-4"
            style={{ background: 'oklch(0.22 0.09 260 / 0.06)' }}
          >
            <Clock size={18} style={{ color: 'oklch(0.52 0.04 260)' }} />
            <p
              className="text-sm"
              style={{ color: 'oklch(0.40 0.06 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Auto-reminders are active — customers who haven't reviewed after 3 days get a friendly nudge.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
