import { ArrowRight } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    {
      number: "1",
      title: t("landing.howItWorks.setupSteps.step1.title", { defaultValue: "Connect your email" }),
      description: t("landing.howItWorks.setupSteps.step1.description", { defaultValue: "Connect Gmail, Outlook, or a supported SMTP account with provider-specific guidance. Credentials are encrypted at rest." }),
    },
    {
      number: "2",
      title: t("landing.howItWorks.setupSteps.step2.title", { defaultValue: "Choose your review destination" }),
      description: t("landing.howItWorks.setupSteps.step2.description", { defaultValue: "Configure a supported review destination and follow the platform-aware guidance shown before sending. Yelp uses a compliance-safe instruction flow rather than a standard solicitation link." }),
    },
    {
      number: "3",
      title: t("landing.howItWorks.setupSteps.step3.title", { defaultValue: "Review consented contacts" }),
      description: t("landing.howItWorks.setupSteps.step3.description", { defaultValue: "Upload a CSV, connect WooCommerce, or add contacts manually. Confirm your permission basis, review valid and duplicate rows, and import only the contacts you approve." }),
    },
    {
      number: "4",
      title: t("landing.howItWorks.setupSteps.step4.title", { defaultValue: "Send and track activity" }),
      description: t("landing.howItWorks.setupSteps.step4.description", { defaultValue: "Send an individual request to each customer you choose, then track sends, opens, clicks, reminders, and completion status." }),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.025_250)] via-[#0a1628] to-[#0a1628]" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          {/* Left — sticky headline */}
          <FadeUp className="lg:col-span-2 lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              {t("landing.howItWorks.setupInSteps", { defaultValue: "Setup in 4 steps" })}
            </p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              {t("landing.howItWorks.headline", { defaultValue: "Four steps to your first review request" })}
            </h2>
            <p className="text-lg text-slate-200 font-medium mb-8">
              {t("landing.howItWorks.subtitle", { defaultValue: "Connect your sender, review consented contacts, and choose each request before sending." })}
            </p>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.2)]"
            >
              {t("landing.howItWorks.getStartedButton", { defaultValue: "Get Started Free" })}
              <ArrowRight size={18} />
            </a>
            <p className="text-sm text-slate-300 font-medium mt-3">
              {t("landing.howItWorks.setupTime", { defaultValue: "Guided setup for supported email providers" })}
            </p>
          </FadeUp>

          {/* Right — staggered steps */}
          <StaggerChildren className="lg:col-span-3 space-y-4" staggerDelay={0.12} baseDelay={0.1}>
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="group relative p-6 md:p-8 rounded-2xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)]"
              >
                {i < steps.length - 1 && (
                  <div className="absolute left-[2.1rem] md:left-[2.6rem] top-[4.5rem] bottom-[-1rem] w-[2px] bg-gradient-to-b from-primary/30 to-transparent" />
                )}
                <div className="flex gap-5 items-start">
                  <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                    <span className="font-display font-bold text-primary text-lg">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white mb-1.5">{step.title}</h3>
                    <p className="text-slate-200 leading-relaxed font-medium">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  );
}
