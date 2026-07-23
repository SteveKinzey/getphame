import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function Stats() {
  const { t } = useTranslation();

  const stats = [
    { value: t("landing.stats.recipientControlValue", { defaultValue: "You choose" }), label: t("landing.stats.recipientControlLabel", { defaultValue: "every request recipient" }) },
    { value: t("landing.stats.individualValue", { defaultValue: "1-to-1" }), label: t("landing.stats.individualLabel", { defaultValue: "individual review-request outreach" }) },
    { value: t("landing.stats.connectedEmailValue", { defaultValue: "Your inbox" }), label: t("landing.stats.connectedEmailLabel", { defaultValue: "send from an account you connect" }) },
    { value: t("landing.stats.reminderValue", { defaultValue: "Automatic" }), label: t("landing.stats.reminderLabel", { defaultValue: "future reminders stop after completion" }) },
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
            {t("landing.stats.heading", { defaultValue: "Control at every step" })}
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
              <div className="font-display font-extrabold text-3xl md:text-4xl text-primary mb-2">
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
