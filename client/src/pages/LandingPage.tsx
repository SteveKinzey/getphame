// Public marketing landing page — shown at / when the user is not logged in
// Navy/gold design system matching the authenticated app

import { getLoginUrl } from "@/const";
import { Rocket, Star, Send, Users, CheckCircle2, ArrowRight, Mail, Globe } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

const OG_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/og-preview-PB5uoBDhiPJXzuqM8A9kzf.png";

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

const HOW_IT_WORKS = [
  { step: "1", label: "Connect your email account (SMTP)" },
  { step: "2", label: "Add your Google (or other) review link" },
  { step: "3", label: "Import or add your customers" },
  { step: "4", label: "Send personalised review requests" },
];

export default function LandingPage() {
  const loginUrl = getLoginUrl();

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
          <img src={HERO_IMG} alt="" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 max-w-sm mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5"
            style={{ background: "oklch(0.30 0.08 260)", color: "oklch(0.80 0.18 80)" }}
          >
            <Star size={11} fill="currentColor" />
            Free Forever — No credit card required
          </div>

          <h1
            className="text-3xl leading-tight mb-4"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
          >
            Get more 5-star reviews without the awkward ask
          </h1>

          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.70)" }}>
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

          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.40)" }}>
            Takes less than 2 minutes to set up
          </p>
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
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
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

      {/* ── Social proof strip ──────────────────────────────────────────────── */}
      <section className="px-5 py-8 max-w-lg mx-auto w-full text-center">
        <div className="flex items-center justify-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: "oklch(0.22 0.09 260)" }}
        >
          "Finally a tool that doesn't make my review requests look spammy."
        </p>
        <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
          — Local business owner
        </p>
      </section>

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
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>
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
        style={{ background: "oklch(0.18 0.07 260)", color: "rgba(255,255,255,0.40)" }}
      >
        <div className="flex items-center gap-1.5">
          <Rocket size={12} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>ReviewLink</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/privacy-policy" style={{ color: "rgba(255,255,255,0.40)" }}>Privacy</a>
          <a href="/terms-of-service" style={{ color: "rgba(255,255,255,0.40)" }}>Terms</a>
        </div>
      </footer>
    </div>
  );
}
