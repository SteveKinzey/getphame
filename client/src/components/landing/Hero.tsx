import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import { ArrowRight, Shield, Mail, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const HERO_BG = "https://assets.getphame.app/phame-hero-bg.webp";
const HERO_BG_PNG = "https://assets.getphame.app/phame-hero-bg.png";
const APP_SCREENSHOT = "https://assets.getphame.app/phame-app-screenshot.png";

// A/B test variants
const CTA_VARIANTS = [
  "Start Free — First 10 Sends on Us",
  "Get Your First 10 Reviews Free",
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
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease },
});

export default function Hero() {
  const [ctaText, setCtaText] = useState<CTAVariant>(CTA_VARIANTS[0]);
  const [loginUrl, setLoginUrl] = useState("/onboarding");
  const { t } = useTranslation();

  const scrollToProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("product");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const variant = getOrAssignVariant();
    setCtaText(variant);
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
                  {t("hero.tagline", { defaultValue: "Free to start — No credit card required" })}
                </span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.2)}
              className="font-display font-extrabold text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] text-white mb-6"
            >
              {t("hero.titlePart1", { defaultValue: "Get more 5-star reviews" })}{" "}
              <span className="text-primary">{t("hero.titlePart3", { defaultValue: "without the awkward ask" })}</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.32)}
              className="text-lg md:text-xl text-white leading-relaxed mb-8 max-w-lg font-medium"
            >
              {t("hero.subtitle", { defaultValue: "Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender." })}
            </motion.p>

            <motion.div {...fadeUp(0.44)} className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.3)]"
              >
                {ctaText === "Start Free — First 10 Sends on Us"
                  ? t("hero.ctaVariantA", { defaultValue: "Start Free — First 10 Sends on Us" })
                  : t("hero.ctaVariantB", { defaultValue: "Get Your First 10 Reviews Free" })}
                <ArrowRight size={18} />
              </a>
              <a
                href="#product"
                onClick={scrollToProduct}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/10 text-white font-bold text-base rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-200 active:scale-[0.97] backdrop-blur-sm"
              >
                {t("hero.seeHowItWorks", { defaultValue: "See how it works" })}
              </a>
            </motion.div>

            <motion.div
              {...fadeUp(0.54)}
              className="flex flex-col sm:flex-row gap-4 text-sm text-slate-200 font-medium"
            >
              <span className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                {t("hero.setupIn2Min", { defaultValue: "Set up in under 2 minutes" })}
              </span>
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-400" />
                {t("hero.worksWithEmail", { defaultValue: "Works with Gmail, Outlook, SMTP" })}
              </span>
              <span className="flex items-center gap-2">
                <Star size={14} className="text-emerald-400" />
                {t("hero.freeSends", { defaultValue: "10 free sends · then 5/30 days free" })}
              </span>
            </motion.div>

            <motion.p
              {...fadeUp(0.62)}
              className="text-xs text-slate-400 mt-2 leading-relaxed"
            >
              {t("hero.googleSignInNote", { defaultValue: "Sign in with Google to create your account. We only access your name and email address — nothing else." })}{" "}
              <a href="/privacy-policy" className="text-primary/80 hover:text-primary underline underline-offset-2">{t("hero.privacyPolicy", { defaultValue: "Privacy Policy" })}</a>
            </motion.p>
          </div>

          {/* Right Column — dashboard mockup slides in from right */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <div className="animate-float">
              <div className="relative flex justify-center">
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/20 border-4 border-[#1e3050] max-w-[280px]">
                  <img
                    src={APP_SCREENSHOT}
                    alt="GetPhame mobile app showing review request dashboard with 5-star review growth for local businesses"
                    className="w-full h-auto"
                    width={320}
                    height={640}
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5" />
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
