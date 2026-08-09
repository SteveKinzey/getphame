import { useSyncExternalStore } from "react";
import { ArrowRight, CalendarDays, Crown, Send, Sparkles, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  closeUpgradeModal,
  getUpgradeModalServerSnapshot,
  getUpgradeModalSnapshot,
  subscribeToUpgradeModal,
  type PremiumFeatureKey,
} from "@/lib/upgradeModal";

const FEATURE_ICONS: Record<PremiumFeatureKey, typeof Crown> = {
  send_limit: Send,
  koalendar: CalendarDays,
  bulk_sender: Zap,
  plans: Sparkles,
};

const FEATURE_DEFAULTS: Record<PremiumFeatureKey, {
  title: string;
  description: string;
  benefits: [string, string, string];
}> = {
  send_limit: {
    title: "Keep sending review requests",
    description: "Your free allowance protects a simple starting workflow. A paid plan removes the Get Phame plan limit when you are ready to continue.",
    benefits: [
      "Send unlimited individual review requests",
      "Connect Bulk Sender for higher-volume delivery",
      "Import completed Koalendar bookings automatically",
    ],
  },
  koalendar: {
    title: "Turn completed bookings into contacts",
    description: "Connect Koalendar with a private webhook and automatically add eligible invitees after each meeting ends.",
    benefits: [
      "Create a private webhook for your account",
      "Import eligible completed bookings into Saved Contacts",
      "Track recent booking import status in Get Phame",
    ],
  },
  bulk_sender: {
    title: "Unlock higher-volume delivery",
    description: "Connect a supported transactional SMTP relay while Get Phame keeps provider-aware safety controls in place.",
    benefits: [
      "Connect a verified transactional SMTP relay",
      "Use adaptive provider-aware sending limits",
      "Keep Bulk Sender separate from your personal connection",
    ],
  },
  plans: {
    title: "Choose the plan that fits your workflow",
    description: "Compare the free plan with paid access before deciding. Your current work stays in place while you review the options.",
    benefits: [
      "Unlimited individual review requests",
      "Bulk Sender connection for higher-volume delivery",
      "Automatic Koalendar contact imports",
    ],
  },
};

export default function PremiumUpgradeModal() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const state = useSyncExternalStore(
    subscribeToUpgradeModal,
    getUpgradeModalSnapshot,
    getUpgradeModalServerSnapshot,
  );
  const defaults = FEATURE_DEFAULTS[state.featureKey];
  const Icon = FEATURE_ICONS[state.featureKey];
  const featurePath = `premiumConversion.features.${state.featureKey}`;

  const comparePlans = () => {
    const featureKey = state.featureKey;
    closeUpgradeModal();
    navigate(`/pricing?feature=${featureKey}`);
  };

  return (
    <Dialog open={state.open} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeUpgradeModal();
    }}>
      <DialogContent
        data-testid="premium-upgrade-modal"
        showCloseButton={false}
        className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-3xl border-white/15 bg-navy p-0 text-white motion-reduce:animate-none sm:max-w-lg"
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" aria-hidden="true" />
          <button
            type="button"
            onClick={closeUpgradeModal}
            aria-label={t("premiumConversion.modal.closeLabel", { defaultValue: "Close upgrade details" })}
            className="absolute right-4 top-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-[transform,background-color] duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="mb-5 flex items-center gap-2 pr-12" aria-label="GET PHAME" translate="no">
            <img src="https://assets.getphame.app/getphame-logo.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl" />
            <span className="text-sm font-black tracking-[0.16em] text-white">GET <span className="rr-text-gold">PHAME</span></span>
          </div>

          <DialogHeader className="gap-3 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] rr-text-gold">
              <Crown size={15} aria-hidden="true" />
              {t("premiumConversion.modal.eyebrow", { defaultValue: "Premium feature" })}
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-11 w-11 flex-none place-items-center rounded-2xl bg-amber-200/10 rr-text-gold" aria-hidden="true">
                <Icon size={21} />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-black leading-tight text-white sm:text-3xl">
                  {t(`${featurePath}.title`, { defaultValue: defaults.title })}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm font-semibold leading-relaxed text-white/75 sm:text-base">
                  {t(`${featurePath}.description`, { defaultValue: defaults.description })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ul className="mt-5 grid gap-2.5" aria-label={t("premiumConversion.modal.benefitsLabel", { defaultValue: "Paid plan benefits" })}>
            {(["one", "two", "three"] as const).map((benefitKey, index) => (
              <li key={benefitKey} className="flex items-start gap-3 rounded-2xl bg-white/[0.07] px-3.5 py-3 text-sm font-bold leading-snug text-white">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-amber-200/10 rr-text-gold" aria-hidden="true">
                  <ArrowRight size={14} />
                </span>
                <span>{t(`${featurePath}.benefits.${benefitKey}`, { defaultValue: defaults.benefits[index] })}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={comparePlans}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-black rr-bg-gold rr-text-navy transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            {t("premiumConversion.modal.comparePlans", { defaultValue: "Compare free and premium" })}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-black text-white/80 transition-[transform,color] duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            {t("premiumConversion.modal.notNow", { defaultValue: "Not now" })}
          </button>
          <p className="mt-2 text-center text-xs font-semibold leading-relaxed text-white/55">
            {t("premiumConversion.modal.contextHint", { defaultValue: "You can compare plans without losing the page you were working on." })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
