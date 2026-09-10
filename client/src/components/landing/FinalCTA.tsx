import { ArrowRight } from "lucide-react";
import FadeUp from "./FadeUp";
import { useTranslation } from "react-i18next";

export default function FinalCTA() {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.025_250)] via-[#0a1628] to-[#0a1628]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/4 rounded-full blur-[120px]" />

      <div className="container relative z-10 text-center">
        <FadeUp>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl text-white mb-5 max-w-3xl mx-auto leading-tight">
            {t("landing.finalCta.headlinePart1", {
              defaultValue: "Your inbox. Your reputation.",
            })}{" "}
            <span className="text-primary">
              {t("landing.finalCta.headlinePart2", {
                defaultValue: "Your growth.",
              })}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-200 font-medium max-w-xl mx-auto mb-8">
            {t("landing.finalCta.description", {
              defaultValue:
                "Free forever: 10 initial requests, then 5 more every rolling 30 days. No credit card required.",
            })}
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_50px_oklch(0.78_0.15_75/0.3)]"
          >
            {t("landing.finalCta.getStartedButton", {
              defaultValue: "Get Started Free",
            })}
            <ArrowRight size={20} />
          </a>
        </FadeUp>
      </div>
    </section>
  );
}
