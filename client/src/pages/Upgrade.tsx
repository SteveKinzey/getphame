// ReviewRocket — Upgrade to Pro Screen
// Design: Navy background, gold crown hero, premium pricing card
// Shows: feature comparison, $29/mo pricing, upgrade CTA

import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { Crown, Check, Rocket, Star, Zap, Clock, BarChart2, ChevronLeft, Infinity } from 'lucide-react';
import { toast } from 'sonner';

const UPGRADE_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-upgrade-hero-jBNmQektQK78tAwwYJ9c87.webp';

const FREE_FEATURES = [
  '10 review requests per month',
  'Email & SMS sending',
  'Basic activity feed',
  'Local data storage',
];

const PRO_FEATURES = [
  { icon: Infinity, text: 'Unlimited review requests' },
  { icon: Clock, text: 'Automatic 3-day follow-up reminders' },
  { icon: BarChart2, text: 'Full review monitoring dashboard' },
  { icon: Zap, text: 'Priority email & SMS delivery' },
  { icon: Star, text: 'Advanced analytics & insights' },
  { icon: Rocket, text: 'Early access to new features' },
];

export default function UpgradePage() {
  const { profile, updateProfile } = useApp();
  const [, navigate] = useLocation();
  const isPro = profile?.tier === 'pro';

  function handleUpgrade() {
    // In a real app, this would open Stripe checkout
    // For demo purposes, we simulate the upgrade
    toast.info('Stripe checkout coming soon! For demo: activating Pro now...', { duration: 3000 });
    setTimeout(() => {
      if (profile) {
        updateProfile({ ...profile, tier: 'pro' });
        toast.success('🎉 Welcome to ReviewRocket Pro!', { duration: 4000 });
        navigate('/');
      }
    }, 1500);
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'oklch(0.22 0.09 260)' }}
    >
      {/* Back button */}
      <div className="px-5 pt-14 pb-2">
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="px-5 pb-6 flex flex-col items-center text-center">
        <div className="w-48 h-32 mb-4">
          <img src={UPGRADE_IMG} alt="Pro" className="w-full h-full object-contain" />
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ background: 'oklch(0.80 0.18 80 / 0.15)', border: '1.5px solid oklch(0.80 0.18 80 / 0.4)' }}
        >
          <Crown size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span
            className="text-sm font-bold"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            ReviewRocket Pro
          </span>
        </div>
        <h1
          className="text-4xl mb-3 leading-tight"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Supercharge Your
          <br />
          <span style={{ color: 'oklch(0.80 0.18 80)' }}>Review Game</span>
        </h1>
        <p
          className="text-base"
          style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          Everything you need to consistently collect 5-star reviews on autopilot.
        </p>
      </div>

      {/* Pricing Card */}
      <div className="px-5 mb-5">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: 'white' }}
        >
          {/* Price header */}
          <div
            className="px-6 py-5 text-center"
            style={{ background: 'linear-gradient(135deg, oklch(0.22 0.09 260) 0%, oklch(0.28 0.09 260) 100%)' }}
          >
            <div className="flex items-end justify-center gap-1 mb-1">
              <span
                className="text-6xl font-black"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
              >
                $29
              </span>
              <span
                className="text-lg pb-3"
                style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                /month
              </span>
            </div>
            <p
              className="text-sm"
              style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Cancel anytime. No contracts.
            </p>
          </div>

          {/* Features list */}
          <div className="px-6 py-5">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}
            >
              Everything in Pro includes:
            </p>
            <div className="flex flex-col gap-3">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'oklch(0.80 0.18 80 / 0.12)' }}
                  >
                    <Icon size={15} style={{ color: 'oklch(0.68 0.18 75)' }} />
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Nunito', sans-serif" }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            {isPro ? (
              <div
                className="w-full flex items-center justify-center gap-2 py-4 rounded-full"
                style={{ background: 'oklch(0.80 0.18 80 / 0.12)' }}
              >
                <Crown size={18} style={{ color: 'oklch(0.68 0.18 75)' }} />
                <span
                  className="font-bold"
                  style={{ color: 'oklch(0.68 0.18 75)', fontFamily: "'Syne', sans-serif" }}
                >
                  You're already on Pro!
                </span>
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                className="rr-gold-btn w-full flex items-center justify-center gap-2 text-lg"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
              >
                <Crown size={20} />
                Upgrade to Pro — $29/mo
              </button>
            )}
            <p
              className="text-center text-xs mt-3"
              style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Secure payment via Stripe. Cancel anytime from Settings.
            </p>
          </div>
        </div>
      </div>

      {/* Free vs Pro comparison */}
      <div className="px-5 mb-5">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'oklch(0.30 0.08 260)' }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            Free vs Pro
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p
                className="text-xs font-bold mb-3 uppercase tracking-wide"
                style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Syne', sans-serif" }}
              >
                Free
              </p>
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2 mb-2">
                  <Check size={12} style={{ color: 'oklch(0.60 0.04 260)', marginTop: '2px', flexShrink: 0 }} />
                  <span
                    className="text-xs"
                    style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                  >
                    {f}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p
                className="text-xs font-bold mb-3 uppercase tracking-wide"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
              >
                Pro ✨
              </p>
              {PRO_FEATURES.map(({ text }) => (
                <div key={text} className="flex items-start gap-2 mb-2">
                  <Check size={12} style={{ color: 'oklch(0.80 0.18 80)', marginTop: '2px', flexShrink: 0 }} />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: 'white', fontFamily: "'Nunito', sans-serif" }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="px-5 mb-5">
        <div className="flex flex-col gap-3">
          {[
            { name: 'Maria T.', biz: "Maria's Hair Salon", quote: "ReviewRocket doubled our Google reviews in the first month. It's so easy to use!" },
            { name: 'Carlos R.', biz: 'Carlos Auto Repair', quote: "I send a request after every job. My customers love how simple it is." },
          ].map(({ name, biz, quote }) => (
            <div
              key={name}
              className="rounded-2xl p-4"
              style={{ background: 'oklch(0.30 0.08 260)' }}
            >
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={12} fill="oklch(0.80 0.18 80)" style={{ color: 'oklch(0.80 0.18 80)' }} />
                ))}
              </div>
              <p
                className="text-sm mb-3 italic"
                style={{ color: 'oklch(0.75 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
              >
                "{quote}"
              </p>
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: 'white', fontFamily: "'Syne', sans-serif" }}
                >
                  {name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
                >
                  {biz}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
