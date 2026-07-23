import { ArrowRight, BarChart3, Mail, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import FadeUp, { StaggerChildren } from "./FadeUp";

export default function Testimonials() {
  const { t } = useTranslation();

  const capabilities = [
    {
      icon: Mail,
      label: t("landing.testimonials.email.label", { defaultValue: "Connected email" }),
      title: t("landing.testimonials.email.title", { defaultValue: "Send from an account you connect" }),
      description: t("landing.testimonials.email.description", { defaultValue: "Create individualized requests with the business identity, sender details, and message you configure." }),
    },
    {
      icon: ShieldCheck,
      label: t("landing.testimonials.control.label", { defaultValue: "Recipient control" }),
      title: t("landing.testimonials.control.title", { defaultValue: "You choose every customer" }),
      description: t("landing.testimonials.control.description", { defaultValue: "Add or import contacts, review each recipient, and send only when you decide. Get Phame does not message contacts automatically." }),
    },
    {
      icon: BarChart3,
      label: t("landing.testimonials.activity.label", { defaultValue: "Action visibility" }),
      title: t("landing.testimonials.activity.title", { defaultValue: "Track request activity" }),
      description: t("landing.testimonials.activity.description", { defaultValue: "See send, open, click, reminder, and completion status in one workspace without inventing customer outcomes." }),
    },
  ];
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/4 rounded-full blur-[80px]" />

      <div className="container relative z-10">
        <FadeUp className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("landing.testimonials.proofLabel", { defaultValue: "Product proof" })}</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            {t("landing.testimonials.headline", { defaultValue: "What Get Phame is built to do" })}
          </h2>
          <p className="text-lg text-slate-200 font-medium">
            {t("landing.testimonials.subtitle", { defaultValue: "Capabilities you can verify in the app—without unverified customer claims or outcome promises." })}
          </p>
        </FadeUp>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12" staggerDelay={0.13}>
          {capabilities.map((capability, i) => {
            const Icon = capability.icon;
            return (
            <div
              key={capability.label}
              className={`relative p-6 md:p-8 rounded-2xl backdrop-blur-sm border border-[#1e3050] hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)] ${
                i === 0 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.04_250/0.8)]" :
                i === 1 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.17_0.03_240/0.8)]" :
                "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.035_260/0.8)]"
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl rounded-tr-2xl" />
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <Icon size={21} className="text-primary" aria-hidden="true" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{capability.label}</p>
              <h3 className="font-display font-bold text-xl text-white mb-3">{capability.title}</h3>
              <p className="text-slate-200 leading-relaxed text-sm md:text-[15px] font-medium">{capability.description}</p>
            </div>
            );
          })}
        </StaggerChildren>

        <FadeUp className="text-center">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.2)]"
          >
            {t("landing.testimonials.getStartedFree", { defaultValue: "Explore Get Phame Free" })}
            <ArrowRight size={18} />
          </a>
        </FadeUp>
      </div>
    </section>
  );
}
