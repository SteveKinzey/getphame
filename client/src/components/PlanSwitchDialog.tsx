import { ArrowRight, CalendarClock, CreditCard, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RecurringPlan = "monthly" | "annual";

interface PlanSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: RecurringPlan;
  onConfirm: () => void;
  isPending?: boolean;
}

const PLAN_DETAILS: Record<
  RecurringPlan,
  { label: string; price: string; cadence: string }
> = {
  monthly: { label: "Monthly", price: "$29", cadence: "per month" },
  annual: { label: "Annual", price: "$290", cadence: "per year" },
};

export default function PlanSwitchDialog({
  open,
  onOpenChange,
  currentPlan,
  onConfirm,
  isPending = false,
}: PlanSwitchDialogProps) {
  const { t } = useTranslation();
  const targetPlan: RecurringPlan =
    currentPlan === "monthly" ? "annual" : "monthly";
  const current = PLAN_DETAILS[currentPlan];
  const target = PLAN_DETAILS[targetPlan];

  const handleConfirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl rr-bg-gold">
            <CreditCard size={20} className="rr-text-navy" />
          </div>
          <AlertDialogTitle className="rr-text-navy">
            {t("paidUser.switchConfirm.title", {
              defaultValue: "Switch from {{current}} to {{target}}?",
              current: current.label,
              target: target.label,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription className="rr-text-navy-mid">
            {t("paidUser.switchConfirm.description", {
              defaultValue:
                "Review the billing-cycle change before continuing to Stripe.",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className="my-2 rounded-xl border p-4"
          style={{
            borderColor: "oklch(0.88 0.03 260)",
            background: "oklch(0.975 0.004 100)",
          }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider rr-text-navy-muted">
                {t("paidUser.switchConfirm.currentPlan", {
                  defaultValue: "Current plan",
                })}
              </p>
              <p className="mt-1 font-black rr-text-navy">{current.label}</p>
              <p className="text-xs font-semibold rr-text-navy-mid">
                {current.price} {current.cadence}
              </p>
            </div>
            <ArrowRight size={18} className="rr-text-gold" aria-hidden="true" />
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider rr-text-navy-muted">
                {t("paidUser.switchConfirm.newPlan", {
                  defaultValue: "New plan",
                })}
              </p>
              <p className="mt-1 font-black rr-text-navy">{target.label}</p>
              <p className="text-xs font-semibold rr-text-navy-mid">
                {target.price} {target.cadence}
              </p>
            </div>
          </div>
        </div>

        {targetPlan === "annual" && (
          <p
            className="rounded-xl px-3 py-2 text-sm font-bold rr-text-navy"
            style={{ background: "oklch(0.96 0.06 145)" }}
          >
            {t("paidUser.switchConfirm.savings", {
              defaultValue:
                "Annual billing saves $58 per year compared with Monthly.",
            })}
          </p>
        )}

        <div
          className="flex items-start gap-2 rounded-xl px-3 py-3"
          style={{ background: "oklch(0.96 0.025 260)" }}
        >
          <CalendarClock
            size={16}
            className="mt-0.5 shrink-0 rr-text-gold"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold leading-relaxed rr-text-navy-mid">
            {t("paidUser.switchConfirm.timing", {
              defaultValue:
                "Stripe will show the exact effective date and any prorated charge or credit before you approve the change.",
            })}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("paidUser.switchConfirm.cancel", {
              defaultValue: "Keep {{plan}}",
              plan: current.label,
            })}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="rr-bg-gold rr-text-navy font-black"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {t("paidUser.switchConfirm.continue", {
              defaultValue: "Continue to Stripe",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
