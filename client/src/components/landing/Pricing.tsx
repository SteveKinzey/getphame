import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { THB_DISPLAY, USD_ANNUAL_SAVINGS_PERCENT, USD_DISPLAY } from "@shared/pricing";
import FadeUp, { StaggerChildren } from "./FadeUp";

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const isThai = i18n.language.toLowerCase().startsWith("th");
  const displayPrices = isThai ? THB_DISPLAY : USD_DISPLAY;

  const plans = [
    {
      name: t("landing.pricing.free.name", { defaultValue: "Free" }),
      price: "$0",
      period: "",
      description: t("landing.pricing.free.description", { defaultValue: "Start with 10 review requests, then get 5 more every rolling 30 days — no credit card required." }),
      features: [
        t("landing.pricing.free.features.requests", { defaultValue: "10 initial requests + 5 every rolling 30 days" }),
        t("landing.pricing.free.features.email", { defaultValue: "Connect 1 email account" }),
        t("landing.pricing.free.features.platform", { defaultValue: "Any review platform" }),
        t("landing.pricing.free.features.tracking", { defaultValue: "Email open tracking" }),
        t("landing.pricing.free.features.import", { defaultValue: "CSV import" }),
      ],
      cta: t("landing.pricing.free.cta", { defaultValue: "Start Free" }),
      popular: false,
      highlight: false,
    },
    {
      name: t("landing.pricing.proMonthly.name", { defaultValue: "Pro Monthly" }),
      price: displayPrices.monthly,
      period: t("landing.pricing.proMonthly.period", { defaultValue: isThai ? "/เดือน" : "/mo" }),
      description: t("landing.pricing.proMonthly.description", { defaultValue: "Best for active businesses that send review requests weekly." }),
      features: [
        t("landing.pricing.proMonthly.features.requests", { defaultValue: "Unlimited review requests" }),
        t("landing.pricing.proMonthly.features.bulk", { defaultValue: "Bulk send in one click" }),
        t("landing.pricing.proMonthly.features.reminders", { defaultValue: "Follow-up reminders" }),
        t("landing.pricing.proMonthly.features.woocommerce", { defaultValue: "WooCommerce sync" }),
        t("landing.pricing.proMonthly.features.support", { defaultValue: "Priority support" }),
        t("landing.pricing.proMonthly.features.analytics", { defaultValue: "Advanced analytics" }),
      ],
      cta: t("landing.pricing.proMonthly.cta", { defaultValue: "Start Pro Monthly" }),
      popular: true,
      highlight: true,
    },
    {
      name: t("landing.pricing.proAnnual.name", { defaultValue: "Pro Annual" }),
      price: displayPrices.annual,
      period: t("landing.pricing.proAnnual.period", { defaultValue: isThai ? "/ปี" : "/yr" }),
      description: t("landing.pricing.proAnnual.description", { defaultValue: "Best value for businesses committed to reputation growth." }),
      features: [
        t("landing.pricing.proAnnual.features.everything", { defaultValue: "Everything in Pro Monthly" }),
        t("landing.pricing.proAnnual.features.billed", { defaultValue: isThai ? "เรียกเก็บเงิน ฿9,990 ต่อปี" : "Billed annually ($290/yr)" }),
        t("landing.pricing.proAnnual.features.save", { defaultValue: isThai ? "ประหยัด 14% เมื่อเทียบกับรายเดือน" : `Save ${USD_ANNUAL_SAVINGS_PERCENT}% vs monthly` }),
        t("landing.pricing.proAnnual.features.support", { defaultValue: "Priority support" }),
        t("landing.pricing.proAnnual.features.earlyAccess", { defaultValue: "Early access to new features" }),
      ],
      cta: t("landing.pricing.proAnnual.cta", { defaultValue: "Start Pro Annual" }),
      popular: false,
      highlight: false,
      badge: t("landing.pricing.proAnnual.badge", { defaultValue: isThai ? "ประหยัด 14%" : `Save ${USD_ANNUAL_SAVINGS_PERCENT}%` }),
    },
    {
      name: t("landing.pricing.lifetime.name", { defaultValue: "Lifetime" }),
      price: displayPrices.lifetime,
      period: t("landing.pricing.lifetime.period", { defaultValue: " once" }),
      description: t("landing.pricing.lifetime.description", { defaultValue: "One payment, lifetime access. No renewals, no surprises." }),
      features: [
        t("landing.pricing.lifetime.features.everything", { defaultValue: "Everything in Pro" }),
        t("landing.pricing.lifetime.features.payOnce", { defaultValue: "Pay once, use forever" }),
        t("landing.pricing.lifetime.features.updates", { defaultValue: "All future updates included" }),
        t("landing.pricing.lifetime.features.support", { defaultValue: "Priority support for life" }),
        t("landing.pricing.lifetime.features.agencies", { defaultValue: "Perfect for agencies & operators" }),
      ],
      cta: t("landing.pricing.lifetime.cta", { defaultValue: "Get Lifetime Access" }),
      popular: false,
      highlight: false,
      badge: t("landing.pricing.lifetime.badge", { defaultValue: "Best Deal" }),
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <FadeUp className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("landing.pricing.sectionTitle", { defaultValue: "Pricing" })}</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            {t("landing.pricing.headline", { defaultValue: "Honest pricing. No surprises." })}
          </h2>
          <p className="text-lg text-slate-200 font-medium max-w-2xl mx-auto">
            {t("landing.pricing.subtitle", { defaultValue: "Start free. Upgrade when you're ready. Cancel anytime. No hidden fees." })}
          </p>
        </FadeUp>

        <StaggerChildren className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6" staggerDelay={0.1}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-6 lg:p-7 rounded-2xl border transition-all duration-300 ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#0f1d32] to-[oklch(0.16_0.04_250)] border-primary/50 shadow-[0_0_50px_oklch(0.78_0.15_75/0.12)] scale-[1.02]"
                  : "bg-[#0f1d32] border-[#1e3050] hover:border-primary/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-[0_0_15px_oklch(0.78_0.15_75/0.4)]">
                    <Sparkles size={11} />
                    {t("landing.pricing.mostPopular", { defaultValue: "Most Popular" })}
                  </span>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-[0_0_15px_oklch(0.78_0.15_75/0.4)]">
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="mb-5 pt-2">
                <h3 className="font-display font-bold text-lg text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-display font-extrabold text-4xl text-primary">{plan.price}</span>
                  <span className="text-slate-200 text-sm font-bold">{plan.period}</span>
                </div>
                <p className="text-sm text-white font-medium font-medium mt-2">{plan.description}</p>
              </div>
              <ul className="flex-1 space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white font-medium">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/onboarding"
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.97] ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_20px_oklch(0.78_0.15_75/0.2)]"
                    : "bg-[#1a2744] text-white border border-[#2a3a5c] hover:border-primary/30 hover:text-white"
                }`}
              >
                {plan.cta}
                <ArrowRight size={15} />
              </a>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
