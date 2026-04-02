// ReviewRocket — Send Review Request Screen
// Design: Navy header, white form card, gold send button with rocket animation
// Core action: enter customer info, choose email/SMS, one-tap send

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { ReviewRequest, generateId } from '@/lib/storage';
import { sendReviewEmail, sendReviewSMS, buildReviewMessage } from '@/lib/emailjs';
import { Send, Rocket, Mail, Phone, User, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';

const SUCCESS_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-send-success-8kZtg3dvEuiCrR8DrxxgKA.webp';

export default function SendRequestPage() {
  const { profile, atFreeLimit, addReviewRequest } = useApp();
  const [, navigate] = useLocation();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [method, setMethod] = useState<'email' | 'sms' | 'both'>('email');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.name = 'Customer name is required';
    if (method === 'email' || method === 'both') {
      if (!customerEmail.trim()) errs.email = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errs.email = 'Enter a valid email';
    }
    if (method === 'sms' || method === 'both') {
      if (!customerPhone.trim()) errs.phone = 'Phone number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSend() {
    if (!validate() || !profile) return;
    setSending(true);

    let emailSuccess = true;
    let smsSuccess = true;

    // Try to send email if configured
    if ((method === 'email' || method === 'both') && customerEmail) {
      if (profile.emailjsServiceId && profile.emailjsTemplateId && profile.emailjsPublicKey) {
        const result = await sendReviewEmail({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          businessName: profile.name,
          reviewLink: profile.googleReviewLink,
          serviceId: profile.emailjsServiceId,
          templateId: profile.emailjsTemplateId,
          publicKey: profile.emailjsPublicKey,
        });
        emailSuccess = result.success;
        if (!result.success) {
          toast.error(`Email failed: ${result.error}. Request recorded locally.`);
        }
      } else {
        // Demo mode: simulate sending
        await new Promise((r) => setTimeout(r, 800));
        toast.info('Demo mode: Email logged (configure EmailJS in Settings for real sending)');
      }
    }

    // Try to send SMS
    if ((method === 'sms' || method === 'both') && customerPhone) {
      const result = await sendReviewSMS({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        businessName: profile.name,
        reviewLink: profile.googleReviewLink,
      });
      smsSuccess = result.success;
    }

    const now = new Date();
    const reminderAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const req: ReviewRequest = {
      id: generateId(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      sentAt: now.toISOString(),
      method,
      status: 'sent',
      reminderScheduledAt: profile.tier === 'pro' ? reminderAt.toISOString() : undefined,
    };

    addReviewRequest(req);
    setSending(false);
    setSent(true);
  }

  function handleSendAnother() {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setMethod('email');
    setErrors({});
    setSent(false);
  }

  if (atFreeLimit) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
        <div className="px-5 pt-14 pb-8" style={{ background: 'oklch(0.22 0.09 260)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Send size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}>
              New Request
            </span>
          </div>
          <h1 className="text-3xl" style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}>
            Send a Review Request
          </h1>
        </div>
        <div className="px-5 pt-6">
          <div className="rr-card p-6 flex flex-col items-center text-center">
            <Crown size={48} style={{ color: 'oklch(0.80 0.18 80)' }} className="mb-4" />
            <h2 className="text-xl mb-2" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
              Monthly Limit Reached
            </h2>
            <p className="text-sm mb-6" style={{ color: 'oklch(0.52 0.04 260)', fontFamily: "'Nunito', sans-serif" }}>
              You've used all 10 free requests this month. Upgrade to Pro for unlimited requests, auto-reminders, and more.
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              className="rr-gold-btn w-full flex items-center justify-center gap-2"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
            >
              <Crown size={18} />
              Upgrade to Pro — $29/mo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-24"
        style={{ background: 'oklch(0.22 0.09 260)' }}
      >
        <div className="w-56 h-56 mb-4 animate-fade-in-up">
          <img src={SUCCESS_IMG} alt="Sent!" className="w-full h-full object-contain" />
        </div>
        <h2
          className="text-3xl text-center mb-3 animate-fade-in-up"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900, animationDelay: '0.1s' }}
        >
          Request Sent! 🚀
        </h2>
        <p
          className="text-center text-base mb-2 animate-fade-in-up"
          style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif", animationDelay: '0.2s' }}
        >
          Your review request was sent to <strong style={{ color: 'white' }}>{customerName}</strong>.
        </p>
        {profile?.tier === 'pro' ? (
          <p
            className="text-center text-sm mb-8 animate-fade-in-up"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Nunito', sans-serif", animationDelay: '0.3s' }}
          >
            A follow-up reminder will be sent automatically in 3 days if they haven't reviewed yet.
          </p>
        ) : (
          <p
            className="text-center text-sm mb-8 animate-fade-in-up"
            style={{ color: 'oklch(0.55 0.04 260)', fontFamily: "'Nunito', sans-serif", animationDelay: '0.3s' }}
          >
            Upgrade to Pro to enable automatic 3-day follow-up reminders.
          </p>
        )}
        <div className="flex gap-3 w-full animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={handleSendAnother}
            className="rr-gold-btn flex-1 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
          >
            <Send size={18} />
            Send Another
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-4 font-bold"
            style={{
              background: 'oklch(0.30 0.08 260)',
              color: 'white',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              minHeight: '56px',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const message = profile
    ? buildReviewMessage(customerName || '[Customer Name]', profile.name, profile.googleReviewLink)
    : '';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'oklch(0.22 0.09 260)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Send size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            New Request
          </span>
        </div>
        <h1
          className="text-3xl"
          style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Send a Review
          <br />
          Request
        </h1>
        <p
          className="text-sm mt-2"
          style={{ color: 'oklch(0.65 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
        >
          Fill in your customer's info and hit send. That's it!
        </p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">
        {/* Customer Name */}
        <div className="rr-card p-4">
          <label
            className="block text-xs font-bold mb-2 uppercase tracking-wide"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            <User size={12} className="inline mr-1" />
            Customer Name *
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            placeholder="e.g. Sarah Johnson"
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
            style={{
              background: 'oklch(0.975 0.003 100)',
              color: 'oklch(0.22 0.09 260)',
              border: errors.name ? '2px solid oklch(0.65 0.22 27)' : '2px solid oklch(0.90 0.005 100)',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
            }}
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.22 27)' }}>{errors.name}</p>}
        </div>

        {/* Send Method */}
        <div className="rr-card p-4">
          <label
            className="block text-xs font-bold mb-3 uppercase tracking-wide"
            style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
          >
            Send Via
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['email', 'sms', 'both'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className="flex flex-col items-center py-3 px-2 rounded-xl transition-all"
                style={{
                  background: method === m ? 'oklch(0.22 0.09 260)' : 'oklch(0.975 0.003 100)',
                  border: method === m ? '2px solid oklch(0.80 0.18 80)' : '2px solid oklch(0.90 0.005 100)',
                }}
              >
                <span className="text-lg mb-1">
                  {m === 'email' ? '📧' : m === 'sms' ? '📱' : '📧📱'}
                </span>
                <span
                  className="text-xs font-bold capitalize"
                  style={{
                    color: method === m ? 'white' : 'oklch(0.52 0.04 260)',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {m === 'both' ? 'Both' : m.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Email field */}
        {(method === 'email' || method === 'both') && (
          <div className="rr-card p-4 animate-fade-in-up">
            <label
              className="block text-xs font-bold mb-2 uppercase tracking-wide"
              style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
            >
              <Mail size={12} className="inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => { setCustomerEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder="customer@email.com"
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
              style={{
                background: 'oklch(0.975 0.003 100)',
                color: 'oklch(0.22 0.09 260)',
                border: errors.email ? '2px solid oklch(0.65 0.22 27)' : '2px solid oklch(0.90 0.005 100)',
                fontFamily: "'Nunito', sans-serif",
                fontSize: '16px',
              }}
            />
            {errors.email && <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.22 27)' }}>{errors.email}</p>}
          </div>
        )}

        {/* Phone field */}
        {(method === 'sms' || method === 'both') && (
          <div className="rr-card p-4 animate-fade-in-up">
            <label
              className="block text-xs font-bold mb-2 uppercase tracking-wide"
              style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
            >
              <Phone size={12} className="inline mr-1" />
              Phone Number *
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => { setCustomerPhone(e.target.value); setErrors((p) => ({ ...p, phone: '' })); }}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
              style={{
                background: 'oklch(0.975 0.003 100)',
                color: 'oklch(0.22 0.09 260)',
                border: errors.phone ? '2px solid oklch(0.65 0.22 27)' : '2px solid oklch(0.90 0.005 100)',
                fontFamily: "'Nunito', sans-serif",
                fontSize: '16px',
              }}
            />
            {errors.phone && <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.22 27)' }}>{errors.phone}</p>}
          </div>
        )}

        {/* Message preview */}
        {customerName && (
          <div
            className="rr-card p-4 animate-fade-in-up"
            style={{ border: '1.5px solid oklch(0.80 0.18 80 / 0.3)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} fill="oklch(0.80 0.18 80)" style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: 'oklch(0.80 0.18 80)', fontFamily: "'Syne', sans-serif" }}
              >
                Message Preview
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'oklch(0.40 0.06 260)', fontFamily: "'Nunito', sans-serif" }}
            >
              {message}
            </p>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="rr-gold-btn w-full flex items-center justify-center gap-3 text-lg mt-2"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, opacity: sending ? 0.85 : 1 }}
        >
          {sending ? (
            <>
              <Rocket size={22} className="animate-bounce" />
              Launching...
            </>
          ) : (
            <>
              <Rocket size={22} />
              Send Request
            </>
          )}
        </button>

        {/* Pro reminder nudge */}
        {profile?.tier === 'free' && (
          <p
            className="text-center text-xs pb-2"
            style={{ color: 'oklch(0.55 0.04 260)', fontFamily: "'Nunito', sans-serif" }}
          >
            Want auto follow-up reminders?{' '}
            <button
              onClick={() => navigate('/upgrade')}
              className="font-bold underline"
              style={{ color: 'oklch(0.68 0.18 75)' }}
            >
              Upgrade to Pro
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
