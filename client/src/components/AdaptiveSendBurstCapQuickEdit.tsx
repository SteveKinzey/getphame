import { useEffect, useMemo, useState } from "react";
import { Gauge, Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { isAdministrativeProcedureMismatch } from "@/lib/adminProcedureRecovery";
import {
  ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
  ADAPTIVE_SEND_MINIMUM_BURST_CAP,
  DEFAULT_ADAPTIVE_SEND_BURST_CAPS,
  type AdaptiveSendBurstCaps,
} from "@shared/adaptiveSendLimits";

type BurstTier = keyof AdaptiveSendBurstCaps;

type TierDefinition = {
  key: BurstTier;
  label: string;
};

const tiers: readonly TierDefinition[] = [
  { key: "free", label: "Free" },
  { key: "pro", label: "Monthly" },
  { key: "annual", label: "Annual" },
  { key: "lifetime", label: "Life" },
] as const;

function asDraft(caps: AdaptiveSendBurstCaps): Record<BurstTier, string> {
  return {
    free: String(caps.free),
    pro: String(caps.pro),
    annual: String(caps.annual),
    lifetime: String(caps.lifetime),
  };
}

function parseCaps(
  draft: Record<BurstTier, string>
): AdaptiveSendBurstCaps | null {
  const values = Object.fromEntries(
    Object.entries(draft).map(([tier, value]) => [tier, Number(value)])
  ) as Record<BurstTier, number>;
  const valid = Object.values(values).every(
    value =>
      Number.isInteger(value) &&
      value >= ADAPTIVE_SEND_MINIMUM_BURST_CAP &&
      value <= ADAPTIVE_SEND_MAXIMUM_BURST_CAP
  );
  return valid ? values : null;
}

/** Compact administrator-only cap editor for the operations dashboard. */
export default function AdaptiveSendBurstCapQuickEdit() {
  const { t } = useTranslation("translation");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } =
    trpc.admin.getAdaptiveSendBurstCaps.useQuery(undefined, {
      staleTime: 30_000,
      retry: false,
    });
  const [draft, setDraft] = useState<Record<BurstTier, string>>(() =>
    asDraft(DEFAULT_ADAPTIVE_SEND_BURST_CAPS)
  );

  useEffect(() => {
    if (data) setDraft(asDraft(data));
  }, [data]);

  const parsed = useMemo(() => parseCaps(draft), [draft]);
  const changed = Boolean(
    data && parsed && tiers.some(tier => data[tier.key] !== parsed[tier.key])
  );
  const save = trpc.admin.updateAdaptiveSendBurstCaps.useMutation({
    onSuccess: async caps => {
      setDraft(asDraft(caps));
      await Promise.all([
        utils.admin.getAdaptiveSendBurstCaps.invalidate(),
        utils.admin.listAdaptiveSendBurstCapAudit.invalidate(),
        utils.contacts.getDailyStatus.invalidate(),
      ]);
      toast.success(
        t("adaptiveSending.adminCaps.quickEditSaved", {
          defaultValue: "Burst caps updated.",
        })
      );
    },
    onError: error => {
      if (isAdministrativeProcedureMismatch(error)) return;
      toast.error(
        t("adaptiveSending.adminCaps.quickEditError", {
          defaultValue: "The burst caps could not be updated. Try again.",
        })
      );
    },
  });

  return (
    <section
      className="rounded-2xl border bg-white p-4 shadow-sm"
      style={{ borderColor: "oklch(0.88 0.03 260)" }}
      aria-labelledby="admin-burst-cap-quick-edit-title"
      data-testid="admin-burst-cap-quick-edit"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl rr-bg-navy text-white">
            <Gauge size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
              {t("adaptiveSending.adminCaps.quickEditEyebrow", {
                defaultValue: "Sending safety",
              })}
            </p>
            <h2
              id="admin-burst-cap-quick-edit-title"
              className="mt-0.5 text-xl font-black rr-text-navy"
            >
              {t("adaptiveSending.adminCaps.quickEditTitle", {
                defaultValue: "Quick-edit burst caps",
              })}
            </h2>
            <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
              {t("adaptiveSending.adminCaps.quickEditDescription", {
                defaultValue:
                  "Update the maximum review requests a single bulk action may initiate. Provider and account limits still apply.",
              })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings#adaptive-send-burst-cap-settings")}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-black rr-text-navy transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          style={{ borderColor: "oklch(0.84 0.04 260)" }}
        >
          <Settings2 size={15} aria-hidden="true" />
          {t("adaptiveSending.adminCaps.quickEditFullSettings", {
            defaultValue: "Full settings",
          })}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold rr-text-navy-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {t("adaptiveSending.adminCaps.quickEditLoading", {
            defaultValue: "Loading current caps…",
          })}
        </p>
      ) : isError ? (
        <div
          className="mt-4 rounded-xl border px-3 py-3 text-sm font-semibold"
          style={{
            borderColor: "oklch(0.82 0.12 80)",
            background: "oklch(0.98 0.025 80)",
            color: "oklch(0.36 0.08 60)",
          }}
          role="status"
        >
          <p>
            {t("adaptiveSending.adminCaps.quickEditUnavailable", {
              defaultValue:
                "Burst-cap controls are updating. Your existing limits remain active.",
            })}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 min-h-9 rounded-lg bg-white px-2.5 text-xs font-black rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {t("adaptiveSending.adminCaps.auditRetry", {
              defaultValue: "Retry",
            })}
          </button>
        </div>
      ) : (
        <form
          className="mt-4"
          onSubmit={event => {
            event.preventDefault();
            if (parsed) save.mutate(parsed);
          }}
        >
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {tiers.map(({ key, label }) => (
              <label
                key={key}
                htmlFor={`admin-quick-burst-cap-${key}`}
                className="rounded-xl border p-2.5"
                style={{ borderColor: "oklch(0.90 0.02 260)" }}
              >
                <span className="block text-xs font-black rr-text-navy">
                  {label}
                </span>
                <input
                  id={`admin-quick-burst-cap-${key}`}
                  name={`adminQuickBurstCap${key[0].toUpperCase()}${key.slice(1)}`}
                  type="number"
                  inputMode="numeric"
                  min={ADAPTIVE_SEND_MINIMUM_BURST_CAP}
                  max={ADAPTIVE_SEND_MAXIMUM_BURST_CAP}
                  step={1}
                  value={draft[key]}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="mt-1.5 min-h-10 w-full rounded-lg border bg-white px-2 text-sm font-black rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  style={{ borderColor: "oklch(0.84 0.04 260)" }}
                  aria-label={t("adaptiveSending.adminCaps.quickEditInput", {
                    defaultValue: "{{tier}} burst cap",
                    tier: label,
                  })}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold rr-text-navy-muted">
              {t("adaptiveSending.adminCaps.quickEditRange", {
                defaultValue: "Whole-number limits from {{min}} to {{max}}.",
                min: ADAPTIVE_SEND_MINIMUM_BURST_CAP,
                max: ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
              })}
            </p>
            <button
              type="submit"
              disabled={!parsed || !changed || save.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.isPending ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              {save.isPending
                ? t("adaptiveSending.adminCaps.saving", {
                    defaultValue: "Saving…",
                  })
                : t("adaptiveSending.adminCaps.quickEditSave", {
                    defaultValue: "Apply caps",
                  })}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
