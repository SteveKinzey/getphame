// Get Phame — Landing Page
// Navy/gold design system matching the authenticated app

import { getLoginUrl } from "@/const";
import { Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe, ChevronDown, X, Check, Shield, Lock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const HERO_IMG = "https://assets.getphame.app/phame-hero-illustration.png";

const OG_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/og-preview-PB5uoBDhiPJXzuqM8A9kzf.png";

const APP_PREVIEW_IMG = "https://assets.getphame.app/phame-app-screenshot.png";

const YOUTUBE_VIDEO_ID = "EWHSE1oyJOk";

function FAQSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);

  const FAQS = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    // Expanded objection-handling FAQs
    {
      q: t("faq.q5", "Does Get Phame store my email password?"),
      a: t("faq.a5", "Never. Get Phame uses your own SMTP credentials (or Gmail app password) to send emails directly from your account. Your password is encrypted at rest and never shared or stored in plain text. You can disconnect at any time from Settings."),
    },
    {
      q: t("faq.q6", "Will my emails land in spam?"),
      a: t("faq.a6", "Because emails are sent from your own email address — not a generic sender — they land in the primary inbox far more reliably than bulk marketing tools. Your domain reputation stays intact."),
    },
    {
      q: t("faq.q7", "What happens to my customer list?"),
      a: t("faq.a7", "Your customer data stays private. It is stored securely in your account and is never sold, shared, or used for any purpose other than sending your review requests. You can delete contacts at any time."),
    },
    {
      q: t("faq.q8", "Can customers opt out?"),
      a: t("faq.a8", "Yes. Every review request email includes an unsubscribe link. Customers who opt out are automatically excluded from future sends."),
    },
    {
      q: t("faq.q9", "Do I need technical skills to connect my email?"),
      a: t("faq.a9", "No. Get Phame auto-detects your email provider and shows step-by-step instructions for Gmail, Outlook, Yahoo, Zoho, and more. Setup takes under 2 minutes."),
    },
    {
      q: t("faq.q10", "Which review platforms does it support?"),
      a: t("faq.a10", "Google, Yelp, TripAdvisor, Facebook, Bing, and any custom URL. You can add multiple platforms and choose which one to include in each send."),
    },
    {
      q: t("faq.q11", "How does WooCommerce sync work?"),
      a: t("faq.a11", "Connect your WooCommerce store with your API key and Get Phame imports completed orders automatically. You can sync the last 30, 60, or 90 days of customers and bulk-send review requests in one click."),
    },
    {
      q: t("faq.q12", "What does unlimited mean on the Pro plan?"),
      a: t("faq.a12", "Unlimited means no cap on review requests sent per month. The Free plan includes 10 requests to get you started. Pro removes that limit entirely."),
    },
  ];

  return (
    <section id="faq" className="px-5 py-10 max-w-2xl mx-auto w-full">
      <h2 className="text-xl font-black text-center mb-6 rr-text-navy">
        {t("faq.sectionTitle")}
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
              <span className="text-sm font-black rr-text-navy">
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
              <div className="px-5 pb-5 text-xs leading-relaxed rr-text-navy-mid">
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
  const { t } = useTranslation();
  const loginUrl = getLoginUrl();

  const FEATURES = [
    {
      icon: <Mail size={22} className="rr-text-gold" />,
      title: t("features.sentFromYourEmail.title"),
      desc: t("features.sentFromYourEmail.desc"),
    },
    {
      icon: <Users size={22} className="rr-text-gold" />,
      title: t("features.bulkSend.title"),
      desc: t("features.bulkSend.desc"),
    },
    {
      icon: <Globe size={22} className="rr-text-gold" />,
      title: t("features.anyPlatform.title"),
      desc: t("features.anyPlatform.desc"),
    },
  ];

  const HOW_IT_WORKS = [
    { step: "1", label: t("howItWorks.step1") },
    { step: "2", label: t("howItWorks.step2") },
    { step: "3", label: t("howItWorks.step3") },
    { step: "4", label: t("howItWorks.step4") },
  ];

  // Capture ?ref= referral code from URL and persist in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode && refCode.length >= 4) {
      localStorage.setItem("phame_ref", refCode.toUpperCase());
    }
  }, []);

  useEffect(() => {
    document.title = t("seo.title");

    let kw = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    if (!kw) {
      kw = document.createElement("meta");
      kw.name = "keywords";
      document.head.appendChild(kw);
    }
    kw.content = t("seo.keywords");

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
    setMeta("og:title", t("seo.title"));
    setMeta("og:description", t("seo.ogDescription"));
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:image", OG_IMG);

    return () => {
      document.title = "Get Phame";
    };
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col rr-bg-cream-warm">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4 rr-bg-navy sticky top-0 z-50">
        <div className="flex items-center" style={{ minWidth: 120, minHeight: 40 }}>
          <img
            src="https://assets.getphame.app/phame-wordmark-transparent-clean.png"
            alt="Get Phame"
            style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <span
            className="items-center gap-2 font-black text-white"
            style={{ display: 'none', fontFamily: "'Poppins', sans-serif", fontSize: 18 }}
          >
            <Star size={18} fill="oklch(0.80 0.18 80)" style={{ color: 'oklch(0.80 0.18 80)' }} />
            Get Phame
          </span>
        </div>
        {/* Anchor links — hidden on very small screens, shown md+ */}
        <div className="hidden md:flex items-center gap-5 text-xs font-bold" style={{ color: "var(--text-on-dark-secondary)" }}>
          <a href="#how-it-works" className="hover:text-white transition-colors">{t("nav.howItWorks", "How It Works")}</a>
          <a href="#pricing" className="hover:text-white transition-colors">{t("nav.pricing", "Pricing")}</a>
          <a href="#faq" className="hover:text-white transition-colors">{t("nav.faq", "FAQ")}</a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={loginUrl}
            className="px-4 py-2 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy"
          >
            {t("nav.signIn")}
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative px-5 pt-12 pb-16 overflow-hidden rr-bg-navy">
        {/* Background rocket watermark */}
        <div
          className="absolute right-0 top-0 w-56 h-56 opacity-10 pointer-events-none"
          style={{ transform: "translate(15%, -15%)" }}
        >
          <img src={HERO_IMG} alt={t("hero.rocketIllustrationAlt")} className="w-full h-full object-contain" />
        </div>

        {/* Desktop: two-column layout; Mobile: stacked */}
        <div className="relative z-10 max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-12 md:items-center">
          {/* Left column — copy */}
          <div className="text-center md:text-left">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5 rr-bg-navy-mid rr-text-gold"
            >
              <Star size={11} fill="currentColor" />
              {t("hero.tagline")}
            </div>

            <h1 className="text-3xl md:text-4xl leading-tight mb-4 text-white rr-fw-black">
              {t("hero.headline")}
            </h1>

            <p className="text-sm md:text-base mb-8 leading-relaxed" style={{ color: "var(--text-on-dark-secondary)" }}>
              {t("hero.description")}
            </p>

            <a
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 w-full md:w-auto md:px-8 max-w-xs mx-auto md:mx-0 py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 rr-bg-gold rr-text-navy"
              style={{ display: "flex" }}
            >
              <Star size={20} />
              {t("hero.cta")}
              <ArrowRight size={18} />
            </a>

            <p className="text-xs mt-3 text-center md:text-left" style={{ color: "var(--text-on-dark-muted)" }}>
              {t("hero.setupTime")}
            </p>
          </div>

          {/* Right column — product screenshot */}
          <div className="relative mt-10 md:mt-0 mx-auto" style={{ maxWidth: 320 }}>
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-25 pointer-events-none rr-bg-gold"
              style={{ transform: "scale(0.90) translateY(12px)" }}
            />
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
              style={{ borderColor: "oklch(0.35 0.08 260)" }}
            >
              <img
                src={APP_PREVIEW_IMG}
                alt={t("hero.dashboardAlt")}
                className="w-full block"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  const fallback = el.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div
                className="items-center justify-center flex-col gap-2"
                style={{ display: 'none', minHeight: 200, background: 'oklch(0.22 0.09 260)', color: 'var(--text-on-dark-secondary)', fontSize: 13 }}
              >
                <Star size={24} fill="oklch(0.80 0.18 80)" style={{ color: 'oklch(0.80 0.18 80)' }} />
                <span>Get Phame</span>
              </div>
            </div>
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap rr-bg-gold rr-text-navy"
            >
              {t("hero.dashboardStats")}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals bar ───────────────────────────────────────────────── */}
      <section className="px-5 py-5" style={{ background: "oklch(0.19 0.08 260)", borderTop: "1px solid oklch(0.28 0.07 260)" }}>
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-on-dark-secondary)" }}>
            <Lock size={13} className="rr-text-gold" />
            <span>{t("trust.encryptedPassword", "Password encrypted at rest")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-on-dark-secondary)" }}>
            <Shield size={13} className="rr-text-gold" />
            <span>{t("trust.dataPrivacy", "Your customer list stays private")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-on-dark-secondary)" }}>
            <Mail size={13} className="rr-text-gold" />
            <span>{t("trust.emailProviders", "Works with Gmail, Outlook, Yahoo & more")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-on-dark-secondary)" }}>
            <Zap size={13} className="rr-text-gold" />
            <span>{t("trust.unsubscribe", "Unsubscribe link in every email")}</span>
          </div>
        </div>
      </section>

      {/* ── Video ───────────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 rr-bg-navy">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center mb-2 text-white">
            {t("video.sectionTitle", "See How It Works")}
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("video.sectionSubtitle", "Watch a quick walkthrough of Get Phame in action.")}
          </p>
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: "2px solid oklch(0.35 0.08 260)", paddingBottom: "56.25%", height: 0 }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
              title="Get Phame — See How It Works"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
          <p className="text-xs text-center mt-3" style={{ color: "var(--text-on-dark-muted)" }}>
            {t("video.caption", "Free to start — no credit card required")}
          </p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-3xl mx-auto w-full">
        <h2 className="text-xl font-black text-center mb-6 rr-text-navy">
          {t("features.sectionTitle")}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm md:flex-col md:items-center md:text-center"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 rr-bg-navy">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-black mb-1 rr-text-navy">{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.03 260)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-5 py-10 rr-bg-navy">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center mb-6 text-white">
            {t("howItWorks.sectionTitle")}
          </h2>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black rr-bg-gold rr-text-navy">
                  {item.step}
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-on-dark-primary)" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          {/* Section CTA */}
          <div className="mt-8 text-center">
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            >
              {t("hero.cta")}
              <ArrowRight size={16} />
            </a>
            <p className="text-xs mt-2" style={{ color: "var(--text-on-dark-muted)" }}>
              {t("hero.setupTime")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Proof section ───────────────────────────────────────────────────── */}
      <section className="px-5 py-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black text-center mb-2 rr-text-navy">
            {t("proof.sectionTitle", "Built for Businesses That Run on Reputation")}
          </h2>
          <p className="text-sm text-center mb-8 rr-text-navy-mid">
            {t("proof.sectionSubtitle", "Photographers, cafés, home services, clinics, agencies, and WooCommerce stores.")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "☕", label: t("proof.type1", "Cafés & Restaurants") },
              { icon: "🏠", label: t("proof.type2", "Home Services") },
              { icon: "📸", label: t("proof.type3", "Photographers") },
              { icon: "🏥", label: t("proof.type4", "Clinics & Salons") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                style={{ background: "oklch(0.97 0.005 260)" }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-bold rr-text-navy">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[
              {
                stat: t("proof.stat1Value", "10×"),
                label: t("proof.stat1Label", "more reviews vs. asking in person"),
              },
              {
                stat: t("proof.stat2Value", "< 2 min"),
                label: t("proof.stat2Label", "average setup time"),
              },
              {
                stat: t("proof.stat3Value", "Your inbox"),
                label: t("proof.stat3Label", "emails sent from your own address"),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 p-5 rounded-2xl text-center rr-bg-navy"
              >
                <span className="text-2xl font-black rr-text-gold">{item.stat}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--text-on-dark-secondary)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-5 py-10" style={{ background: "oklch(0.97 0.005 260)" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center mb-2 rr-text-navy">
            {t("pricing.sectionTitle")}
          </h2>
          <p className="text-sm text-center mb-6 rr-text-navy-mid">
            {t("pricing.sectionSubtitle")}
          </p>
          <div className="flex flex-col gap-3">
            {/* Free */}
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black rr-text-navy">{t("pricing.free")}</span>
                <span className="text-lg font-black rr-text-navy">{t("pricing.freePrice")}</span>
              </div>
              <p className="text-xs rr-text-navy-muted">{t("pricing.freeDescription", "Try Get Phame with 10 review requests — no credit card required.")}</p>
            </div>
            {/* Pro Monthly */}
            <div className="rounded-2xl p-5 border-2 bg-white" style={{ borderColor: "oklch(0.80 0.18 80)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black rr-text-navy">{t("pricing.proMonthly")}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy">{t("pricing.mostPopular")}</span>
                </div>
                <span className="text-lg font-black rr-text-navy">{t("pricing.proMonthlyPrice")}<span className="text-xs font-normal">{t("pricing.proMonthlyPer")}</span></span>
              </div>
              <p className="text-xs rr-text-navy-muted">{t("pricing.proMonthlyDescription", "Best for active businesses that send review requests weekly.")}</p>
            </div>
            {/* Pro Annual */}
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black rr-text-navy">{t("pricing.proAnnual")}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.95 0.05 150)", color: "oklch(0.30 0.15 150)", fontFamily: "'Poppins', sans-serif" }}
                  >{t("pricing.save15")}</span>
                </div>
                <span className="text-lg font-black rr-text-navy">{t("pricing.proAnnualPrice")}<span className="text-xs font-normal">{t("pricing.proAnnualPer")}</span></span>
              </div>
              <p className="text-xs rr-text-navy-muted">{t("pricing.proAnnualDescription", "Best value for businesses committed to reputation growth.")}</p>
            </div>
            {/* Lifetime */}
            <div className="rounded-2xl p-5 border rr-bg-navy" style={{ borderColor: "oklch(0.30 0.08 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{t("pricing.lifetime")}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy">{t("pricing.ownItForever")}</span>
                </div>
                <span className="text-lg font-black rr-text-gold">{t("pricing.lifetimePrice")}<span className="text-xs font-normal" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeOnce")}</span></span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeDescription", "Best for agencies, operators, and long-term owners. One business/location. Includes all future updates.")}</p>
            </div>
          </div>
          {/* Section CTA */}
          <div className="mt-6 text-center">
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95 rr-bg-navy rr-text-gold"
            >
              {t("hero.cta")}
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Competitor comparison ────────────────────────────────────────────── */}
      <section className="px-5 py-10 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center mb-2 rr-text-navy">
            {t("comparison.sectionTitle")}
          </h2>
          <p className="text-sm text-center mb-6 rr-text-navy-mid">
            {t("comparison.sectionSubtitle")}
          </p>

          {/* Mobile: stacked cards; Desktop: table */}
          <div className="block md:hidden flex flex-col gap-3">
            {[
              { name: "Get Phame", price: "$29/mo", lifetime: true, highlight: true },
              { name: "Birdeye", price: "$299/mo", lifetime: false, highlight: false },
              { name: "Podium", price: "$249/mo", lifetime: false, highlight: false },
              { name: "NiceJob", price: "$75/mo", lifetime: false, highlight: false },
              { name: "Grade.us", price: "$110/mo", lifetime: false, highlight: false },
              { name: "ReviewTrackers", price: "$89/mo", lifetime: false, highlight: false },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{
                  background: c.highlight ? "oklch(0.97 0.06 80)" : "oklch(0.975 0.003 100)",
                  border: c.highlight ? "2px solid oklch(0.80 0.18 80)" : "1px solid oklch(0.92 0.02 260)",
                }}
              >
                <div className="flex items-center gap-2">
                  {c.highlight && <Star size={13} className="rr-text-gold" />}
                  <span className={`text-sm font-black ${c.highlight ? "rr-text-navy" : ""}`} style={{ color: c.highlight ? undefined : "oklch(0.35 0.04 260)" }}>{c.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold rr-text-navy">{c.price}</span>
                  {c.lifetime
                    ? <Check size={16} style={{ color: "oklch(0.40 0.18 150)" }} />
                    : <X size={14} style={{ color: "oklch(0.65 0.15 25)" }} />
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
            <div className="grid grid-cols-3 px-4 py-3 text-xs font-black rr-bg-navy rr-text-gold">
              <span>{t("comparison.colPlatform")}</span>
              <span className="text-center">{t("comparison.colStartingPrice")}</span>
              <span className="text-center">{t("comparison.colLifetime")}</span>
            </div>
            {/* Get Phame row — highlighted */}
            <div
              className="grid grid-cols-3 px-4 py-3 items-center border-b-2 rr-bg-gold-pale"
              style={{ borderColor: "oklch(0.80 0.18 80)" }}
            >
              <div className="flex items-center gap-1.5">
                <Star size={13} className="rr-text-gold" />
                <span className="text-xs font-black rr-text-navy">Get Phame</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-black rr-text-navy">$29<span className="font-normal">/mo</span></span>
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
                <span className="text-xs text-center rr-text-navy-mid">{c.price}</span>
                <div className="flex justify-center">
                  <X size={14} style={{ color: "oklch(0.65 0.15 25)" }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-center mt-4 rr-text-navy-muted">
            {t("comparison.priceDisclaimer")} {t("comparison.verifiedAs", "Prices verified June 2025. Subject to change.")}
          </p>
        </div>
      </section>

      {/* ── Social proof strip ──────────────────────────────────────────────── */}
      <section className="px-5 py-8 max-w-3xl mx-auto w-full">
        <h2 className="text-center text-base font-black mb-5 rr-text-navy">
          {t("testimonials.sectionTitle")}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Testimonial 1 — Sarah */}
          <div className="rounded-2xl p-5 shadow-sm bg-white" style={{ border: "1px solid oklch(0.92 0.02 260)" }}>
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
              ))}
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}>
              "{t("testimonials.sarah.quote")}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 rr-bg-navy rr-text-gold">S</div>
              <div>
                <p className="text-xs font-bold rr-text-navy">{t("testimonials.sarah.name")}</p>
                <p className="text-xs rr-text-navy-muted">{t("testimonials.sarah.role")}</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 — Tom */}
          <div className="rounded-2xl p-5 shadow-sm bg-white" style={{ border: "1px solid oklch(0.92 0.02 260)" }}>
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
              ))}
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}>
              "{t("testimonials.tom.quote")}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 rr-bg-navy rr-text-gold">T</div>
              <div>
                <p className="text-xs font-bold rr-text-navy">{t("testimonials.tom.name")}</p>
                <p className="text-xs rr-text-navy-muted">{t("testimonials.tom.role")}</p>
              </div>
            </div>
          </div>
        </div>
        {/* Section CTA after testimonials */}
        <div className="mt-6 text-center">
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
          >
            {t("hero.cta")}
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-12 text-center rr-bg-navy">
        <div className="max-w-sm mx-auto">
          <h2 className="text-2xl font-black mb-3 text-white">
            {t("bottomCta.title")}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("bottomCta.subtitle")}
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            style={{ display: "flex" }}
          >
            <Send size={18} />
            {t("bottomCta.cta")}
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="px-5 py-6 flex flex-col items-center gap-4 text-xs"
        style={{ background: "oklch(0.18 0.07 260)", color: "var(--text-on-dark-muted)" }}
      >
        {/* Legal links */}
        <div className="flex items-center gap-4">
          <a href="/privacy-policy" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.privacy")}</a>
          <a href="/terms-of-service" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.terms")}</a>
          <a href="mailto:support@getphame.app" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.support")}</a>
        </div>

        {/* Brand */}
        <div className="flex items-center gap-1.5">
          <Star size={12} className="rr-text-gold" />
          <span className="rr-fw-bold">{t("nav.brandName")}</span>
        </div>
      </footer>
    </div>
  );
}
