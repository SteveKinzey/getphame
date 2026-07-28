import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function Stats() {
  const { t } = useTranslation();

  const stats = [
    { value: t("landing.stats.individualOutreachValue", { defaultValue: "Individual" }), label: t("landing.stats.moreReviewsLabel", { defaultValue: "customer outreach" }) },
    { value: t("landing.stats.setupValue", { defaultValue: "Guided" }), label: t("landing.stats.averageSetupTimeLabel", { defaultValue: "setup and onboarding" }) },
    { value: t("landing.stats.emailsSentValue", { defaultValue: "Your inbox" }), label: t("landing.stats.emailsSentLabel", { defaultValue: "emails sent from your own address" }) },
    { value: t("landing.stats.followUpValue", { defaultValue: "Automatic" }), label: t("landing.stats.averageResponseRateLabel", { defaultValue: "reminders stop after customer action" }) },
  ];

  const industries = [
    t("landing.stats.industryPhotographers", { defaultValue: "Photographers" }),
    t("landing.stats.industryCafesRestaurants", { defaultValue: "Cafés & Restaurants" }),
    t("landing.stats.industryHomeServices", { defaultValue: "Home Services" }),
    t("landing.stats.industryClinicsSalons", { defaultValue: "Clinics & Salons" }),
    t("landing.stats.industryAgencies", { defaultValue: "Agencies" }),
    t("landing.stats.industryWooCommerceStores", { defaultValue: "WooCommerce Stores" }),
  ];

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />

      <div className="container relative z-10">
        <FadeUp className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
            {t("landing.stats.heading", { defaultValue: "Built for businesses that run on reputation" })}
          </h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-200 font-bold">
            {industries.map((ind, i) => (
              <span key={ind} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#2a3a5c]">·</span>}
                {ind}
              </span>
            ))}
          </div>
        </FadeUp>

        <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6" staggerDelay={0.1}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 md:p-8 rounded-2xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/20 transition-colors duration-300">
              <div className="font-display max-w-full break-words font-extrabold text-base leading-tight text-primary mb-2 min-[350px]:text-lg lg:text-2xl xl:text-3xl">
                {stat.value}
              </div>
              <p className="text-sm text-slate-200 font-bold">{stat.label}</p>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
