import { useEffect, useMemo, useState } from "react";
import { Gauge, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
  ADAPTIVE_SEND_MINIMUM_BURST_CAP,
  DEFAULT_ADAPTIVE_SEND_BURST_CAPS,
  type AdaptiveSendBurstCaps,
} from "@shared/adaptiveSendLimits";

type Props = { isAdmin: boolean };

type BurstTier = keyof AdaptiveSendBurstCaps;

const tiers: Array<{ key: BurstTier; label: string; detail: string }> = [
  { key: "free", label: "Free", detail: "Free workspaces" },
  { key: "pro", label: "Monthly", detail: "Monthly Pro workspaces" },
  { key: "annual", label: "Annual", detail: "Annual Pro workspaces" },
  { key: "lifetime", label: "Life", detail: "Life workspaces" },
];

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

/** Global administrator-only caps for each bulk-send initiation. */
export default function AdaptiveSendBurstCapSettings({ isAdmin }: Props) {
  const { t } = useTranslation("translation");
  const utils = trpc.useUtils();
  const { data, isLoading, isError } =
    trpc.admin.getAdaptiveSendBurstCaps.useQuery(undefined, {
      enabled: isAdmin,
      staleTime: 30_000,
    });
  const [draft, setDraft] = useState<Record<BurstTier, string>>(() =>
    asDraft(DEFAULT_ADAPTIVE_SEND_BURST_CAPS)
  );

  useEffect(() => {
    if (data) setDraft(asDraft(data));
  }, [data]);

  const parsed = useMemo(() => parseCaps(draft), [draft]);
  const changed = Boolean(
    data && parsed && tiers.some(tier => parsed[tier.key] !== data[tier.key])
  );
  const save = trpc.admin.updateAdaptiveSendBurstCaps.useMutation({
    onSuccess: async caps => {
      setDraft(asDraft(caps));
      await Promise.all([
        utils.admin.getAdaptiveSendBurstCaps.invalidate(),
        utils.contacts.getDailyStatus.invalidate(),
      ]);
      toast.success(
        t("adaptiveSending.adminCaps.saved", {
          defaultValue: "Bulk-send caps saved.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });

  if (!isAdmin) return null;

  return (
    <section
      aria-labelledby="adaptive-send-burst-caps-title"
      className="rounded-2xl border bg-white p-4 shadow-sm"
      style={{ borderColor: "oklch(0.88 0.03 260)" }}
      data-testid="adaptive-send-burst-cap-settings"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl rr-bg-navy text-white">
          <Gauge size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] rr-text-gold">
            {t("adaptiveSending.adminCaps.eyebrow", {
              defaultValue: "Administrator control",
            })}
          </p>
          <h2
            id="adaptive-send-burst-caps-title"
            className="mt-0.5 text-base font-black rr-text-navy"
          >
            {t("adaptiveSending.adminCaps.title", {
              defaultValue: "Bulk-send burst caps",
            })}
          </h2>
          <p className="mt-1 text-xs font-semibold rr-text-navy-mid">
            {t("adaptiveSending.adminCaps.description", {
              defaultValue:
                "Sets the maximum requests one bulk action may initiate by plan. Provider warm-up, hourly, daily, and account safety limits still win.",
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tiers.map(({ key, label, detail }) => {
          const configuredCap = Number(draft[key]);
          const progressPercent = Number.isFinite(configuredCap)
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (configuredCap / ADAPTIVE_SEND_MAXIMUM_BURST_CAP) * 100
                  )
                )
              )
            : 0;
          return (
            <label
              key={key}
              htmlFor={`adaptive-send-burst-cap-${key}`}
              className="rounded-xl border p-3"
              style={{ borderColor: "oklch(0.90 0.02 260)" }}
            >
              <span className="block text-xs font-black rr-text-navy">
                {label}
              </span>
              <span className="mt-0.5 block text-xs rr-text-navy-muted">
                {detail}
              </span>
              <span className="mt-2 flex items-center gap-2">
                <input
                  id={`adaptive-send-burst-cap-${key}`}
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
                  className="min-h-10 w-24 rounded-lg border bg-white px-2 text-sm font-black rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  style={{ borderColor: "oklch(0.84 0.04 260)" }}
                  aria-describedby={`adaptive-send-burst-cap-help adaptive-send-burst-cap-usage-${key}`}
                />
                <span className="text-xs font-semibold rr-text-navy-muted">
                  {t("adaptiveSending.adminCaps.requests", {
                    defaultValue: "requests/action",
                  })}
                </span>
              </span>
              <span
                className="mt-3 block"
                id={`adaptive-send-burst-cap-usage-${key}`}
              >
                <span className="mb-1 flex items-center justify-between gap-2 text-xs font-bold rr-text-navy-mid">
                  <span>
                    {t("adaptiveSending.adminCaps.usage", {
                      defaultValue: "Configured cap usage",
                    })}
                  </span>
                  <span>
                    {configuredCap || 0}/{ADAPTIVE_SEND_MAXIMUM_BURST_CAP}
                  </span>
                </span>
                <span
                  className="block h-2 overflow-hidden rounded-full"
                  style={{ background: "oklch(0.92 0.015 260)" }}
                  role="progressbar"
                  aria-label={t("adaptiveSending.adminCaps.usageLabel", {
                    defaultValue:
                      "Configured burst cap relative to the tier maximum",
                  })}
                  aria-valuemin={0}
                  aria-valuemax={ADAPTIVE_SEND_MAXIMUM_BURST_CAP}
                  aria-valuenow={
                    Number.isFinite(configuredCap) ? configuredCap : 0
                  }
                >
                  <span
                    className="block h-full rounded-full bg-[oklch(0.80_0.18_80)] transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${progressPercent}%` }}
                  />
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p
        id="adaptive-send-burst-cap-help"
        className="mt-3 text-xs rr-text-navy-muted"
      >
        {t("adaptiveSending.adminCaps.range", {
          defaultValue: "Choose whole numbers from {{min}} to {{max}}.",
          min: ADAPTIVE_SEND_MINIMUM_BURST_CAP,
          max: ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
        })}
      </p>

      {isError && (
        <p className="mt-2 text-xs font-semibold text-destructive" role="alert">
          {t("adaptiveSending.adminCaps.loadError", {
            defaultValue:
              "Current caps could not be loaded. Refresh and try again.",
          })}
        </p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-xs rr-text-navy-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 rr-text-green" />
          {t("adaptiveSending.adminCaps.protected", {
            defaultValue:
              "This global setting cannot raise a provider or account safety limit.",
          })}
        </p>
        <button
          type="button"
          onClick={() => parsed && save.mutate(parsed)}
          disabled={!parsed || !changed || save.isPending || isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {save.isPending || isLoading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {save.isPending
            ? t("adaptiveSending.adminCaps.saving", { defaultValue: "Saving…" })
            : t("adaptiveSending.adminCaps.save", {
                defaultValue: "Save caps",
              })}
        </button>
      </div>
    </section>
  );
}
