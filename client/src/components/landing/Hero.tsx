import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import { ArrowRight, Shield, Mail, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const HERO_BG = "https://assets.getphame.app/phame-hero-bg.webp";
const HERO_BG_PNG = "https://assets.getphame.app/phame-hero-bg.png";
const DASHBOARD_MOCKUP_WEBP = "https://assets.getphame.app/phame-app-screenshot.png?v=2";
const DASHBOARD_MOCKUP_PNG = "https://assets.getphame.app/phame-app-screenshot.png?v=2";

// A/B test variants
const CTA_VARIANTS = [
  "Start Free — Send 10 Requests",
  "Start Free — No Card Required",
] as const;

type CTAVariant = (typeof CTA_VARIANTS)[number];

function getOrAssignVariant(): CTAVariant {
  const key = "phame_cta_variant";
  const stored = localStorage.getItem(key) as CTAVariant | null;
  if (stored && CTA_VARIANTS.includes(stored)) return stored;
  // 50/50 random split
  const assigned = CTA_VARIANTS[Math.random() < 0.5 ? 0 : 1];
  localStorage.setItem(key, assigned);
  return assigned;
}

// Stagger timing for hero copy elements
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeUp = (delay = 0) => ({
  initial: false as const,
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease },
});

export default function Hero() {
  const { t } = useTranslation();
  const [ctaVariant, setCtaVariant] = useState<CTAVariant>(CTA_VARIANTS[0]);
  const [loginUrl, setLoginUrl] = useState("/onboarding");

  const scrollToProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("product");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const variant = getOrAssignVariant();
    setCtaVariant(variant);
    // Log variant for analytics (replace with your analytics call)
    console.info("[A/B] hero_cta_variant:", variant);
  }, []);

  useEffect(() => {
    setLoginUrl(getLoginUrl("/home"));
  }, []);

  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-20 pb-16 md:pt-24 md:pb-20"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[oklch(0.10_0.03_250/0.6)]" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column — staggered entrance */}
          <div className="max-w-xl">
            <motion.div {...fadeUp(0.1)}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star size={14} className="text-primary fill-primary" />
                <span className="text-sm font-medium text-primary">
                  {t("landing.hero.categoryLabel", { defaultValue: "Review-request email software for local businesses" })}
                </span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.2)}
              className="font-display font-extrabold text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] text-white mb-6"
            >
              {t("landing.hero.headlinePart1", { defaultValue: "Send personal review requests" })}{" "}
              <span className="text-primary">{t("landing.hero.headlinePart2", { defaultValue: "without the awkward ask" })}</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.32)}
              className="text-lg md:text-xl text-white leading-relaxed mb-8 max-w-lg font-medium"
            >
              {t("landing.hero.description", { defaultValue: "Get Phame is review-request email software for local businesses. Add customers, send personalized requests from an email account you connect, track opens and clicks, and direct customers to the review platform you choose." })}
            </motion.p>

            <motion.div
              {...fadeUp(0.38)}
              aria-label={t("landing.purpose.title", { defaultValue: "What Get Phame does" })}
              className="mb-8 flex max-w-xl flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-center text-xs font-semibold text-slate-100 sm:flex-row sm:gap-3 sm:text-left"
            >
              <span>{t("landing.purpose.steps.customers", { defaultValue: "Add the customers you choose" })}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-primary sm:rotate-0" aria-hidden="true" />
              <span>{t("landing.purpose.steps.send", { defaultValue: "Send a personal request from your email" })}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-primary sm:rotate-0" aria-hidden="true" />
              <span>{t("landing.purpose.steps.reviews", { defaultValue: "Direct customers to your selected review platform" })}</span>
            </motion.div>

            <motion.div
              {...fadeUp(0.5)}
              role="note"
              aria-label={t("landing.hero.googleDisclosureLabel", { defaultValue: "Google sign-in data use" })}
              className="mb-6 max-w-lg rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm font-medium leading-relaxed text-slate-200"
            >
              <span className="font-extrabold text-white">{t("landing.hero.googleDisclosureLabel", { defaultValue: "Google sign-in data use" })}: </span>
              {t("landing.hero.googleSignInDisclaimer", { defaultValue: "Google sign-in only provides your name and email address to create and identify your Get Phame account. We do not request access to Gmail messages, contacts, Drive files, or Calendar." })}{" "}
              <a href="/privacy-policy" className="text-primary/80 hover:text-primary underline underline-offset-2">{t("landing.hero.privacyPolicy", { defaultValue: "Privacy Policy" })}</a>
            </motion.div>

            <motion.div {...fadeUp(0.56)} className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.3)]"
              >
                {ctaVariant === CTA_VARIANTS[0]
                  ? t("landing.hero.ctaVariantA", { defaultValue: "Start Free — Send 10 Requests" })
                  : t("landing.hero.ctaVariantB", { defaultValue: "Start Free — No Card Required" })}
                <ArrowRight size={18} />
              </a>
              <a
                href="#product"
                onClick={scrollToProduct}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/10 text-white font-bold text-base rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-200 active:scale-[0.97] backdrop-blur-sm"
              >
                {t("landing.hero.howItWorks", { defaultValue: "See how it works" })}
              </a>
            </motion.div>

            <motion.div
              {...fadeUp(0.6)}
              className="flex flex-col sm:flex-row gap-4 text-sm text-slate-200 font-medium"
            >
              <span className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                {t("landing.hero.setupTime", { defaultValue: "Guided setup" })}
              </span>
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-400" />
                {t("landing.hero.emailCompatibility", { defaultValue: "Works with Gmail, Outlook, SMTP" })}
              </span>
            </motion.div>
          </div>

          {/* Right Column — dashboard mockup slides in from right */}
          <motion.div
            className="relative hidden lg:block"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <div className="animate-float" style={{ perspective: '1200px' }}>
              {/* iPhone-style phone frame */}
              <div className="relative mx-auto" style={{ width: 'fit-content', transform: 'perspective(1200px) rotateY(-8deg)', transformStyle: 'preserve-3d' }}>
                {/* Outer phone shell */}
                <div
                  className="relative"
                  style={{
                    background: 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 40%, #111114 100%)',
                    borderRadius: '44px',
                    padding: '10px',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 0 0 2px rgba(0,0,0,0.6), 0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  {/* Volume buttons (left side) */}
                  <div className="absolute" style={{ left: '-3px', top: '90px', width: '3px', height: '28px', background: '#2a2a2e', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 0 rgba(255,255,255,0.06)' }} />
                  <div className="absolute" style={{ left: '-3px', top: '128px', width: '3px', height: '44px', background: '#2a2a2e', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 0 rgba(255,255,255,0.06)' }} />
                  <div className="absolute" style={{ left: '-3px', top: '182px', width: '3px', height: '44px', background: '#2a2a2e', borderRadius: '2px 0 0 2px', boxShadow: '-1px 0 0 rgba(255,255,255,0.06)' }} />
                  {/* Power button (right side) */}
                  <div className="absolute" style={{ right: '-3px', top: '140px', width: '3px', height: '60px', background: '#2a2a2e', borderRadius: '0 2px 2px 0', boxShadow: '1px 0 0 rgba(255,255,255,0.06)' }} />
                  {/* Screen area */}
                  <div
                    style={{
                      borderRadius: '36px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#000',
                    }}
                  >
                    {/* Dynamic Island notch */}
                    <div
                      className="absolute z-10 flex items-center justify-center"
                      style={{
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '96px',
                        height: '26px',
                        background: '#000',
                        borderRadius: '20px',
                      }}
                    />
                    <picture>
                      <source srcSet={DASHBOARD_MOCKUP_WEBP} type="image/webp" />
                      <source srcSet={DASHBOARD_MOCKUP_PNG} type="image/png" />
                      <img
                        src={DASHBOARD_MOCKUP_PNG}
                        alt={t("landing.hero.dashboardMockupAlt", { defaultValue: "GetPhame app home screen showing review request stats, send button, and free plan usage for local businesses" })}
                        className="block"
                        style={{ width: '260px', height: 'auto', display: 'block' }}
                        width={400}
                        height={711}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
                    </picture>
                    {/* Screen glare overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)', borderRadius: '36px' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
