// ReviewRocket — Onboarding Screen
// Design: Full-bleed navy background, gold CTA, rocket hero image
// First-time setup: business name, logo (optional), Google review link

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { BusinessProfile } from '@/lib/storage';
import { Rocket, Star, ChevronRight, Link2, Building2, Image } from 'lucide-react';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp';

export default function OnboardingPage() {
  const { updateProfile } = useApp();
  const [step, setStep] = useState<'welcome' | 'setup'>('welcome');
  const [businessName, setBusinessName] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; link?: string }>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const errs: { name?: string; link?: string } = {};
    if (!businessName.trim()) errs.name = 'Please enter your business name';
    if (!reviewLink.trim()) errs.link = 'Please enter your Google review link';
    else if (!reviewLink.includes('google') && !reviewLink.startsWith('http')) {
      errs.link = 'Please enter a valid Google review URL';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      const profile: BusinessProfile = {
        name: businessName.trim(),
        logoUrl: logoUrl.trim() || undefined,
        googleReviewLink: reviewLink.trim(),
        tier: 'free',
        onboardingComplete: true,
      };
      updateProfile(profile);
      setSaving(false);
    }, 600);
  }

  if (step === 'welcome') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'oklch(0.22 0.09 260)' }}
      >
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
          <div className="w-52 h-52 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <img src={HERO_IMG} alt="ReviewRocket" className="w-full h-full object-contain" />
          </div>

          <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Rocket size={20} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span
                className="text-sm font-bold tracking-widest uppercase"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
              >
                ReviewRocket
              </span>
            </div>
            <h1
              className="text-4xl mb-4 leading-tight"
              style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
            >
              More 5-Star Reviews.
              <br />
              <span style={{ color: 'oklch(0.80 0.18 80)' }}>On Autopilot.</span>
            </h1>
            <p
              className="text-base leading-relaxed mb-2"
              style={{ color: 'oklch(0.75 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              Send review requests to your customers in seconds — and watch the 5-star reviews roll in.
            </p>
          </div>

          {/* Feature pills */}
          <div
            className="flex flex-col gap-3 w-full mt-6 animate-fade-in-up"
            style={{ animationDelay: '0.35s' }}
          >
            {[
              { icon: '⚡', text: 'One-tap review requests via email or SMS' },
              { icon: '🔁', text: 'Automatic follow-up reminders after 3 days' },
              { icon: '📊', text: 'Track every request from your dashboard' },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'oklch(0.30 0.08 260)' }}
              >
                <span className="text-xl">{f.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'white', fontFamily: "'Nunito', sans-serif" }}
                >
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={() => setStep('setup')}
            className="rr-gold-btn w-full flex items-center justify-center gap-2 text-lg"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            Get Started Free
            <ChevronRight size={20} />
          </button>
          <p
            className="text-center text-xs mt-3"
            style={{ color: 'oklch(0.55 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
          >
            Free — 10 review requests/month. No credit card needed.
          </p>
        </div>
      </div>
    );
  }

  // Setup step
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'oklch(0.22 0.09 260)' }}
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-6">
        <button
          onClick={() => setStep('welcome')}
          className="text-sm mb-6 flex items-center gap-1"
          style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={22} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            Setup
          </span>
        </div>
        <h2
          className="text-3xl leading-tight"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Tell us about
          <br />
          your business
        </h2>
        <p
          className="text-sm mt-2"
          style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          Takes less than a minute. You can change this anytime in Settings.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-10 flex flex-col gap-5">
        {/* Business Name */}
        <div>
          <label
            className="block text-sm font-bold mb-2"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            <Building2 size={14} className="inline mr-1" />
            Business Name *
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => { setBusinessName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="e.g. Maria's Hair Salon"
            className="w-full px-4 py-4 rounded-xl text-base outline-none transition-all"
            style={{
              background: 'oklch(0.30 0.08 260)',
              color: 'white',
              border: errors.name ? '2px solid oklch(0.65 0.22 27)' : '2px solid transparent',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
            }}
          />
          {errors.name && (
            <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.22 27)' }}>{errors.name}</p>
          )}
        </div>

        {/* Google Review Link */}
        <div>
          <label
            className="block text-sm font-bold mb-2"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            <Link2 size={14} className="inline mr-1" />
            Google Review Link *
          </label>
          <input
            type="url"
            value={reviewLink}
            onChange={(e) => { setReviewLink(e.target.value); setErrors((p) => ({ ...p, link: undefined })); }}
            placeholder="https://g.page/r/your-business/review"
            className="w-full px-4 py-4 rounded-xl text-base outline-none transition-all"
            style={{
              background: 'oklch(0.30 0.08 260)',
              color: 'white',
              border: errors.link ? '2px solid oklch(0.65 0.22 27)' : '2px solid transparent',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
            }}
          />
          {errors.link && (
            <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.22 27)' }}>{errors.link}</p>
          )}
          <p
            className="text-xs mt-2"
            style={{ color: 'oklch(0.55 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
          >
            Find this in your Google Business Profile → "Get more reviews"
          </p>
        </div>

        {/* Logo URL (optional) */}
        <div>
          <label
            className="block text-sm font-bold mb-2"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            <Image size={14} className="inline mr-1" />
            Logo URL <span style={{ color: 'oklch(0.55 0.04 260)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yourbusiness.com/logo.png"
            className="w-full px-4 py-4 rounded-xl text-base outline-none"
            style={{
              background: 'oklch(0.30 0.08 260)',
              color: 'white',
              border: '2px solid transparent',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
            }}
          />
        </div>

        {/* Stars decoration */}
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={20}
              fill="oklch(0.80 0.18 80)"
              style={{ color: 'oklch(0.80 0.18 80)', animationDelay: `${i * 0.1}s` }}
              className="animate-star-pop"
            />
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rr-gold-btn w-full flex items-center justify-center gap-2 text-lg mt-2"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, opacity: saving ? 0.8 : 1 }}
        >
          {saving ? (
            <>
              <span className="animate-spin inline-block">🚀</span>
              Launching...
            </>
          ) : (
            <>
              Launch ReviewRocket
              <Rocket size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
