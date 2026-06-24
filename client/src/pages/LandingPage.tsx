// Get Phame — Landing Page
// Redesigned nav + full page layout — navy/gold design system

import { getLoginUrl } from "@/const";
import { Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe, ChevronDown, X, Check, Zap, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const APP_PREVIEW_IMG = "https://assets.getphame.app/phame-app-screenshot.png";
const OG_IMG = "https://assets.getphame.app/getphame-og-1200x630.png";

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);

  const FAQS = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
  ];

  return (
    <section className="px-5 py-12 max-w-lg mx-auto w-full">
      <h2 className="text-xl font-black text-center mb-6 rr-text-navy">
        {t("faq.sectionTitle")}
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border" style={{ borderColor: "oklch(0.93 0.02 260)" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold rr-text-navy">{faq.q}</span>
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform duration-200 rr-text-gold"
                style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "oklch(0.45 0.04 260)" }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
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
      title: t("features.sentFromYourEmail.title"),
      desc: t("features.sentFromYourEmail.desc"),
    },
    {
      icon: <Users size={20} className="rr-text-gold" />,
      title: t("features.bulkSend.title"),
      desc: t("features.bulkSend.desc"),
    },
    {
      icon: <Globe size={20} className="rr-text-gold" />,
      title: t("features.anyPlatform.title"),
      desc: t("features.anyPlatform.desc"),
    },
    {
      icon: <Zap size={20} className="rr-text-gold" />,
      title: "Automated Follow-Ups",
      desc: "Set it and forget it. Phame sends reminders automatically so you never have to chase a customer.",
    },
    {
      icon: <Shield size={20} className="rr-text-gold" />,
      title: "Compliance Built In",
      desc: "Platform-specific rules enforced automatically. Stay safe on Google, Yelp, TripAdvisor, and more.",
    },
  ];

  const HOW_IT_WORKS = [
    { step: "1", label: t("howItWorks.step1") },
    { step: "2", label: t("howItWorks.step2") },
    { step: "3", label: t("howItWorks.step3") },
    { step: "4", label: t("howItWorks.step4") },
  ];

  // Capture ?ref= referral code
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
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-16">

          {/* Logo — icon + wordmark, properly sized */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center rr-bg-gold shrink-0"
              style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.35)" }}
            >
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

          {/* Nav links — desktop only (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-5">
            <a href="#how-it-works" className="text-xs font-semibold transition-colors" style={{ color: "var(--text-on-dark-secondary)" }}>
              How It Works
            </a>
            <a href="#pricing" className="text-xs font-semibold transition-colors" style={{ color: "var(--text-on-dark-secondary)" }}>
              Pricing
            </a>
            <a href="#faq" className="text-xs font-semibold transition-colors" style={{ color: "var(--text-on-dark-secondary)" }}>
              FAQ
            </a>
          </div>

          {/* CTA */}
          <a
            href={loginUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy shrink-0"
            style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.30)" }}
          >
            {t("nav.signIn")}
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative px-5 pt-14 pb-0 overflow-hidden rr-bg-navy">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(240,165,0,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-sm mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5 rr-text-gold"
            style={{ background: "rgba(240,165,0,0.12)", border: "1px solid rgba(240,165,0,0.25)" }}>
            <Star size={11} fill="currentColor" />
            {t("hero.tagline")}
          </div>

          {/* Headline */}
          <h1 className="text-4xl leading-tight mb-4 text-white font-black" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t("hero.headline")}
          </h1>

          {/* Subheadline */}
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-on-dark-secondary)", maxWidth: 320, margin: "0 auto 2rem" }}>
            {t("hero.description")}
          </p>

          {/* CTA */}
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            style={{ boxShadow: "0 4px 20px rgba(240,165,0,0.40)", display: "flex" }}
          >
            <Star size={18} fill="currentColor" />
            {t("hero.cta")}
            <ArrowRight size={16} />
          </a>

          <p className="text-xs mt-3" style={{ color: "var(--text-on-dark-muted)" }}>
            {t("hero.setupTime")}
          </p>
        </div>

        {/* App screenshot — floating phone */}
        <div className="relative mt-12 mx-auto" style={{ maxWidth: 260 }}>
          {/* Gold glow behind phone */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse 90% 60% at 50% 80%, rgba(240,165,0,0.30) 0%, transparent 70%)" }}
          />
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{ border: "3px solid rgba(255,255,255,0.10)" }}
          >
            <img src={APP_PREVIEW_IMG} alt={t("hero.dashboardAlt")} className="w-full block" />
          </div>
          {/* Floating label */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap rr-bg-gold rr-text-navy"
            style={{ boxShadow: "0 2px 12px rgba(240,165,0,0.45)" }}
          >
            {t("hero.dashboardStats")}
          </div>
        </div>

        {/* Wave divider */}
        <div className="mt-10" style={{ lineHeight: 0 }}>
          <svg viewBox="0 0 390 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: "100%", height: 40, display: "block" }}>
            <path d="M0,20 C80,40 310,0 390,20 L390,40 L0,40 Z" fill="oklch(0.975 0.003 100)" />
          </svg>
        </div>
      </section>

      {/* ── TRUST STRIP ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-6" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: <CheckCircle2 size={14} style={{ color: "oklch(0.50 0.18 150)" }} />, label: "Free to start" },
            { icon: <CheckCircle2 size={14} style={{ color: "oklch(0.50 0.18 150)" }} />, label: "No credit card" },
            { icon: <CheckCircle2 size={14} style={{ color: "oklch(0.50 0.18 150)" }} />, label: "Setup in 2 min" },
            { icon: <CheckCircle2 size={14} style={{ color: "oklch(0.50 0.18 150)" }} />, label: "Cancel anytime" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-xs font-semibold" style={{ color: "oklch(0.40 0.04 260)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t("features.sectionTitle")}
          </h2>
          <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
            Everything you need to turn happy customers into public reviews.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl p-5"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid oklch(0.93 0.02 260)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 rr-bg-navy">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5 rr-text-navy">{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.03 260)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-5 py-14 rr-bg-navy">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("howItWorks.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
              Up and running in under 2 minutes.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black rr-bg-gold rr-text-navy mt-0.5"
                  style={{ boxShadow: "0 2px 8px rgba(240,165,0,0.30)" }}
                >
                  {item.step}
                </div>
                <div className="flex-1 pt-1.5">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="mt-4 ml-0 w-px h-4 ml-0" style={{ background: "rgba(255,255,255,0.10)", marginLeft: "-2.25rem", paddingLeft: "2.25rem" }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA inside section */}
          <div className="mt-10 text-center">
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-gold rr-text-navy"
              style={{ boxShadow: "0 4px 20px rgba(240,165,0,0.40)" }}
            >
              <Star size={18} fill="currentColor" />
              Get Started Free
            </a>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-5 py-14" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("pricing.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
              {t("pricing.sectionSubtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {/* Free */}
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black rr-text-navy">{t("pricing.free")}</span>
                <span className="text-xl font-black rr-text-navy">{t("pricing.freePrice")}</span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>{t("pricing.freeDescription")}</p>
            </div>
            {/* Pro Monthly — highlighted */}
            <div className="rounded-2xl p-5 border-2 bg-white relative overflow-hidden" style={{ borderColor: "var(--gold)" }}>
              <div
                className="absolute top-0 right-0 px-3 py-1 text-xs font-black rr-bg-gold rr-text-navy"
                style={{ borderBottomLeftRadius: 12 }}
              >
                {t("pricing.mostPopular")}
              </div>
              <div className="flex items-center justify-between mb-1 pr-20">
                <span className="text-sm font-black rr-text-navy">{t("pricing.proMonthly")}</span>
                <span className="text-xl font-black rr-text-navy">
                  {t("pricing.proMonthlyPrice")}<span className="text-xs font-normal">{t("pricing.proMonthlyPer")}</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>{t("pricing.proMonthlyDescription")}</p>
            </div>
            {/* Pro Annual */}
            <div className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black rr-text-navy">{t("pricing.proAnnual")}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.95 0.05 150)", color: "oklch(0.30 0.15 150)" }}>
                    {t("pricing.save15")}
                  </span>
                </div>
                <span className="text-xl font-black rr-text-navy">
                  {t("pricing.proAnnualPrice")}<span className="text-xs font-normal">{t("pricing.proAnnualPer")}</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>{t("pricing.proAnnualDescription")}</p>
            </div>
            {/* Lifetime */}
            <div className="rounded-2xl p-5 border rr-bg-navy" style={{ borderColor: "oklch(0.30 0.08 260)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{t("pricing.lifetime")}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy">
                    {t("pricing.ownItForever")}
                  </span>
                </div>
                <span className="text-xl font-black rr-text-gold">
                  {t("pricing.lifetimePrice")}<span className="text-xs font-normal" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeOnce")}</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPETITOR COMPARISON ───────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-white">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black rr-text-navy mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {t("comparison.sectionTitle")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
              {t("comparison.sectionSubtitle")}
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
            <div className="grid grid-cols-3 px-4 py-3 text-xs font-black rr-bg-navy rr-text-gold">
              <span>{t("comparison.colPlatform")}</span>
              <span className="text-center">{t("comparison.colStartingPrice")}</span>
              <span className="text-center">{t("comparison.colLifetime")}</span>
            </div>
            {/* Phame row */}
            <div className="grid grid-cols-3 px-4 py-3 items-center border-b-2" style={{ background: "oklch(0.97 0.06 80)", borderColor: "var(--gold)" }}>
              <div className="flex items-center gap-1.5">
                <Star size={13} className="rr-text-gold" fill="currentColor" />
                <span className="text-xs font-black rr-text-navy">Phame</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-black rr-text-navy">$29<span className="font-normal">/mo</span></span>
              </div>
              <div className="flex justify-center">
                <Check size={16} style={{ color: "oklch(0.40 0.18 150)" }} />
              </div>
            </div>
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
                <span className="text-xs text-center" style={{ color: "oklch(0.45 0.04 260)" }}>{c.price}</span>
                <div className="flex justify-center">
                  <X size={14} style={{ color: "oklch(0.65 0.15 25)" }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-4" style={{ color: "oklch(0.60 0.03 260)" }}>
            {t("comparison.priceDisclaimer")}
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-lg mx-auto w-full">
        <h2 className="text-center text-xl font-black mb-6 rr-text-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {t("testimonials.sectionTitle")}
        </h2>
        <div className="flex flex-col gap-4">
          {[
            { key: "sarah", initial: "S" },
            { key: "tom", initial: "T" },
          ].map(({ key, initial }) => (
            <div
              key={key}
              className="rounded-2xl p-5 bg-white"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid oklch(0.92 0.02 260)" }}
            >
              <div className="flex items-center gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="var(--gold)" className="rr-text-gold" />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}>
                "{t(`testimonials.${key}.quote`)}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 rr-bg-navy rr-text-gold">
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
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <div id="faq">
        <FAQSection />
      </div>

      {/* ── BOTTOM CTA ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 text-center rr-bg-navy" style={{ position: "relative", overflow: "hidden" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(240,165,0,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-sm mx-auto">
          <div className="flex justify-center gap-0.5 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="var(--gold)" className="rr-text-gold" />)}
          </div>
          <h2 className="text-2xl font-black mb-3 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t("bottomCta.title")}
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("bottomCta.subtitle")}
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-base transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            style={{ boxShadow: "0 4px 20px rgba(240,165,0,0.40)", display: "flex" }}
          >
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
        <div className="max-w-lg mx-auto px-5 py-8 flex flex-col items-center gap-5">
          {/* Brand mark */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center rr-bg-gold">
              <Star size={14} fill="#1a2744" color="#1a2744" />
            </div>
            <span className="text-white font-black text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Get Phame
            </span>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="/privacy-policy" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>
              {t("footer.privacy")}
            </a>
            <a href="/terms-of-service" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>
              {t("footer.terms")}
            </a>
            <a href="mailto:support@getphame.app" className="text-xs transition-colors" style={{ color: "var(--text-on-dark-muted)" }}>
              {t("footer.support")}
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs" style={{ color: "oklch(0.40 0.03 260)" }}>
            © {new Date().getFullYear()} Get Phame. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
