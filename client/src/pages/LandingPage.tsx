// Get Phame — Landing Page (Conversion-Optimised v2)
// Navy/gold design system · Desktop-first responsive · Video thumbnail + working link

import { getLoginUrl } from "@/const";
import {
  Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe,
  ChevronDown, X, Check, Zap, Shield, Play, TrendingUp, Clock,
  Lock, RefreshCw, Smartphone
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const APP_PREVIEW_IMG = "/phame-app-screenshot.png";
const VIDEO_THUMBNAIL = "/phame-video-thumbnail.jpg";
// Replace with your actual YouTube / Loom / Vimeo URL when ready
const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const OG_IMG = "https://assets.getphame.app/getphame-og-1200x630.png";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 rr-text-gold"
      style={{ background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.25)" }}>
      {children}
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const ALL_FAQS = [
  {
    q: "Will it look like spam?",
    a: "No. Every email is sent directly from your own email account via SMTP — not from a shared bulk-sending server. Your customer sees your name, your email address, and a message written in your voice. It lands in the inbox like a personal note, not a marketing blast.",
  },
  {
    q: "What email providers work?",
    a: "Any provider that supports SMTP: Gmail, Outlook, Yahoo Mail, Apple iCloud Mail, cPanel/Zoho business email, and virtually any hosting provider's mail server. If you can set up an email app on your phone, you can connect it to Phame.",
  },
  {
    q: "Is it really free?",
    a: "Yes — free with no artificial sending limits. You connect your own email account, so the only limit is your email provider's daily sending cap (Gmail allows ~500/day, most others are similar). There are no hidden fees and no credit card required.",
  },
  {
    q: "Can I import my customer list?",
    a: "Yes. Upload a CSV file with your customers' names and email addresses, or sync directly from WooCommerce if you run an online store. Once imported, bulk-select contacts and send personalised review requests in a single click.",
  },
  {
    q: "Does Phame store my email password?",
    a: "Your SMTP password is encrypted at rest using AES-256-GCM before it's stored. It's never logged, never sent to third parties, and only decrypted in memory at the moment an email is sent.",
  },
  {
    q: "Will my emails land in spam?",
    a: "Because emails are sent from your own email account (not a shared bulk sender), they have your domain's reputation behind them. This dramatically reduces spam filtering compared to generic bulk-send tools.",
  },
  {
    q: "What happens to my customer list?",
    a: "Your customer data is private to your account. It is never shared, sold, or used for any purpose other than sending the review requests you initiate. You can delete your data at any time.",
  },
  {
    q: "Can customers opt out?",
    a: "Yes — every email includes a one-click unsubscribe link. Customers who unsubscribe are automatically removed from future sends.",
  },
  {
    q: "Do I need technical skills to connect my email?",
    a: "No. The setup wizard walks you through connecting Gmail, Outlook, or any other provider step by step. Most users are set up in under 2 minutes.",
  },
  {
    q: "Which review platforms does it support?",
    a: "Any platform with a public review link: Google, Yelp, TripAdvisor, Trustpilot, Facebook, Bing, Houzz, Angi, and more. You paste your review link once and Phame handles the rest.",
  },
  {
    q: "How does WooCommerce sync work?",
    a: "Connect your WooCommerce store with your API key and Phame automatically imports your recent customers. You can filter by order date, product, or status — then send review requests in bulk.",
  },
  {
    q: "What does unlimited mean on the Pro plan?",
    a: "Unlimited review requests means no cap on how many emails you can send through Phame. The only practical limit is your email provider's daily sending quota (typically 500–2,000/day for standard accounts).",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ALL_FAQS : ALL_FAQS.slice(0, 6);

  return (
    <section id="faq" className="px-5 py-14" style={{ background: "oklch(0.975 0.003 100)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <SectionLabel><span>FAQ</span></SectionLabel>
          <h2 className="text-2xl font-black rr-text-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Frequently asked questions
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {visible.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.92 0.02 260)" }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="text-sm font-bold rr-text-navy">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className="shrink-0 rr-text-gold transition-transform duration-200"
                  style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "oklch(0.40 0.04 260)" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
        {!showAll && (
          <div className="text-center mt-5">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm font-bold rr-text-gold underline underline-offset-2"
            >
              Show all {ALL_FAQS.length} questions
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Video Section ────────────────────────────────────────────────────────────
function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="px-5 py-14 rr-bg-navy">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <SectionLabel><Play size={11} fill="currentColor" /><span>Product Walkthrough</span></SectionLabel>
          <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            See How It Works
          </h2>
          <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
            Watch a quick walkthrough — set up in under 2 minutes.
          </p>
        </div>

        {/* Video player / thumbnail */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer group"
          style={{ aspectRatio: "16/9", border: "2px solid rgba(255,255,255,0.08)" }}
          onClick={() => {
            setPlaying(true);
            window.open(VIDEO_URL, "_blank", "noopener,noreferrer");
          }}
        >
          {/* Thumbnail */}
          <img
            src={VIDEO_THUMBNAIL}
            alt="Get Phame product walkthrough"
            className="w-full h-full object-cover"
          />
          {/* Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{ background: "rgba(10,22,40,0.45)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110 rr-bg-gold"
              style={{ boxShadow: "0 0 0 8px rgba(240,165,0,0.25), 0 4px 20px rgba(240,165,0,0.50)" }}
            >
              <Play size={24} fill="#0A1628" color="#0A1628" style={{ marginLeft: 3 }} />
            </div>
          </div>
          {/* Duration badge */}
          <div
            className="absolute bottom-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-white"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            2:14
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-on-dark-muted)" }}>
          Free to start — no credit card required
        </p>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useTranslation();
  const loginUrl = getLoginUrl();

  const FEATURES = [
    {
      icon: <Mail size={20} className="rr-text-gold" />,
      title: "Sent from your email",
      desc: "Customers see your name and email — not a generic sender. It feels personal because it is.",
    },
    {
      icon: <Users size={20} className="rr-text-gold" />,
      title: "Bulk send in one click",
      desc: "Import via CSV or WooCommerce sync. Select all, hit send — each customer gets their own personalised email.",
    },
    {
      icon: <Globe size={20} className="rr-text-gold" />,
      title: "Any review platform",
      desc: "Google, Yelp, TripAdvisor, Bing, Facebook and more. You choose where to send customers.",
    },
    {
      icon: <Zap size={20} className="rr-text-gold" />,
      title: "Automated follow-ups",
      desc: "Set it and forget it. Phame sends reminders automatically so you never have to chase a customer.",
    },
    {
      icon: <Shield size={20} className="rr-text-gold" />,
      title: "Compliance built in",
      desc: "Platform-specific rules enforced automatically. Stay safe on Google, Yelp, TripAdvisor, and more.",
    },
    {
      icon: <Lock size={20} className="rr-text-gold" />,
      title: "Password encrypted at rest",
      desc: "Your SMTP credentials are encrypted with AES-256-GCM. Never logged, never shared.",
    },
  ];

  const HOW_IT_WORKS = [
    { step: "1", label: "Connect your email account (SMTP)", detail: "Works with Gmail, Outlook, Yahoo, iCloud, and any SMTP provider." },
    { step: "2", label: "Add your review link", detail: "Paste your Google, Yelp, or any other review platform link." },
    { step: "3", label: "Import or add your customers", detail: "Upload a CSV or sync directly from WooCommerce." },
    { step: "4", label: "Send personalised review requests", detail: "Each customer gets a unique email that looks like you wrote it." },
  ];

  const PROOF_STATS = [
    { value: "10×", label: "more reviews vs. asking in person" },
    { value: "< 2 min", label: "average setup time" },
    { value: "500+", label: "businesses using Phame" },
    { value: "$0", label: "to get started" },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode && refCode.length >= 4) {
      localStorage.setItem("phame_ref", refCode.toUpperCase());
    }
  }, []);

  useEffect(() => {
    document.title = "Get Phame — Earn It, Automatically.";
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("og:image", OG_IMG);
    setMeta("og:title", "Get Phame — Earn It, Automatically.");
    setMeta("og:description", "Turn happy customers into 5-star reviews. Send review requests in seconds. Free to start.");
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:image", OG_IMG);
    return () => { document.title = "Get Phame"; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.975 0.003 100)" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 rr-bg-navy" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 h-16">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center rr-bg-gold shrink-0"
              style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.35)" }}>
              <Star size={16} fill="#1a2744" color="#1a2744" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-black text-base tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", lineHeight: 1.1 }}>
                Get Phame
              </span>
              <span className="rr-text-gold font-bold" style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2 }}>
                Earn It, Automatically.
              </span>
            </div>
          </a>

          <div className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-xs font-semibold transition-colors hover:text-white" style={{ color: "var(--text-on-dark-secondary)" }}>How It Works</a>
            <a href="#pricing" className="text-xs font-semibold transition-colors hover:text-white" style={{ color: "var(--text-on-dark-secondary)" }}>Pricing</a>
            <a href="#faq" className="text-xs font-semibold transition-colors hover:text-white" style={{ color: "var(--text-on-dark-secondary)" }}>FAQ</a>
          </div>

          <a href={loginUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy shrink-0"
            style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.30)" }}>
            Sign In
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative px-5 pt-14 pb-0 overflow-hidden rr-bg-navy">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(240,165,0,0.08) 0%, transparent 70%)" }} />

        {/* Desktop: side-by-side layout */}
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5 rr-text-gold"
                style={{ background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.25)" }}>
                <Star size={11} fill="currentColor" />
                {t("hero.tagline")}
              </div>

              <h1 className="text-4xl lg:text-5xl leading-tight mb-4 text-white font-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {t("hero.headline")}
              </h1>

              <p className="text-sm lg:text-base leading-relaxed mb-8 lg:max-w-md"
                style={{ color: "var(--text-on-dark-secondary)" }}>
                {t("hero.description")}
              </p>

              {/* CTA row */}
              <div className="flex flex-col sm:flex-row items-center gap-3 lg:justify-start justify-center">
                <a href={loginUrl}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-gold rr-text-navy"
                  style={{ boxShadow: "0 4px 20px rgba(240,165,0,0.40)" }}>
                  <Star size={18} fill="currentColor" />
                  Get Started Free
                  <ArrowRight size={16} />
                </a>
                <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--text-on-dark-secondary)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center rr-bg-gold rr-text-navy shrink-0"
                    style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.30)" }}>
                    <Play size={12} fill="currentColor" style={{ marginLeft: 2 }} />
                  </div>
                  Watch 2-min demo
                </a>
              </div>

              <p className="text-xs mt-4 lg:text-left text-center" style={{ color: "var(--text-on-dark-muted)" }}>
                {t("hero.setupTime")}
              </p>

              {/* Inline trust signals */}
              <div className="flex flex-wrap items-center gap-4 mt-6 lg:justify-start justify-center">
                {["Free to start", "No credit card", "Cancel anytime"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} style={{ color: "oklch(0.55 0.18 150)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-on-dark-muted)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — app screenshot */}
            <div className="relative shrink-0" style={{ maxWidth: 280, width: "100%" }}>
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse 90% 60% at 50% 80%, rgba(240,165,0,0.30) 0%, transparent 70%)" }} />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl"
                style={{ border: "3px solid rgba(255,255,255,0.10)" }}>
                <img src={APP_PREVIEW_IMG} alt="Get Phame dashboard" className="w-full block" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap rr-bg-gold rr-text-navy"
                style={{ boxShadow: "0 2px 12px rgba(240,165,0,0.45)" }}>
                {t("hero.dashboardStats")}
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="mt-14" style={{ lineHeight: 0 }}>
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
            style={{ width: "100%", height: 50, display: "block" }}>
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="oklch(0.975 0.003 100)" />
          </svg>
        </div>
      </section>

      {/* ── PROOF STATS ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-10" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PROOF_STATS.map((stat) => (
            <div key={stat.label} className="text-center bg-white rounded-2xl py-5 px-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid oklch(0.93 0.02 260)" }}>
              <div className="text-2xl font-black mb-1 rr-text-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {stat.value}
              </div>
              <div className="text-xs leading-snug" style={{ color: "oklch(0.50 0.03 260)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionLabel><Zap size={11} /><span>Features</span></SectionLabel>
            <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("features.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
              Everything you need to turn happy customers into public reviews.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl p-5"
                style={{ background: "oklch(0.975 0.003 100)", border: "1px solid oklch(0.92 0.02 260)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 rr-bg-navy">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-bold mb-1 rr-text-navy">{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.03 260)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO ───────────────────────────────────────────────────────────── */}
      <VideoSection />

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-5 py-14" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionLabel><Clock size={11} /><span>Setup</span></SectionLabel>
            <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("howItWorks.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
              Up and running in under 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl p-5"
                style={{ border: "1px solid oklch(0.92 0.02 260)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black rr-bg-gold rr-text-navy mb-4"
                  style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.30)" }}>
                  {item.step}
                </div>
                <p className="text-sm font-bold rr-text-navy mb-1">{item.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.03 260)" }}>{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href={loginUrl}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-navy rr-text-gold"
              style={{ boxShadow: "0 4px 20px rgba(10,22,40,0.20)" }}>
              <Star size={18} fill="currentColor" />
              Get Started Free
            </a>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-5 py-14 rr-bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <SectionLabel><TrendingUp size={11} /><span>Pricing</span></SectionLabel>
            <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("pricing.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
              {t("pricing.sectionSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Free */}
            <div className="rounded-2xl p-5 flex flex-col" style={{ background: "oklch(0.28 0.08 260)", border: "1px solid oklch(0.35 0.08 260)" }}>
              <div className="text-xs font-black text-white mb-1">Free</div>
              <div className="text-3xl font-black rr-text-gold mb-1">$0</div>
              <p className="text-xs mb-4" style={{ color: "var(--text-on-dark-secondary)" }}>10 review requests to get started — no credit card required.</p>
              <ul className="flex flex-col gap-2 mt-auto">
                {["10 review requests", "1 review platform", "CSV import", "Email support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                    <Check size={13} style={{ color: "oklch(0.55 0.18 150)" }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href={loginUrl} className="mt-5 text-center py-2.5 rounded-xl text-xs font-black transition-colors"
                style={{ background: "oklch(0.35 0.08 260)", color: "white" }}>
                Start Free
              </a>
            </div>

            {/* Pro Monthly — highlighted */}
            <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden" style={{ background: "oklch(0.97 0.06 80)", border: "2px solid var(--gold)" }}>
              <div className="absolute top-0 right-0 px-3 py-1 text-xs font-black rr-bg-gold rr-text-navy" style={{ borderBottomLeftRadius: 12 }}>
                Most Popular
              </div>
              <div className="text-xs font-black rr-text-navy mb-1">Pro Monthly</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-black rr-text-navy">$29</span>
                <span className="text-sm rr-text-navy mb-1">/mo</span>
              </div>
              <p className="text-xs mb-4" style={{ color: "oklch(0.35 0.04 260)" }}>Unlimited review requests, bulk send, follow-up reminders, WooCommerce sync.</p>
              <ul className="flex flex-col gap-2 mt-auto">
                {["Unlimited requests", "All review platforms", "Bulk send", "Follow-up reminders", "WooCommerce sync", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs rr-text-navy">
                    <Check size={13} style={{ color: "oklch(0.40 0.18 150)" }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href={loginUrl} className="mt-5 text-center py-2.5 rounded-xl text-xs font-black rr-bg-navy rr-text-gold transition-transform active:scale-95">
                Start Pro
              </a>
            </div>

            {/* Pro Annual */}
            <div className="rounded-2xl p-5 flex flex-col" style={{ background: "oklch(0.28 0.08 260)", border: "1px solid oklch(0.35 0.08 260)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-white">Pro Annual</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.30 0.15 150)", color: "oklch(0.80 0.18 150)" }}>Save 15%</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-black rr-text-gold">$297</span>
                <span className="text-sm mb-1" style={{ color: "var(--text-on-dark-secondary)" }}>/yr</span>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-on-dark-secondary)" }}>Everything in Pro Monthly — billed once a year. Equivalent to $24.75/month.</p>
              <ul className="flex flex-col gap-2 mt-auto">
                {["Everything in Pro", "2 months free", "Annual invoice"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                    <Check size={13} style={{ color: "oklch(0.55 0.18 150)" }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href={loginUrl} className="mt-5 text-center py-2.5 rounded-xl text-xs font-black transition-colors"
                style={{ background: "oklch(0.35 0.08 260)", color: "white" }}>
                Start Annual
              </a>
            </div>

            {/* Lifetime */}
            <div className="rounded-2xl p-5 flex flex-col" style={{ background: "oklch(0.22 0.09 260)", border: "1px solid oklch(0.35 0.08 260)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-white">Lifetime</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy">Own it forever</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-black rr-text-gold">$1,247</span>
                <span className="text-xs mb-1" style={{ color: "var(--text-on-dark-secondary)" }}> once</span>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-on-dark-secondary)" }}>One payment, lifetime access. No renewals, no surprises.</p>
              <ul className="flex flex-col gap-2 mt-auto">
                {["Everything in Pro", "No renewals ever", "All future updates", "Lifetime support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                    <Check size={13} style={{ color: "oklch(0.55 0.18 150)" }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href={loginUrl} className="mt-5 text-center py-2.5 rounded-xl text-xs font-black rr-bg-gold rr-text-navy transition-transform active:scale-95">
                Get Lifetime Access
              </a>
            </div>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-on-dark-muted)" }}>
            All plans include a 14-day money-back guarantee. No questions asked.
          </p>
        </div>
      </section>

      {/* ── COMPETITOR COMPARISON ───────────────────────────────────────────── */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <SectionLabel><TrendingUp size={11} /><span>Comparison</span></SectionLabel>
            <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("comparison.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
              {t("comparison.sectionSubtitle")}
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
            <div className="grid grid-cols-3 px-4 py-3 text-xs font-black rr-bg-navy rr-text-gold">
              <span>Platform</span>
              <span className="text-center">Starting price</span>
              <span className="text-center">Lifetime option</span>
            </div>
            {/* Phame row */}
            <div className="grid grid-cols-3 px-4 py-3 items-center border-b-2" style={{ background: "oklch(0.97 0.06 80)", borderColor: "var(--gold)" }}>
              <div className="flex items-center gap-1.5">
                <Star size={13} className="rr-text-gold" fill="currentColor" />
                <span className="text-xs font-black rr-text-navy">Phame</span>
              </div>
              <div className="text-center"><span className="text-xs font-black rr-text-navy">$29<span className="font-normal">/mo</span></span></div>
              <div className="flex justify-center"><Check size={16} style={{ color: "oklch(0.40 0.18 150)" }} /></div>
            </div>
            {[
              { name: "Birdeye", price: "$299/mo", lifetime: false },
              { name: "Podium", price: "$249/mo", lifetime: false },
              { name: "NiceJob", price: "$75/mo", lifetime: false },
              { name: "Grade.us", price: "$110/mo", lifetime: false },
              { name: "ReviewTrackers", price: "$89/mo", lifetime: false },
            ].map((c, i, arr) => (
              <div key={c.name} className="grid grid-cols-3 px-4 py-3 items-center"
                style={{ background: i % 2 === 0 ? "white" : "oklch(0.975 0.003 100)", borderBottom: i < arr.length - 1 ? "1px solid oklch(0.93 0.02 260)" : "none" }}>
                <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 260)" }}>{c.name}</span>
                <span className="text-xs text-center" style={{ color: "oklch(0.45 0.04 260)" }}>{c.price}</span>
                <div className="flex justify-center"><X size={14} style={{ color: "oklch(0.65 0.15 25)" }} /></div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-4" style={{ color: "oklch(0.60 0.03 260)" }}>
            {t("comparison.priceDisclaimer")}
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="px-5 py-14" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <SectionLabel><Star size={11} fill="currentColor" /><span>Reviews</span></SectionLabel>
            <h2 className="text-2xl font-black rr-text-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("testimonials.sectionTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "sarah", initial: "S" },
              { key: "tom", initial: "T" },
            ].map(({ key, initial }) => (
              <div key={key} className="rounded-2xl p-5 bg-white"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid oklch(0.92 0.02 260)" }}>
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="var(--gold)" className="rr-text-gold" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}>
                  "{t(`testimonials.${key}.quote`)}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 rr-bg-navy rr-text-gold">
                    {initial}
                  </div>
                  <div>
                    <p className="text-xs font-bold rr-text-navy">{t(`testimonials.${key}.name`)}</p>
                    <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>{t(`testimonials.${key}.role`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── BOTTOM CTA ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 text-center rr-bg-navy" style={{ position: "relative", overflow: "hidden" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(240,165,0,0.10) 0%, transparent 70%)" }} />
        <div className="relative max-w-xl mx-auto">
          <div className="flex justify-center gap-0.5 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="var(--gold)" className="rr-text-gold" />)}
          </div>
          <h2 className="text-2xl font-black mb-3 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t("bottomCta.title")}
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("bottomCta.subtitle")}
          </p>
          <a href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            style={{ boxShadow: "0 4px 20px rgba(240,165,0,0.40)", display: "flex" }}>
            <Send size={18} />
            {t("bottomCta.cta")}
          </a>
          <p className="text-xs mt-3" style={{ color: "var(--text-on-dark-muted)" }}>
            Free forever plan available. No credit card required.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: "oklch(0.14 0.06 260)" }}>
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center rr-bg-gold">
              <Star size={14} fill="#1a2744" color="#1a2744" />
            </div>
            <span className="text-white font-black text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>Get Phame</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="/privacy-policy" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.privacy")}</a>
            <a href="/terms-of-service" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.terms")}</a>
            <a href="mailto:support@getphame.app" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.support")}</a>
          </div>
          <p className="text-xs" style={{ color: "oklch(0.40 0.03 260)" }}>
            © {new Date().getFullYear()} Get Phame. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
