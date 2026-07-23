import { Mail, Users, Globe } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Mail,
      title: t("landing.feature1.title", { defaultValue: "Personal requests from a connected sender" }),
      description: t("landing.feature1.description", {
        defaultValue: "Each review request uses the sender details, business identity, and message you configure before sending.",
      }),
      stat: t("landing.feature1.stat", { defaultValue: "From you" }),
      statLabel: t("landing.feature1.statLabel", { defaultValue: "connected sender identity" }),
    },
    {
      icon: Users,
      title: t("landing.feature2.title", { defaultValue: "Import, review, then send" }),
      description: t("landing.feature2.description", {
        defaultValue: "Bring in contacts from CSV or WooCommerce, remove duplicates, review recipients, and choose each send deliberately.",
      }),
      stat: t("landing.feature2.stat", { defaultValue: "CSV + Woo" }),
      statLabel: t("landing.feature2.statLabel", { defaultValue: "supported contact sources" }),
    },
    {
      icon: Globe,
      title: t("landing.feature3.title", { defaultValue: "Platform-aware destinations" }),
      description: t("landing.feature3.description", {
        defaultValue: "Choose the supported review destination that fits each workflow, with compliance guidance for platforms such as Yelp.",
      }),
      stat: t("landing.feature3.stat", { defaultValue: "Flexible" }),
      statLabel: t("landing.feature3.statLabel", { defaultValue: "review destinations" }),
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <FadeUp className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            {t("landing.whyItWorks", { defaultValue: "How it stays controlled" })}
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            {t("landing.headline", { defaultValue: "From customer list to personal request" })}
          </h2>
          <p className="text-lg text-slate-200 font-medium">
            {t("landing.subHeadline", {
              defaultValue: "A focused workflow for preparing, sending, and tracking individual review requests—without awkward conversations or automatic outreach.",
            })}
          </p>
        </FadeUp>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8" staggerDelay={0.12}>
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative p-8 rounded-2xl border border-[#1e3050] hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.78_0.15_75/0.08)] backdrop-blur-sm ${
                i === 0 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.04_250)]" :
                i === 1 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.17_0.03_240)]" :
                "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.035_260)]"
              }`}
            >
              <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-200 leading-relaxed mb-6 font-medium">
                {feature.description}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-[#1e3050]">
                <span className="font-display font-extrabold text-lg text-primary">{feature.stat}</span>
                <span className="text-sm text-slate-300 font-semibold">{feature.statLabel}</span>
              </div>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
