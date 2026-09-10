import { Mail, Users, Globe } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Mail,
      title: t("landing.feature1.title", {
        defaultValue: "Your name. Your inbox. Their trust.",
      }),
      description: t("landing.feature1.description", {
        defaultValue:
          "Every review request is sent from the email account you connect and uses the sender name and signature you configure.",
      }),
      stat: t("landing.feature1.statValue", { defaultValue: "Your email" }),
      statLabel: t("landing.feature1.statLabel", {
        defaultValue: "sender identity",
      }),
    },
    {
      icon: Users,
      title: t("landing.feature2.title", {
        defaultValue: "Send personalized requests in bulk",
      }),
      description: t("landing.feature2.description", {
        defaultValue:
          "Import customers by CSV or WooCommerce sync, choose the recipients, and send personalized requests without copying each message manually.",
      }),
      stat: t("landing.feature2.statValue", { defaultValue: "Bulk" }),
      statLabel: t("landing.feature2.statLabel", {
        defaultValue: "personalized sending",
      }),
    },
    {
      icon: Globe,
      title: t("landing.feature3.title", {
        defaultValue: "Every platform. Your choice.",
      }),
      description: t("landing.feature3.description", {
        defaultValue:
          "Google, Yelp, TripAdvisor, Bing, Facebook, Trustpilot, and more. Paste your link, switch platforms anytime. One tool for all your review destinations.",
      }),
      stat: t("landing.feature3.statValue", { defaultValue: "Flexible" }),
      statLabel: t("landing.feature3.statLabel", {
        defaultValue: "review destinations",
      }),
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <FadeUp className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            {t("landing.whyItWorks", { defaultValue: "Why it works" })}
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            {t("landing.headline", {
              defaultValue: "From your inbox to their review",
            })}
          </h2>
          <p className="text-lg text-slate-200 font-medium">
            {t("landing.subHeadline", {
              defaultValue:
                "A simple way to send clear, personal review requests from the email account you connect.",
            })}
          </p>
        </FadeUp>

        <StaggerChildren
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
          staggerDelay={0.12}
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative p-8 rounded-2xl border border-[#1e3050] hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.78_0.15_75/0.08)] backdrop-blur-sm ${
                i === 0
                  ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.04_250)]"
                  : i === 1
                    ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.17_0.03_240)]"
                    : "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.035_260)]"
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
                <span className="font-display font-extrabold text-lg text-primary">
                  {feature.stat}
                </span>
                <span className="text-sm text-slate-300 font-semibold">
                  {feature.statLabel}
                </span>
              </div>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
