import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import FadeUp from "./FadeUp";

function Stars() {
  return (
    <div className="flex gap-0.5 mb-2">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={12} className="text-primary fill-primary" />
      ))}
    </div>
  );
}

export default function SocialProofBar() {
  const { t } = useTranslation();

  const reviews = [
    {
      quote: t("landing.socialProofBar.reviews.sarah.quote", { defaultValue: "Went from 12 to 47 Google reviews in 6 weeks. Customers actually respond because it comes from my real email." }),
      name: "Sarah M.",
      role: t("landing.socialProofBar.reviews.sarah.role", { defaultValue: "Freelance Photographer" }),
      initials: "SM",
    },
    {
      quote: t("landing.socialProofBar.reviews.tom.quote", { defaultValue: "I import Friday's regulars, hit send, and wake up Monday to 8–10 new reviews. It's part of our weekly routine now." }),
      name: "Tom R.",
      role: t("landing.socialProofBar.reviews.tom.role", { defaultValue: "The Corner Café" }),
      initials: "TR",
    },
    {
      quote: t("landing.socialProofBar.reviews.david.quote", { defaultValue: "Managing 12 client locations from one account. The lifetime deal paid for itself in the first month." }),
      name: "David K.",
      role: t("landing.socialProofBar.reviews.david.role", { defaultValue: "Marketing Agency Owner" }),
      initials: "DK",
    },
    {
      quote: t("landing.socialProofBar.reviews.lisa.quote", { defaultValue: "Set it up in under 2 minutes. My open rate is 68% — way better than any review platform I've tried." }),
      name: "Lisa P.",
      role: t("landing.socialProofBar.reviews.lisa.role", { defaultValue: "Yoga Studio Owner" }),
      initials: "LP",
    },
  ];

  return (
    <section className="py-14 md:py-16 bg-[oklch(0.14_0.04_255)]">
      <div className="container">
        <FadeUp className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            {t("landing.socialProofBar.trustedBy", { defaultValue: "Trusted by local business owners" })}
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.map((r) => (
            <FadeUp key={r.name}>
              <div className="flex flex-col h-full p-5 rounded-xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/25 transition-colors duration-300">
                <Stars />
                <p className="text-sm text-slate-200 font-medium leading-relaxed flex-1 mb-4">
                  "{r.quote}"
                </p>
                <div className="flex items-center gap-2.5 pt-3 border-t border-[#1e3050]">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{r.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{r.role}</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
