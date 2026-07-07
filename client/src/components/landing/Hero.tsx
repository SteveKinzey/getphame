import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import { ArrowRight, Shield, Mail, Star } from "lucide-react";
import { motion } from "framer-motion";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-hero-bg-avecsnuEQ62t9BLESYJfW4.webp";
const DASHBOARD_MOCKUP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-dashboard-mockup-LQn8UoksYQenokEeoGwng7.webp";

// A/B test variants
const CTA_VARIANTS = [
  "Start Free — Send 10 Requests",
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
                  Free to start — No credit card required
                </span>
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.2)}
              className="font-display font-extrabold text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] text-white mb-6"
            >
              Get more 5-star reviews{" "}
              <span className="text-primary">without the awkward ask</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.32)}
              className="text-lg md:text-xl text-white leading-relaxed mb-8 max-w-lg font-medium"
            >
              Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender.
            </motion.p>

            <motion.div {...fadeUp(0.44)} className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.3)]"
              >
                {ctaText}
                <ArrowRight size={18} />
              </a>
            </motion.div>

            <motion.div
              {...fadeUp(0.54)}
              className="flex flex-col sm:flex-row gap-4 text-sm text-slate-200 font-medium"
            >
              <span className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                Set up in under 2 minutes
              </span>
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-400" />
                Works with Gmail, Outlook, SMTP
              </span>
            </motion.div>
          </div>

          {/* Right Column — dashboard mockup slides in from right */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
          >
            <div className="animate-float">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-[#1e3050]">
                <img
                  src={DASHBOARD_MOCKUP}
                  alt="Get Phame dashboard showing review requests and email performance stats"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
              </div>
            </div>
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
