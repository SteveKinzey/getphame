// ReviewRocket — Dashboard Screen
// Design: Navy header with big stats, white activity feed below
// Shows: total requests sent, monthly count, full activity log

import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { BarChart2, Send, TrendingUp, Clock, Star, Crown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, h:mm a');
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    sent: { bg: 'oklch(0.22 0.09 260 / 0.08)', color: 'oklch(0.30 0.08 260)', label: 'Sent' },
    reminded: { bg: 'oklch(0.80 0.18 80 / 0.15)', color: 'oklch(0.68 0.18 75)', label: 'Reminded' },
    completed: { bg: 'oklch(0.55 0.18 145 / 0.15)', color: 'oklch(0.45 0.18 145)', label: 'Reviewed' },
  };
  const s = styles[status] || styles.sent;
  return (
    <span
      className="text-xs px-2 py-1 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color, fontFamily: "'Nunito', sans-serif" }}
    >
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { profile, requests, monthlyCount, totalCount, atFreeLimit, freeTierLimit } = useApp();
  const [, navigate] = useLocation();
  const isPro = profile?.tier === 'pro';

  // Group requests by month for the chart
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: format(d, 'MMM'),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });

  const monthlyData = months.map(({ label, year, month }) => {
    const count = requests.filter((r) => {
      const d = new Date(r.sentAt);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;
    return { label, count };
  });

  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);

  const remindedCount = requests.filter((r) => r.status === 'reminded').length;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy Header */}
      <div
        className="px-5 pt-14 pb-8"
        style={{ background: 'oklch(0.22 0.09 260)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            Dashboard
          </span>
        </div>
        <h1
          className="text-3xl mb-6"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Your Review Stats
        </h1>

        {/* Big stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'oklch(0.30 0.08 260)' }}
          >
            <TrendingUp size={18} style={{ color: 'oklch(0.80 0.18 80)', marginBottom: '8px' }} />
            <div
              className="text-4xl font-black mb-1"
              style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
            >
              {monthlyCount}
            </div>
            <div
              className="text-xs"
              style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Requests this month
            </div>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'oklch(0.30 0.08 260)' }}
          >
            <Send size={18} style={{ color: 'oklch(0.80 0.18 80)', marginBottom: '8px' }} />
            <div
              className="text-4xl font-black mb-1"
              style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
            >
              {totalCount}
            </div>
            <div
              className="text-xs"
              style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Total all time
            </div>
          </div>
        </div>

        {/* Reminders stat */}
        {isPro && (
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'oklch(0.30 0.08 260)' }}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span
                className="text-sm"
                style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                Follow-up reminders sent
              </span>
            </div>
            <span
              className="text-lg font-black"
              style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
            >
              {remindedCount}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pt-5">
        {/* Mini bar chart */}
        <div className="rr-card p-4 mb-4">
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
          >
            Requests — Last 6 Months
          </h3>
          <div className="flex items-end gap-2 h-24">
            {monthlyData.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${(count / maxCount) * 80}px`,
                      minHeight: count > 0 ? '4px' : '0',
                      background: count > 0
                        ? 'linear-gradient(180deg, oklch(0.80 0.18 80) 0%, oklch(0.68 0.18 75) 100%)'
                        : 'oklch(0.90 0.005 100)',
                    }}
                  />
                </div>
                <span
                  className="text-xs"
                  style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Free tier usage */}
        {!isPro && (
          <div className="rr-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-bold"
                style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                Free Tier Usage
              </h3>
              <button
                onClick={() => navigate('/upgrade')}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Nunito', sans-serif" }}
              >
                Upgrade <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex justify-between text-xs mb-2" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
              <span>{monthlyCount} used</span>
              <span>{freeTierLimit - monthlyCount} remaining</span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: 'oklch(0.90 0.005 100)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (monthlyCount / freeTierLimit) * 100)}%`,
                  background: atFreeLimit
                    ? 'oklch(0.65 0.22 27)'
                    : 'linear-gradient(90deg, oklch(0.80 0.18 80) 0%, oklch(0.68 0.18 75) 100%)',
                }}
              />
            </div>
            {atFreeLimit && (
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: 'oklch(0.65 0.22 27)', fontFamily: "'Nunito', sans-serif" }}
              >
                Limit reached — upgrade to send more this month
              </p>
            )}
          </div>
        )}

        {/* Activity Feed */}
        <div className="mb-4">
          <h3
            className="text-lg mb-3"
            style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            Activity Feed
          </h3>

          {requests.length === 0 ? (
            <div className="rr-card p-8 flex flex-col items-center text-center">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={22} fill="oklch(0.88 0.15 80)" style={{ color: 'oklch(0.88 0.15 80)' }} />
                ))}
              </div>
              <p
                className="font-bold text-base mb-1"
                style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                No activity yet
              </p>
              <p
                className="text-sm"
                style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                Send your first review request to see activity here.
              </p>
              <button
                onClick={() => navigate('/send')}
                className="rr-gold-btn mt-4 px-6 flex items-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
              >
                <Send size={16} />
                Send First Request
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((req, i) => (
                <div
                  key={req.id}
                  className="rr-card px-4 py-4 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start gap-3">
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
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p
                          className="font-bold text-sm truncate"
                          style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
                        >
                          {req.customerName}
                        </p>
                        <StatusBadge status={req.status} />
                      </div>
                      <p
                        className="text-xs mb-1"
                        style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                      >
                        {req.method === 'email' ? '📧 Email' : req.method === 'sms' ? '📱 SMS' : '📧📱 Email & SMS'}
                        {req.customerEmail && ` · ${req.customerEmail}`}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                      >
                        Sent {formatDate(req.sentAt)}
                      </p>
                      {req.reminderSentAt && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'oklch(0.68 0.18 75)', fontFamily: "'Nunito', sans-serif" }}
                        >
                          Reminder sent {formatDate(req.reminderSentAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
