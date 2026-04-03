// ReviewRocket — Settings Screen
// Design: Navy header, white cards per section
// Sections: Business Profile, Google Review Link, EmailJS Setup Wizard, Plan, Reset

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { BusinessProfile } from '@/lib/storage';
import { sendTestEmail, isEmailjsConfigured } from '@/lib/emailjs';
import {
  Settings,
  Building2,
  Link2,
  Crown,
  ChevronRight,
  Save,
  CheckCircle2,
  Trash2,
  Mail,
  Send,
  ExternalLink,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Step-by-step EmailJS setup guide ─────────────────────────────────────────
const SETUP_STEPS = [
  {
    num: 1,
    title: 'Create a free EmailJS account',
    body: 'Go to emailjs.com and sign up for free. You get 200 emails/month at no cost.',
    link: 'https://www.emailjs.com',
    linkLabel: 'Open EmailJS →',
  },
  {
    num: 2,
    title: 'Add an Email Service',
    body: 'In your EmailJS dashboard, go to Email Services → Add New Service. Connect Gmail, Outlook, or any SMTP provider.',
    link: 'https://dashboard.emailjs.com/admin',
    linkLabel: 'Open Dashboard →',
  },
  {
    num: 3,
    title: 'Create an Email Template',
    body: 'Go to Email Templates → Create New Template. Use these variables in your template:',
    vars: ['{{to_name}}', '{{to_email}}', '{{business_name}}', '{{review_link}}', '{{message}}'],
    note: 'Set the "To Email" field to {{to_email}} so emails go to your customers.',
  },
  {
    num: 4,
    title: 'Copy your credentials',
    body: 'Service ID: from Email Services page. Template ID: from Email Templates page. Public Key: from Account → General.',
  },
];

export default function SettingsPage() {
  const { profile, updateProfile } = useApp();
  const [, navigate] = useLocation();

  // Profile fields
  const [businessName, setBusinessName] = useState(profile?.name || '');
  const [reviewLink, setReviewLink] = useState(profile?.googleReviewLink || '');
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || '');

  // EmailJS fields
  const [serviceId, setServiceId] = useState(profile?.emailjsServiceId || '');
  const [templateId, setTemplateId] = useState(profile?.emailjsTemplateId || '');
  const [publicKey, setPublicKey] = useState(profile?.emailjsPublicKey || '');
  const [showKey, setShowKey] = useState(false);

  // Test send
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // UI state
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const configured = isEmailjsConfigured({ emailjsServiceId: serviceId, emailjsTemplateId: templateId, emailjsPublicKey: publicKey });

  useEffect(() => {
    setBusinessName(profile?.name || '');
    setReviewLink(profile?.googleReviewLink || '');
    setLogoUrl(profile?.logoUrl || '');
    setServiceId(profile?.emailjsServiceId || '');
    setTemplateId(profile?.emailjsTemplateId || '');
    setPublicKey(profile?.emailjsPublicKey || '');
  }, [profile]);

  function handleSave() {
    if (!businessName.trim() || !reviewLink.trim()) {
      toast.error('Business name and Google review link are required.');
      return;
    }
    const updated: BusinessProfile = {
      ...profile!,
      name: businessName.trim(),
      googleReviewLink: reviewLink.trim(),
      logoUrl: logoUrl.trim() || undefined,
      emailjsServiceId: serviceId.trim() || undefined,
      emailjsTemplateId: templateId.trim() || undefined,
      emailjsPublicKey: publicKey.trim() || undefined,
    };
    updateProfile(updated);
    setSaved(true);
    toast.success('Settings saved!');
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTestSend() {
    if (!testEmail.trim()) {
      toast.error('Enter your email address to receive the test.');
      return;
    }
    setTestSending(true);
    setTestResult(null);

    const result = await sendTestEmail({
      ownerEmail: testEmail.trim(),
      businessName: businessName.trim() || profile?.name || 'Your Business',
      credentials: {
        serviceId: serviceId.trim(),
        templateId: templateId.trim(),
        publicKey: publicKey.trim(),
      },
    });

    setTestSending(false);
    if (result.success) {
      setTestResult({ ok: true, msg: `Test email sent to ${testEmail}! Check your inbox.` });
      toast.success('Test email delivered! Check your inbox.');
    } else {
      setTestResult({ ok: false, msg: result.error || 'Failed to send test email.' });
      toast.error(result.error || 'Failed to send test email.');
    }
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

  const smallInputStyle = { ...inputStyle, fontSize: '14px' };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'oklch(0.22 0.09 260)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Settings size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}>
            Settings
          </span>
        </div>
        <h1 className="text-3xl" style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}>
          Your Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
          Update your business info and email integration.
        </p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {/* ── Business Profile ── */}
        <div className="rr-card p-5">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
            <Building2 size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
            Business Profile
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Business Name *
              </label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Maria's Hair Salon"
                className="w-full px-4 py-3.5 rounded-xl outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Logo URL (optional)
              </label>
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://yourbusiness.com/logo.png"
                className="w-full px-4 py-3.5 rounded-xl outline-none" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* ── Google Review Link ── */}
        <div className="rr-card p-5">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
            <Link2 size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
            Google Review Link
          </h2>
          <p className="text-xs mb-4" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            This link is included in every review request email you send.
          </p>
          <input type="url" value={reviewLink} onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/your-business/review"
            className="w-full px-4 py-3.5 rounded-xl outline-none" style={inputStyle} />
          <p className="text-xs mt-2" style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            Find this in Google Business Profile → "Get more reviews"
          </p>
        </div>

        {/* ── EmailJS Integration ── */}
        <div className="rr-card p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
              <Mail size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              Email Integration
            </h2>
            {configured ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'oklch(0.55 0.18 145 / 0.12)', color: 'oklch(0.40 0.18 145)', fontFamily: "'Syne', sans-serif" }}>
                <CheckCircle2 size={11} /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'oklch(0.65 0.22 50 / 0.12)', color: 'oklch(0.55 0.22 50)', fontFamily: "'Syne', sans-serif" }}>
                <AlertCircle size={11} /> Not set up
              </span>
            )}
          </div>

          <p className="text-xs mb-4" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
            Connect your free EmailJS account to send real review request emails directly from the app.
          </p>

          {/* Credential fields */}
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Service ID
              </label>
              <input type="text" value={serviceId} onChange={(e) => setServiceId(e.target.value)}
                placeholder="service_xxxxxxx"
                className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={smallInputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Template ID
              </label>
              <input type="text" value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                placeholder="template_xxxxxxx"
                className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={smallInputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Syne', sans-serif" }}>
                Public Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 pr-11 rounded-xl outline-none font-mono"
                  style={smallInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'oklch(0.52 0.04 260)' }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Test send section */}
          <div className="rounded-xl p-4 mb-4" style={{ background: 'oklch(0.96 0.005 260)', border: '1.5px solid oklch(0.88 0.01 260)' }}>
            <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'oklch(0.40 0.06 260)', fontFamily: "'Syne', sans-serif" }}>
              Send a Test Email
            </p>
            <p className="text-xs mb-3" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
              Verify your setup by sending a test email to yourself before sending to customers.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl outline-none mb-3"
              style={{ ...smallInputStyle, background: 'white' }}
            />
            {testResult && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl mb-3 text-xs"
                style={{
                  background: testResult.ok ? 'oklch(0.55 0.18 145 / 0.10)' : 'oklch(0.65 0.22 27 / 0.10)',
                  color: testResult.ok ? 'oklch(0.40 0.18 145)' : 'oklch(0.50 0.22 27)',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {testResult.ok ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />}
                <span>{testResult.msg}</span>
              </div>
            )}
            <button
              onClick={handleTestSend}
              disabled={testSending || !configured}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity"
              style={{
                background: configured ? 'oklch(0.22 0.09 260)' : 'oklch(0.85 0.005 260)',
                color: configured ? 'white' : 'oklch(0.60 0.04 260)',
                fontFamily: "'Syne', sans-serif",
                opacity: testSending ? 0.75 : 1,
                cursor: configured ? 'pointer' : 'not-allowed',
              }}
            >
              {testSending ? (
                <><Loader2 size={15} className="animate-spin" /> Sending test...</>
              ) : (
                <><Send size={15} /> Send Test Email</>
              )}
            </button>
            {!configured && (
              <p className="text-center text-xs mt-2" style={{ color: 'oklch(0.60 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
                Fill in all three credentials above first, then save.
              </p>
            )}
          </div>

          {/* Setup guide toggle */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'oklch(0.68 0.18 75)', fontFamily: "'Syne', sans-serif" }}>
              <ExternalLink size={14} />
              How to set up EmailJS (step-by-step)
            </span>
            <ChevronRight size={14} style={{ color: 'oklch(0.68 0.18 75)', transform: showGuide ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showGuide && (
            <div className="mt-3 flex flex-col gap-4 animate-fade-in-up">
              {SETUP_STEPS.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5"
                    style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}
                  >
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
                      {step.title}
                    </p>
                    <p className="text-xs leading-relaxed mb-1" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
                      {step.body}
                    </p>
                    {step.vars && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {step.vars.map((v) => (
                          <code key={v} className="text-xs px-2 py-0.5 rounded-md font-mono"
                            style={{ background: 'oklch(0.22 0.09 260)', color: 'oklch(0.80 0.18 80)' }}>
                            {v}
                          </code>
                        ))}
                      </div>
                    )}
                    {step.note && (
                      <p className="text-xs italic" style={{ color: 'oklch(0.68 0.18 75)', fontFamily: "'Nunito', sans-serif" }}>
                        ⚠ {step.note}
                      </p>
                    )}
                    {step.link && (
                      <a href={step.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold underline"
                        style={{ color: 'oklch(0.68 0.18 75)', fontFamily: "'Nunito', sans-serif" }}>
                        {step.linkLabel}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Template copy-paste example */}
              <div className="rounded-xl p-3" style={{ background: 'oklch(0.22 0.09 260)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}>
                  Example Template Body
                </p>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'oklch(0.80 0.04 260)', fontFamily: 'monospace' }}>
{`Hi {{to_name}},

{{message}}

Best regards,
{{business_name}}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ── Save button ── */}
        <button
          onClick={handleSave}
          className="rr-gold-btn w-full flex items-center justify-center gap-2"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
        >
          {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> Save Changes</>}
        </button>

        {/* ── Plan Status ── */}
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
                {isPro ? 'Unlimited requests, auto-reminders, full dashboard' : '10 requests/month — upgrade for unlimited access'}
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

        {/* ── Message Preview ── */}
        <div className="rr-card p-5">
          <h2 className="text-base font-bold mb-3" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif" }}>
            Review Request Preview
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
        </div>

        {/* ── Danger Zone ── */}
        <div className="rr-card p-5" style={{ border: '1.5px solid oklch(0.65 0.22 27 / 0.3)' }}>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'oklch(0.55 0.22 27)', fontFamily: "'Syne', sans-serif" }}>
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
                This will delete all data including your profile and request history. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'oklch(0.65 0.22 27)', color: 'white', fontFamily: "'Syne', sans-serif" }}>
                  Yes, Reset
                </button>
                <button onClick={() => setShowReset(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'oklch(0.90 0.005 100)', color: 'oklch(0.40 0.06 260)', fontFamily: "'Syne', sans-serif" }}>
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
