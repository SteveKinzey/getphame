import { useEffect, useMemo, useState } from "react";
import { Gauge, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const {
    data,
    isLoading,
    isError: isCapsError,
  } = trpc.admin.getAdaptiveSendBurstCaps.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 30_000,
    retry: false,
  });
  const {
    data: auditEntries,
    isLoading: isAuditLoading,
    isError: isAuditError,
    refetch: refetchAudit,
  } = trpc.admin.listAdaptiveSendBurstCapAudit.useQuery(
    { page: 1, pageSize: 6 },
    { enabled: isAdmin, staleTime: 30_000, retry: false }
  );
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
        utils.admin.listAdaptiveSendBurstCapAudit.invalidate(),
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
      id="adaptive-send-burst-cap-settings"
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
          const hasValidConfiguredCap =
            Number.isInteger(configuredCap) &&
            configuredCap >= ADAPTIVE_SEND_MINIMUM_BURST_CAP &&
            configuredCap <= ADAPTIVE_SEND_MAXIMUM_BURST_CAP;
          const progressValue = hasValidConfiguredCap ? configuredCap : 0;
          const remainingBurstSends = hasValidConfiguredCap
            ? ADAPTIVE_SEND_MAXIMUM_BURST_CAP - configuredCap
            : null;
          const progressPercent = hasValidConfiguredCap
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
              <span
                id={`adaptive-send-burst-cap-tier-${key}`}
                className="block text-xs font-black rr-text-navy"
              >
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
                    {progressValue}/{ADAPTIVE_SEND_MAXIMUM_BURST_CAP}
                  </span>
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="block h-2 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                      style={{ background: "oklch(0.92 0.015 260)" }}
                      role="progressbar"
                      tabIndex={0}
                      data-testid={`adaptive-send-burst-cap-progress-${key}`}
                      aria-labelledby={`adaptive-send-burst-cap-tier-${key}`}
                      aria-valuemin={0}
                      aria-valuemax={ADAPTIVE_SEND_MAXIMUM_BURST_CAP}
                      aria-valuenow={
                        hasValidConfiguredCap ? configuredCap : undefined
                      }
                      aria-valuetext={
                        hasValidConfiguredCap && remainingBurstSends !== null
                          ? t("adaptiveSending.adminCaps.remainingBurstValue", {
                              defaultValue:
                                "{{configured}} of {{maximum}} requests configured; {{remaining}} burst sends remaining.",
                              configured: configuredCap,
                              maximum: ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
                              remaining: remainingBurstSends,
                            })
                          : undefined
                      }
                    >
                      <span
                        className="block h-full rounded-full bg-[oklch(0.80_0.18_80)] transition-[width] duration-200 motion-reduce:transition-none"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64 text-center">
                    {hasValidConfiguredCap && remainingBurstSends !== null
                      ? t("adaptiveSending.adminCaps.remainingBurstTooltip", {
                          defaultValue:
                            "{{remaining}} burst sends can still be configured before this tier reaches the {{maximum}}-request maximum.",
                          remaining: remainingBurstSends,
                          maximum: ADAPTIVE_SEND_MAXIMUM_BURST_CAP,
                        })
                      : t("adaptiveSending.adminCaps.remainingBurstInvalid", {
                          defaultValue:
                            "Enter a whole-number cap within the allowed range to view remaining burst sends.",
                        })}
                  </TooltipContent>
                </Tooltip>
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

      {isCapsError && (
        <p className="mt-2 text-xs font-semibold text-destructive" role="alert">
          {t("adaptiveSending.adminCaps.loadError", {
            defaultValue:
              "Current caps could not be loaded. Refresh and try again.",
          })}
        </p>
      )}

      <section
        className="mt-5 border-t pt-4"
        style={{ borderColor: "oklch(0.90 0.02 260)" }}
        aria-labelledby="adaptive-send-burst-cap-audit-title"
        data-testid="adaptive-send-burst-cap-audit"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3
              id="adaptive-send-burst-cap-audit-title"
              className="text-sm font-black rr-text-navy"
            >
              {t("adaptiveSending.adminCaps.auditTitle", {
                defaultValue: "Burst-cap audit trail",
              })}
            </h3>
            <p className="mt-0.5 text-xs rr-text-navy-muted">
              {t("adaptiveSending.adminCaps.auditDescription", {
                defaultValue:
                  "The last six saved changes record the administrator and the exact tier values changed.",
              })}
            </p>
          </div>
          {isAuditError && (
            <button
              type="button"
              onClick={() => void refetchAudit()}
              className="min-h-9 rounded-lg border bg-white px-2.5 text-xs font-black rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{ borderColor: "oklch(0.84 0.04 260)" }}
            >
              {t("adaptiveSending.adminCaps.auditRetry", {
                defaultValue: "Retry",
              })}
            </button>
          )}
        </div>

        {isAuditLoading ? (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold rr-text-navy-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {t("adaptiveSending.adminCaps.auditLoading", {
              defaultValue: "Loading change history…",
            })}
          </p>
        ) : isAuditError ? (
          <p
            className="mt-3 text-xs font-semibold text-destructive"
            role="alert"
          >
            {t("adaptiveSending.adminCaps.auditError", {
              defaultValue: "The cap change history could not be loaded.",
            })}
          </p>
        ) : auditEntries?.length ? (
          <ol className="mt-3 space-y-2" aria-label="Burst-cap change history">
            {auditEntries.map(entry => {
              const changes = tiers
                .filter(
                  tier => entry.previous[tier.key] !== entry.next[tier.key]
                )
                .map(
                  tier =>
                    `${tier.label}: ${entry.previous[tier.key]} → ${entry.next[tier.key]}`
                );
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border bg-[oklch(0.985_0.003_100)] px-3 py-2"
                  style={{ borderColor: "oklch(0.91 0.015 260)" }}
                >
                  <p className="text-xs font-black rr-text-navy">
                    {entry.actor}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold rr-text-navy-mid">
                    {changes.join(" · ")}
                  </p>
                  <time
                    dateTime={new Date(entry.changedAt).toISOString()}
                    className="mt-1 block text-[11px] font-semibold rr-text-navy-muted"
                  >
                    {new Date(entry.changedAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-xs font-semibold rr-text-navy-muted">
            {t("adaptiveSending.adminCaps.auditEmpty", {
              defaultValue: "No burst-cap changes have been recorded yet.",
            })}
          </p>
        )}
      </section>

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
