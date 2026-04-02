// ReviewRocket — Settings Screen
// Design: Navy header, white cards for each settings section
// Sections: Business Profile, Google Review Link, EmailJS Config, Plan, Reset

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { BusinessProfile } from '@/lib/storage';
import { Settings, Building2, Link2, Crown, ChevronRight, Save, CheckCircle2, Trash2, Mail, Key, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, updateProfile } = useApp();
  const [, navigate] = useLocation();

  const [businessName, setBusinessName] = useState(profile?.name || '');
  const [reviewLink, setReviewLink] = useState(profile?.googleReviewLink || '');
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || '');
  const [emailjsServiceId, setEmailjsServiceId] = useState(profile?.emailjsServiceId || '');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState(profile?.emailjsTemplateId || '');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState(profile?.emailjsPublicKey || '');
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showEmailjs, setShowEmailjs] = useState(false);

  useEffect(() => {
    setBusinessName(profile?.name || '');
    setReviewLink(profile?.googleReviewLink || '');
    setLogoUrl(profile?.logoUrl || '');
    setEmailjsServiceId(profile?.emailjsServiceId || '');
    setEmailjsTemplateId(profile?.emailjsTemplateId || '');
    setEmailjsPublicKey(profile?.emailjsPublicKey || '');
  }, [profile]);

  function handleSave() {
    if (!businessName.trim() || !reviewLink.trim()) {
      toast.error('Business name and review link are required');
      return;
    }
    const updated: BusinessProfile = {
      ...profile!,
      name: businessName.trim(),
      googleReviewLink: reviewLink.trim(),
      logoUrl: logoUrl.trim() || undefined,
      emailjsServiceId: emailjsServiceId.trim() || undefined,
      emailjsTemplateId: emailjsTemplateId.trim() || undefined,
      emailjsPublicKey: emailjsPublicKey.trim() || undefined,
    };
    updateProfile(updated);
    setSaved(true);
    toast.success('Settings saved!');
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    localStorage.clear();
    window.location.reload();
  }

  const isPro = profile?.tier === 'pro';

  const inputStyle = {
    background: 'oklch(0.975 0.003 100)',
    color: 'oklch(0.22 0.09 260)',
    border: '2px solid oklch(0.90 0.005 100)',
    fontFamily: "'Nunito', sans-serif",
    fontSize: '16px',
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'oklch(0.22 0.09 260)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Settings size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            Settings
          </span>
        </div>
        <h1
          className="text-3xl"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Your Profile
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          Update your business info and preferences.
        </p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">
        {/* Business Profile Card */}
        <div className="rr-card p-5">
          <h2
            className="text-base font-bold mb-4 flex items-center gap-2"
            style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
          >
            <Building2 size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
            Business Profile
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Business Name *
              </label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-base outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Logo URL (optional)
              </label>
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://yourbusiness.com/logo.png"
                className="w-full px-4 py-3.5 rounded-xl text-base outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Google Review Link Card */}
        <div className="rr-card p-5">
          <h2
            className="text-base font-bold mb-1 flex items-center gap-2"
            style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
          >
            <Link2 size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
            Google Review Link
          </h2>
          <p className="text-xs mb-4" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            This link is included in every review request you send.
          </p>
          <input type="url" value={reviewLink} onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/your-business/review"
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none" style={inputStyle} />
          <p className="text-xs mt-2" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            Find this in Google Business Profile → "Get more reviews"
          </p>
        </div>

        {/* EmailJS Configuration */}
        <div className="rr-card p-5">
          <button
            onClick={() => setShowEmailjs(!showEmailjs)}
            className="w-full flex items-center justify-between"
          >
            <h2
              className="text-base font-bold flex items-center gap-2"
              style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
            >
              <Mail size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              Email Integration
              {(emailjsServiceId && emailjsPublicKey) && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'oklch(0.55 0.18 145 / 0.15)', color: 'oklch(0.45 0.18 145)', fontFamily: "'Nunito', sans-serif" }}>
                  Active
                </span>
              )}
            </h2>
            <ChevronRight
              size={16}
              style={{
                color: 'oklch(0.52 0.04 260)',
                transform: showEmailjs ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {showEmailjs && (
            <div className="mt-4 flex flex-col gap-3 animate-fade-in-up">
              <p className="text-xs" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
                Connect EmailJS to send real emails. Free account at{' '}
                <a
                  href="https://www.emailjs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  style={{ color: 'oklch(0.68 0.18 75)' }}
                >
                  emailjs.com
                </a>
              </p>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                  Service ID
                </label>
                <input type="text" value={emailjsServiceId} onChange={(e) => setEmailjsServiceId(e.target.value)}
                  placeholder="service_xxxxxxx"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ ...inputStyle, fontSize: '14px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                  Template ID
                </label>
                <input type="text" value={emailjsTemplateId} onChange={(e) => setEmailjsTemplateId(e.target.value)}
                  placeholder="template_xxxxxxx"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ ...inputStyle, fontSize: '14px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                  Public Key
                </label>
                <input type="text" value={emailjsPublicKey} onChange={(e) => setEmailjsPublicKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ ...inputStyle, fontSize: '14px' }} />
              </div>
              <p className="text-xs" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
                Template variables: <code style={{ background: 'oklch(0.90 0.005 100)', padding: '1px 4px', borderRadius: '4px' }}>to_name</code>, <code style={{ background: 'oklch(0.90 0.005 100)', padding: '1px 4px', borderRadius: '4px' }}>to_email</code>, <code style={{ background: 'oklch(0.90 0.005 100)', padding: '1px 4px', borderRadius: '4px' }}>message</code>
              </p>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="rr-gold-btn w-full flex items-center justify-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
        >
          {saved ? (
            <><CheckCircle2 size={18} /> Saved!</>
          ) : (
            <><Save size={18} /> Save Changes</>
          )}
        </button>

        {/* Plan Status */}
        <div
          className="rr-card p-5"
          style={{ border: isPro ? '2px solid oklch(0.80 0.18 80 / 0.4)' : '2px solid oklch(0.90 0.005 100)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={16} style={{ color: isPro ? 'oklch(0.80 0.18 80)' : 'oklch(0.52 0.04 260)' }} />
                <h2 className="text-base font-bold" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </h2>
              </div>
              <p className="text-xs" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
                {isPro
                  ? 'Unlimited requests, auto-reminders, full dashboard'
                  : '10 requests/month — upgrade for unlimited access'}
              </p>
            </div>
            {!isPro && (
              <button
                onClick={() => navigate('/upgrade')}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold"
                style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
              >
                Upgrade <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Message Template Preview */}
        <div className="rr-card p-5">
          <h2 className="text-base font-bold mb-3" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
            Review Request Template
          </h2>
          <div
            className="p-4 rounded-xl text-sm leading-relaxed"
            style={{ background: 'oklch(0.975 0.003 100)', color: 'oklch(0.40 0.06 260)', fontFamily: "'Nunito', sans-serif", border: '1.5px solid oklch(0.90 0.005 100)' }}
          >
            Hi [Customer Name]! Thank you for choosing{' '}
            <strong style={{ color: 'oklch(0.22 0.09 260)' }}>{businessName || '[Business Name]'}</strong>. We'd love to hear about your experience! Could you take 30 seconds to leave us a quick review? It means the world to us. 👉{' '}
            <span style={{ color: 'oklch(0.68 0.18 75)', textDecoration: 'underline' }}>
              {reviewLink || '[Google Review Link]'}
            </span>{' '}
            Thank you so much!
          </div>
          <p className="text-xs mt-2" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            [Customer Name] is replaced automatically when you send a request.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="rr-card p-5" style={{ border: '1.5px solid oklch(0.65 0.22 27 / 0.3)' }}>
          <h2
            className="text-base font-bold mb-3 flex items-center gap-2"
            style={{ color: 'oklch(0.55 0.22 27)', fontFamily: "'Syne', sans-serif" }}
          >
            <Trash2 size={16} />
            Reset App
          </h2>
          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl"
              style={{ background: 'oklch(0.65 0.22 27 / 0.1)', color: 'oklch(0.55 0.22 27)', fontFamily: "'Nunito', sans-serif" }}
            >
              Reset all data & start over
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: 'oklch(0.55 0.22 27)', fontFamily: "'Nunito', sans-serif" }}>
                This will delete all your data including business profile and request history. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'oklch(0.65 0.22 27)', color: 'white', fontFamily: "'Syne', sans-serif" }}
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowReset(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'oklch(0.90 0.005 100)', color: 'oklch(0.40 0.06 260)', fontFamily: "'Syne', sans-serif" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs pb-4" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
          ReviewRocket v1.0 · All data stored locally on your device
        </p>
      </div>
    </div>
  );
}
