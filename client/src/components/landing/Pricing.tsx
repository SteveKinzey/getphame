import { Check, ArrowRight, Sparkles } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try Phame with 10 review requests — no credit card required.",
    features: ["10 review requests", "Connect 1 email account", "Any review platform", "Email open tracking", "CSV import"],
    cta: "Start Free",
    popular: false,
    highlight: false,
  },
  {
    name: "Pro Monthly",
    price: "$29",
    period: "/mo",
    description: "Best for active businesses that send review requests weekly.",
    features: ["Unlimited review requests", "Bulk send in one click", "Follow-up reminders", "WooCommerce sync", "Priority support", "Advanced analytics"],
    cta: "Start Pro Monthly",
    popular: true,
    highlight: true,
  },
  {
    name: "Pro Annual",
    price: "$19",
    period: "/mo",
    description: "Best value for businesses committed to reputation growth.",
    features: ["Everything in Pro Monthly", "Billed annually ($228/yr)", "Save 34% vs monthly", "Priority support", "Early access to new features"],
    cta: "Start Pro Annual",
    popular: false,
    highlight: false,
    badge: "Save 34%",
  },
  {
    name: "Lifetime",
    price: "$349",
    period: " once",
    description: "One payment, lifetime access. No renewals, no surprises.",
    features: ["Everything in Pro", "Pay once, use forever", "All future updates included", "Priority support for life", "Perfect for agencies & operators"],
    cta: "Get Lifetime Access",
    popular: false,
    highlight: false,
    badge: "Best Deal",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <FadeUp className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            Honest pricing. No surprises.
          </h2>
          <p className="text-lg text-slate-200 font-medium max-w-2xl mx-auto">
            Start free. Upgrade when you're ready. Cancel anytime. No hidden fees.
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
                    Most Popular
                  </span>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
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
