// Phame — Landing Page
// Navy/gold design system matching the authenticated app

import { getLoginUrl } from "@/const";
import { Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe, ChevronDown, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const HERO_IMG = "https://assets.getphame.app/phame-hero-illustration.png";

const OG_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/og-preview-PB5uoBDhiPJXzuqM8A9kzf.png";

const APP_PREVIEW_IMG = "https://assets.getphame.app/phame-app-screenshot.png";

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
    <section className="px-5 py-10 max-w-lg mx-auto w-full">
      <h2
        className="text-xl font-black text-center mb-6 rr-text-navy"
      >
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
              <span
                className="text-sm font-black rr-text-navy"
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
                className="px-5 pb-5 text-xs leading-relaxed rr-text-navy-mid"
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
      <nav
        className="flex items-center justify-between px-5 py-4 rr-bg-navy"
      >
        <div className="flex items-center">
          <img
            src="https://assets.getphame.app/phame-wordmark-transparent-clean.png"
            alt="Get Phame"
            style={{ height: '40px', width: 'auto' }}
          />
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
      <section
        className="relative px-5 pt-12 pb-16 overflow-hidden text-center rr-bg-navy"
      >
        {/* Background rocket watermark */}
        <div
          className="absolute right-0 top-0 w-56 h-56 opacity-10 pointer-events-none"
          style={{ transform: "translate(15%, -15%)" }}
        >
          <img src={HERO_IMG} alt={t("hero.rocketIllustrationAlt")} className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 max-w-sm mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5 rr-bg-navy-mid rr-text-gold"
          >
            <Star size={11} fill="currentColor" />
            {t("hero.tagline")}
          </div>

          <h1
            className="text-3xl leading-tight mb-4 text-white rr-fw-black"
          >
            {t("hero.headline")}
          </h1>

          <p className="text-sm mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("hero.description")}
          </p>

          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 rr-bg-gold rr-text-navy" style={{ display: "flex" }}
          >
            <Star size={20} />
            {t("hero.cta")}
            <ArrowRight size={18} />
          </a>

          <p className="text-xs mt-3" style={{ color: "var(--text-on-dark-muted)" }}>
            {t("hero.setupTime")}
          </p>
        </div>

        {/* Product screenshot */}
        <div className="relative mt-10 mx-auto pb-6" style={{ maxWidth: 280 }}>
          <div
            className="absolute inset-0 rounded-3xl blur-2xl opacity-25 pointer-events-none rr-bg-gold" style={{ transform: "scale(0.90) translateY(12px)" }}
          />
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border-4"
            style={{ borderColor: "oklch(0.35 0.08 260)" }}
          >
            <img
              src={APP_PREVIEW_IMG}
              alt={t("hero.dashboardAlt")}
              className="w-full block"
            />
          </div>
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap rr-bg-gold rr-text-navy"
          >
            {t("hero.dashboardStats")}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-lg mx-auto w-full">
        <h2
          className="text-xl font-black text-center mb-6 rr-text-navy"
        >
          {t("features.sectionTitle")}
        </h2>
        <div className="flex flex-col gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 rr-bg-navy"
              >
                {f.icon}
              </div>
              <div>
                <p
                  className="text-sm font-black mb-1 rr-text-navy"
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
        className="px-5 py-10 rr-bg-navy"
      >
        <div className="max-w-lg mx-auto">
          <h2
            className="text-xl font-black text-center mb-6 text-white"
          >
            {t("howItWorks.sectionTitle")}
          </h2>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black rr-bg-gold rr-text-navy"
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
            className="text-xl font-black text-center mb-2 rr-text-navy"
          >
            {t("pricing.sectionTitle")}
          </h2>
          <p className="text-sm text-center mb-6 rr-text-navy-mid">
            {t("pricing.sectionSubtitle")}
          </p>
          <div className="flex flex-col gap-3">
            {/* Free */}
            <div
              className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-black rr-text-navy">{t("pricing.free")}</span>
                <span className="text-lg font-black rr-text-navy">{t("pricing.freePrice")}</span>
              </div>
              <p className="text-xs rr-text-navy-muted">{t("pricing.freeDescription")}</p>
            </div>
            {/* Pro Monthly */}
            <div
              className="rounded-2xl p-5 border-2 bg-white" style={{ borderColor: "oklch(0.80 0.18 80)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black rr-text-navy">{t("pricing.proMonthly")}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy"
                  >{t("pricing.mostPopular")}</span>
                </div>
                <span className="text-lg font-black rr-text-navy">{t("pricing.proMonthlyPrice")}<span className="text-xs font-normal">{t("pricing.proMonthlyPer")}</span></span>
              </div>
              <p className="text-xs rr-text-navy-muted">{t("pricing.proMonthlyDescription")}</p>
            </div>
            {/* Pro Annual */}
            <div
              className="rounded-2xl p-5 border bg-white" style={{ borderColor: "oklch(0.90 0.03 260)" }}
            >
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
              <p className="text-xs rr-text-navy-muted">{t("pricing.proAnnualDescription")}</p>
            </div>
            {/* Lifetime */}
            <div
              className="rounded-2xl p-5 border rr-bg-navy" style={{ borderColor: "oklch(0.30 0.08 260)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{t("pricing.lifetime")}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold rr-bg-gold rr-text-navy"
                  >{t("pricing.ownItForever")}</span>
                </div>
                <span className="text-lg font-black rr-text-gold">{t("pricing.lifetimePrice")}<span className="text-xs font-normal" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeOnce")}</span></span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>{t("pricing.lifetimeDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Competitor comparison ────────────────────────────────────────────── */}
      <section className="px-5 py-10 bg-white">
        <div className="max-w-lg mx-auto">
          <h2
            className="text-xl font-black text-center mb-2 rr-text-navy"
          >
            {t("comparison.sectionTitle")}
          </h2>
          <p className="text-sm text-center mb-6 rr-text-navy-mid">
            {t("comparison.sectionSubtitle")}
          </p>

          {/* Comparison table */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "oklch(0.90 0.03 260)" }}>
            {/* Header */}
            <div
              className="grid grid-cols-3 px-4 py-3 text-xs font-black rr-bg-navy rr-text-gold"
            >
              <span>{t("comparison.colPlatform")}</span>
              <span className="text-center">{t("comparison.colStartingPrice")}</span>
              <span className="text-center">{t("comparison.colLifetime")}</span>
            </div>
            {/* Get Phame row — highlighted */}
            <div
              className="grid grid-cols-3 px-4 py-3 items-center border-b-2 rr-bg-gold-pale" style={{ borderColor: "oklch(0.80 0.18 80)" }}
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
            {t("comparison.priceDisclaimer")}
          </p>
        </div>
      </section>

      {/* ── Social proof strip ──────────────────────────────────────────────── */}
      <section className="px-5 py-8 max-w-lg mx-auto w-full">
        <h2
          className="text-center text-base font-black mb-5 rr-text-navy"
        >
          {t("testimonials.sectionTitle")}
        </h2>
        <div className="flex flex-col gap-4">
          {/* Testimonial 1 — Sarah */}
          <div
            className="rounded-2xl p-5 shadow-sm bg-white" style={{ border: "1px solid oklch(0.92 0.02 260)" }}
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
              ))}
            </div>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}
            >
              "{t("testimonials.sarah.quote")}"
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 rr-bg-navy rr-text-gold"
              >
                S
              </div>
              <div>
                <p className="text-xs font-bold rr-text-navy">{t("testimonials.sarah.name")}</p>
                <p className="text-xs rr-text-navy-muted">{t("testimonials.sarah.role")}</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 — Tom */}
          <div
            className="rounded-2xl p-5 shadow-sm bg-white" style={{ border: "1px solid oklch(0.92 0.02 260)" }}
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
              ))}
            </div>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "oklch(0.30 0.05 260)", fontStyle: "italic" }}
            >
              "{t("testimonials.tom.quote")}"
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 rr-bg-navy rr-text-gold"
              >
                T
              </div>
              <div>
                <p className="text-xs font-bold rr-text-navy">{t("testimonials.tom.name")}</p>
                <p className="text-xs rr-text-navy-muted">{t("testimonials.tom.role")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section
        className="px-5 py-12 text-center rr-bg-navy"
      >
        <div className="max-w-sm mx-auto">
          <h2
            className="text-2xl font-black mb-3 text-white"
          >
            {t("bottomCta.title")}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("bottomCta.subtitle")}
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 rr-bg-gold rr-text-navy" style={{ display: "flex" }}
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
        {/* Language selector — centred for easy discovery by international visitors */}

        {/* Legal links */}
        <div className="flex items-center gap-4">
          <a href="/privacy-policy" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.privacy")}</a>
          <a href="/terms-of-service" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.terms")}</a>
          <a href="mailto:support@phame.app" style={{ color: "var(--text-on-dark-muted)" }}>{t("footer.support")}</a>
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
