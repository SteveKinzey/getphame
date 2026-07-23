import { BellOff, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import FadeUp from "./FadeUp";

export default function SocialProofBar() {
  const { t } = useTranslation();

  const safeguards = [
    {
      icon: LockKeyhole,
      title: t("landing.socialProofBar.safeguards.privacy.title", { defaultValue: "Privacy first" }),
      description: t("landing.socialProofBar.safeguards.privacy.description", { defaultValue: "Only the customer details needed for a request you choose are used in the send workflow." }),
    },
    {
      icon: UserCheck,
      title: t("landing.socialProofBar.safeguards.consent.title", { defaultValue: "Consent aware" }),
      description: t("landing.socialProofBar.safeguards.consent.description", { defaultValue: "Contacts are not added or messaged automatically. You control who receives each request." }),
    },
    {
      icon: ShieldCheck,
      title: t("landing.socialProofBar.safeguards.compliance.title", { defaultValue: "Compliance guidance" }),
      description: t("landing.socialProofBar.safeguards.compliance.description", { defaultValue: "Platform-aware guidance is available before sending individual review requests." }),
    },
    {
      icon: BellOff,
      title: t("landing.socialProofBar.safeguards.reminders.title", { defaultValue: "Reminder control" }),
      description: t("landing.socialProofBar.safeguards.reminders.description", { defaultValue: "Future reminders stop when the requested customer action is completed." }),
    },
  ];

  return (
    <section className="py-14 md:py-16 bg-[oklch(0.14_0.04_255)]">
      <div className="container">
        <FadeUp className="text-center mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            {t("landing.socialProofBar.heading", { defaultValue: "Built-in workflow safeguards" })}
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {safeguards.map((safeguard) => {
            const Icon = safeguard.icon;
            return (
            <FadeUp key={safeguard.title}>
              <div className="flex flex-col h-full p-5 rounded-xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/25 transition-colors duration-300">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{safeguard.title}</h3>
                <p className="text-sm text-slate-200 font-medium leading-relaxed flex-1">{safeguard.description}</p>
              </div>
            </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
