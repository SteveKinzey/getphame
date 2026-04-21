// Public marketing landing page — shown at / when the user is not logged in
// Navy/gold design system matching the authenticated app

import { getLoginUrl } from "@/const";
import { Rocket, Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe, ChevronDown, X, Check } from "lucide-react";
import { useState, useEffect } from "react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

const OG_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/og-preview-PB5uoBDhiPJXzuqM8A9kzf.png";

const APP_PREVIEW_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/reviewlink-app-preview_cbdf33af.png";

const FEATURES = [
  {
    icon: <Mail size={22} style={{ color: "oklch(0.80 0.18 80)" }} />,
    title: "Sent from your own email",
    desc: "Every request lands in your customer's inbox looking like a personal message — not a bulk blast. No shared sender, no spam filters.",
  },
  {
    icon: <Users size={22} style={{ color: "oklch(0.80 0.18 80)" }} />,
    title: "Bulk send in seconds",
    desc: "Import contacts from CSV, Stripe, or WooCommerce. Select all, hit send — each customer gets their own personalised email.",
  },
  {
    icon: <Globe size={22} style={{ color: "oklch(0.80 0.18 80)" }} />,
    title: "Works with any review platform",
    desc: "Google, Yelp, Trustpilot, TripAdvisor, Facebook — add any review link. Your customers are taken straight to your review page.",
  },
];

const FAQS = [
  {
    q: "Will it look like spam?",
    a: "No. Every email is sent directly from your own email account via SMTP — not from a shared bulk-sending server. Your customer sees your name, your email address, and a message written in your voice. It lands in the inbox like a personal note, not a marketing blast.",
  },
  {
    q: "What email providers work?",
    a: "Any provider that supports SMTP works: Gmail, Outlook, Yahoo Mail, Apple iCloud Mail, cPanel/Zoho business email, and virtually any hosting provider's mail server. If you can set up an email app on your phone, you can connect it to ReviewLink.",
  },
  {
    q: "Is it really free?",
    a: "Yes — free with no artificial sending limits. You connect your own email account, so the only limit is your email provider's daily sending cap (Gmail allows ~500/day, most others are similar). There are no hidden fees and no credit card required to get started.",
  },
  {
    q: "Can I import my customer list?",
    a: "Yes. You can upload a CSV file with your customers' names and email addresses, or sync directly from WooCommerce if you run an online store. Once imported, you can bulk-select contacts and send personalised review requests in a single click.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", label: "Connect your email account (SMTP)" },
  { step: "2", label: "Add your Google (or other) review link" },
  { step: "3", label: "Import or add your customers" },
  { step: "4", label: "Send personalised review requests" },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="px-5 py-10 max-w-lg mx-auto w-full">
      <h2
        className="text-xl font-black text-center mb-6"
        style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
      >
        Frequently asked questions
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span
                className="text-sm font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                {faq.q}
              </span>
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform duration-200"
                style={{
                  color: "oklch(0.80 0.18 80)",
                  transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {open === i && (
              <div
                className="px-5 pb-5 text-xs leading-relaxed"
                style={{ color: "oklch(0.40 0.04 260)" }}
              >
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const loginUrl = getLoginUrl();

  useEffect(() => {
    // SEO: keyword-rich title (30-60 chars)
    document.title = "ReviewLink — Get More 5-Star Google Reviews";

    // SEO: meta keywords
    let kw = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    if (!kw) {
      kw = document.createElement("meta");
      kw.name = "keywords";
      document.head.appendChild(kw);
    }
    kw.content =
      "review requests, Google reviews, get more reviews, review automation, small business reviews, send review request email, WooCommerce reviews, Stripe reviews";

    // OG: open graph image for social sharing previews
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("og:image", OG_IMG);
    setMeta("og:title", "ReviewLink — Get More 5-Star Google Reviews");
    setMeta("og:description", "Send personalised review request emails from your own email account. Works with Google, Yelp, TripAdvisor and more.");
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:image", OG_IMG);

    return () => {
      document.title = "ReviewLink";
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.975 0.003 100)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-5 py-4"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="flex items-center gap-2">
          <Rocket size={18} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-sm font-black tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            ReviewLink
          </span>
        </div>
        <a
          href={loginUrl}
          className="px-4 py-2 rounded-xl text-xs font-black transition-transform active:scale-95"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Sign In
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        className="relative px-5 pt-12 pb-16 overflow-hidden text-center"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        {/* Background rocket watermark */}
        <div
          className="absolute right-0 top-0 w-56 h-56 opacity-10 pointer-events-none"
          style={{ transform: "translate(15%, -15%)" }}
        >
          <img src={HERO_IMG} alt="ReviewLink rocket illustration" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 max-w-sm mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5"
            style={{ background: "oklch(0.30 0.08 260)", color: "oklch(0.80 0.18 80)" }}
          >
            <Star size={11} fill="currentColor" />
            Free to start — No credit card required
          </div>

          <h1
            className="text-3xl leading-tight mb-4"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
          >
            Get more 5-star reviews without the awkward ask
          </h1>

          <p className="text-sm mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
            ReviewLink sends personalised review request emails from your own email account.
            Customers receive a message that looks like it came directly from you — not a bulk mailer.
          </p>

          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Poppins', sans-serif",
              display: "flex",
            }}
          >
            <Rocket size={20} />
            Get Started Free
            <ArrowRight size={18} />
          </a>

          <p className="text-xs mt-3" style={{ color: "var(--text-on-dark-muted)" }}>
            Takes less than 2 minutes to set up
          </p>
        </div>

        {/* Product screenshot */}
        <div className="relative mt-10 mx-auto pb-6" style={{ maxWidth: 280 }}>
          <div
            className="absolute inset-0 rounded-3xl blur-2xl opacity-25 pointer-events-none"
            style={{ background: "oklch(0.80 0.18 80)", transform: "scale(0.90) translateY(12px)" }}
          />
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
            style={{ borderColor: "oklch(0.35 0.08 260)" }}
          >
            <img
              src={APP_PREVIEW_IMG}
              alt="ReviewLink dashboard showing sent requests and email performance stats"
              className="w-full block"
            />
          </div>
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            Your dashboard — live stats
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-lg mx-auto w-full">
        <h2
          className="text-xl font-black text-center mb-6"
          style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
        >
          Why businesses choose ReviewLink
        </h2>
        <div className="flex flex-col gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.22 0.09 260)" }}
              >
                {f.icon}
              </div>
              <div>
                <p
                  className="text-sm font-black mb-1"
                  style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                >
                  {f.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.03 260)" }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section
        className="px-5 py-10"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="max-w-lg mx-auto">
          <h2
            className="text-xl font-black text-center mb-6"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
          >
            Up and running in 4 steps
          </h2>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                  style={{
                    background: "oklch(0.80 0.18 80)",
                    color: "oklch(0.22 0.09 260)",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {item.step}
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-on-dark-primary)" }}>
                  {item.label}
                </p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="px-5 py-10" style={{ background: "oklch(0.97 0.005 260)" }}>
        <div className="max-w-lg mx-auto">
          <h2
            className="text-xl font-black text-center mb-2"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            Simple, honest pricing
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "oklch(0.50 0.04 260)" }}>
            Start free. Upgrade when you're ready.
          </p>
          <div className="flex flex-col gap-3">
            {/* Free */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "white", borderColor: "oklch(0.90 0.03 260)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>Free</span>
                <span className="text-lg font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>$0</span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>10 review requests to get started — no credit card required.</p>
            </div>
            {/* Pro Monthly */}
            <div
              className="rounded-2xl p-5 border-2"
              style={{ background: "white", borderColor: "oklch(0.80 0.18 80)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>Pro Monthly</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                  >Most Popular</span>
                </div>
                <span className="text-lg font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>$29<span className="text-xs font-normal">/mo</span></span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>Unlimited review requests, bulk send, follow-up reminders, WooCommerce sync.</p>
            </div>
            {/* Pro Annual */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "white", borderColor: "oklch(0.90 0.03 260)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>Pro Annual</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.95 0.05 150)", color: "oklch(0.30 0.15 150)", fontFamily: "'Poppins', sans-serif" }}
                  >Save 15%</span>
                </div>
                <span className="text-lg font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>$297<span className="text-xs font-normal">/yr</span></span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>Everything in Pro Monthly — billed once a year. Equivalent to $24.75/month.</p>
            </div>
            {/* Lifetime */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "oklch(0.22 0.09 260)", borderColor: "oklch(0.30 0.08 260)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}>Lifetime</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                  >Own it forever</span>
                </div>
                <span className="text-lg font-black" style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}>$1,247<span className="text-xs font-normal" style={{ color: "var(--text-on-dark-secondary)" }}> once</span></span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>One payment, lifetime access. No renewals, no surprises.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Competitor comparison ────────────────────────────────────────────── */}
      <section className="px-5 py-10" style={{ background: "white" }}>
        <div className="max-w-lg mx-auto">
          <h2
            className="text-xl font-black text-center mb-2"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            10–20× cheaper than the big players
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "oklch(0.50 0.04 260)" }}>
            Birdeye and Podium charge enterprise prices for features ReviewLink gives you at a fraction of the cost.
          </p>

          {/* Comparison table */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
            {/* Header */}
            <div
              className="grid grid-cols-3 px-4 py-3 text-xs font-black"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
            >
              <span>Platform</span>
              <span className="text-center">Starting price</span>
              <span className="text-center">Lifetime option</span>
            </div>
            {/* ReviewLink row — highlighted */}
            <div
              className="grid grid-cols-3 px-4 py-3 items-center border-b-2"
              style={{ background: "oklch(0.97 0.06 80)", borderColor: "oklch(0.80 0.18 80)" }}
            >
              <div className="flex items-center gap-1.5">
                <Rocket size={13} style={{ color: "oklch(0.80 0.18 80)" }} />
                <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>ReviewLink</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>$29<span className="font-normal">/mo</span></span>
              </div>
              <div className="flex justify-center">
                <Check size={16} style={{ color: "oklch(0.40 0.18 150)" }} />
              </div>
            </div>
            {/* Competitor rows */}
            {[
              { name: "Birdeye", price: "$299/mo", lifetime: false },
              { name: "Podium", price: "$249/mo", lifetime: false },
              { name: "NiceJob", price: "$75/mo", lifetime: false },
              { name: "Grade.us", price: "$110/mo", lifetime: false },
              { name: "ReviewTrackers", price: "$89/mo", lifetime: false },
            ].map((c, i, arr) => (
              <div
                key={c.name}
                className="grid grid-cols-3 px-4 py-3 items-center"
                style={{
                  background: i % 2 === 0 ? "white" : "oklch(0.975 0.003 100)",
                  borderBottom: i < arr.length - 1 ? "1px solid oklch(0.93 0.02 260)" : "none",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 260)" }}>{c.name}</span>
                <span className="text-xs text-center" style={{ color: "oklch(0.50 0.04 260)" }}>{c.price}</span>
                <div className="flex justify-center">
                  <X size={14} style={{ color: "oklch(0.65 0.15 25)" }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-center mt-4" style={{ color: "oklch(0.60 0.03 260)" }}>
            Prices based on publicly listed entry-tier plans as of April 2026.
          </p>
        </div>
      </section>

      {/* ── Social proof strip ──────────────────────────────────────────────── */}
      <section className="px-5 py-8 max-w-lg mx-auto w-full">
        <h2
          className="text-center text-base font-black mb-5"
          style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
        >
          What our users say
        </h2>
        <div className="flex flex-col gap-4">
          {/* Testimonial 1 — Sarah */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ background: "white", border: "1px solid oklch(0.92 0.02 260)" }}
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
              ))}
            </div>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}
            >
              "I used to dread asking clients for reviews — it felt awkward and salesy. ReviewLink sends the request from my own Gmail so it actually looks like I wrote it. I went from 12 Google reviews to 47 in six weeks."
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
              >
                S
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>Sarah M.</p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>Freelance Photographer</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 — Tom */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ background: "white", border: "1px solid oklch(0.92 0.02 260)" }}
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
              ))}
            </div>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}
            >
              "We serve about 80 customers a day. I import the week's regulars from a CSV on Friday, hit send, and by Monday morning we've usually picked up 8–10 new reviews. It's become part of our weekly routine."
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
              >
                T
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>Tom R.</p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>Owner, The Corner Café</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section
        className="px-5 py-12 text-center"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="max-w-sm mx-auto">
          <h2
            className="text-2xl font-black mb-3"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
          >
            Start collecting reviews today
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-on-dark-secondary)" }}>
            Free forever. No credit card. Set up in under 2 minutes.
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Poppins', sans-serif",
              display: "flex",
            }}
          >
            <Send size={18} />
            Get Started Free
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="px-5 py-4 flex items-center justify-between text-xs"
        style={{ background: "oklch(0.18 0.07 260)", color: "var(--text-on-dark-muted)" }}
      >
        <div className="flex items-center gap-1.5">
          <Rocket size={12} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>ReviewLink</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/privacy-policy" style={{ color: "var(--text-on-dark-muted)" }}>Privacy</a>
          <a href="/terms-of-service" style={{ color: "var(--text-on-dark-muted)" }}>Terms</a>
          <a href="mailto:support@reviewlink.app" style={{ color: "var(--text-on-dark-muted)" }}>Support</a>
        </div>
      </footer>
    </div>
  );
}
