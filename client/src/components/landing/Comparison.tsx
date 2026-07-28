import { Check, X } from "lucide-react";
import FadeUp from "./FadeUp";
import { useTranslation } from "react-i18next";



export default function Comparison() {
  const { t } = useTranslation();

  const competitors = [
    { name: "Get Phame", price: t("landing.comparison.getPhamePrice", { defaultValue: "$29/mo" }), lifetime: true, highlight: true },
    { name: "Birdeye", price: t("landing.comparison.birdeyePrice", { defaultValue: "$299/mo" }), lifetime: false, highlight: false },
    { name: "Podium", price: t("landing.comparison.podiumPrice", { defaultValue: "$249/mo" }), lifetime: false, highlight: false },
    { name: "NiceJob", price: t("landing.comparison.niceJobPrice", { defaultValue: "$75/mo" }), lifetime: false, highlight: false },
    { name: "Grade.us", price: t("landing.comparison.gradeUsPrice", { defaultValue: "$110/mo" }), lifetime: false, highlight: false },
    { name: "ReviewTrackers", price: t("landing.comparison.reviewTrackersPrice", { defaultValue: "$89/mo" }), lifetime: false, highlight: false },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeUp>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("landing.comparison.compare", { defaultValue: "Compare" })}</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              {t("landing.comparison.enterpriseFeaturesStartupPrice", { defaultValue: "Enterprise features. Startup price." })}
            </h2>
            <p className="text-lg text-slate-200 font-medium mb-6">
              {t("landing.comparison.description", { defaultValue: "The big players charge $250–$300/month for review request tools. Get Phame gives you the same core capability at a fraction of the cost. Plus a lifetime option they'll never offer." })}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/15">
              <span className="font-display font-extrabold text-2xl text-primary">10–20×</span>
              <span className="text-sm text-white font-medium font-semibold">{t("landing.comparison.cheaperThanAlternatives", { defaultValue: "cheaper than enterprise alternatives" })}</span>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="hidden md:block rounded-2xl border border-[#1e3050] overflow-hidden bg-[#0f1d32]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e3050]">
                    <th className="text-left p-4 text-sm font-bold text-white uppercase tracking-wider">{t("landing.comparison.platformHeader", { defaultValue: "Platform" })}</th>
                    <th className="text-left p-4 text-sm font-bold text-white uppercase tracking-wider">{t("landing.comparison.startingPriceHeader", { defaultValue: "Starting Price" })}</th>
                    <th className="text-center p-4 text-sm font-bold text-white uppercase tracking-wider">{t("landing.comparison.lifetimeHeader", { defaultValue: "Lifetime" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((comp) => (
                    <tr key={comp.name} className={`border-t border-[#1a2744] ${comp.highlight ? "bg-primary/5" : ""}`}>
                      <td className="p-4">
                        <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-white"}`}>{comp.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-white font-medium"}`}>{comp.price}</span>
                      </td>
                      <td className="p-4 text-center">
                        {comp.lifetime ? (
                          <Check size={18} className="text-emerald-400 mx-auto" />
                        ) : (
                          <X size={18} className="text-red-400/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {competitors.map((comp) => (
                <div key={comp.name} className={`flex items-center justify-between p-4 rounded-xl border ${comp.highlight ? "bg-primary/5 border-primary/30" : "bg-[#0f1d32] border-[#1e3050]"}`}>
                  <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-white"}`}>{comp.name}</span>
                  <span className={`font-semibold text-sm ${comp.highlight ? "text-primary" : "text-slate-300"}`}>{comp.price}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-300 font-medium mt-4">
              {t("landing.comparison.pricingDisclaimer", { defaultValue: "Prices based on publicly listed entry-tier plans as of April 2026. Subject to change." })}
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
