import FadeUp, { StaggerChildren } from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function Stats() {
  const { t } = useTranslation();
  const stats = [
    { value: "10\u00d7", label: t("stats.stat1Label", { defaultValue: "more reviews vs. asking in person" }) },
    { value: "< 2 min", label: t("stats.stat2Label", { defaultValue: "average setup time" }) },
    { value: t("stats.stat3Value", { defaultValue: "Your inbox" }), label: t("stats.stat3Label", { defaultValue: "emails sent from your own address" }) },
    { value: "42%", label: t("stats.stat4Label", { defaultValue: "average response rate" }) },
  ];
  const industries = [
    t("stats.industry1", { defaultValue: "Photographers" }),
    t("stats.industry2", { defaultValue: "Cafés & Restaurants" }),
    t("stats.industry3", { defaultValue: "Home Services" }),
    t("stats.industry4", { defaultValue: "Clinics & Salons" }),
    t("stats.industry5", { defaultValue: "Agencies" }),
    t("stats.industry6", { defaultValue: "WooCommerce Stores" }),
  ];

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />

      <div className="container relative z-10">
        <FadeUp className="text-center mb-10">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
            {t("stats.title", { defaultValue: "Built for businesses that run on reputation" })}
          </h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-200 font-bold">
            {industries.map((ind, i) => (
              <span key={ind} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#2a3a5c]">\u00b7</span>}
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
