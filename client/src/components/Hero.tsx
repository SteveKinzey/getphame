import { ArrowRight, Shield, Mail, Star } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-hero-bg-avecsnuEQ62t9BLESYJfW4.webp";
const DASHBOARD_MOCKUP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/FK9bk5QsyQ42fQPrngzafd/phame-dashboard-mockup-LQn8UoksYQenokEeoGwng7.webp";

export default function Hero() {
  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-20 pb-16 md:pt-24 md:pb-20"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-[oklch(0.10_0.03_250/0.6)]" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column — Copy */}
          <div className="max-w-xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Star size={14} className="text-primary fill-primary" />
              <span className="text-sm font-medium text-primary">
                Free to start — No credit card required
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] text-white mb-6">
              Get more 5-star reviews{" "}
              <span className="text-primary">without the awkward ask</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-lg">
              Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href="https://getphame.app/onboarding"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.3)]"
              >
                Start Free — Send 10 Requests
                <ArrowRight size={18} />
              </a>
            </div>

            {/* Trust bullets */}
            <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                Set up in under 2 minutes
              </span>
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-400" />
                Works with Gmail, Outlook, SMTP
              </span>
            </div>
          </div>

          {/* Right Column — Product Mockup */}
          <div className="relative hidden lg:block">
            <div className="animate-float">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-[oklch(0.30_0.03_250)]">
                <img
                  src={DASHBOARD_MOCKUP}
                  alt="Get Phame dashboard showing review requests and email performance stats"
                  className="w-full h-auto"
                />
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
              </div>
            </div>
            {/* Decorative glow behind mockup */}
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
