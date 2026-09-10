import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  MailCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { openUpgradeModal } from "@/lib/upgradeModal";
import ProBadge from "@/components/ProBadge";

type AdaptiveStatus = {
  configured: boolean;
  providerLabel: string | null;
  channelType: "personal" | "bulk" | null;
  rampStage: "new" | "warming" | "building" | "established" | null;
  todayCount: number;
  providerTodayCount: number;
  providerHourCount: number;
  dailyLimit: number;
  hourlyLimit: number;
  remaining: number;
  utilization: number;
  warningLevel: "normal" | "approaching" | "high" | "blocked";
  dailyResetAt: number;
  hourlyResetAt: number;
  recommendedAction: "upgrade_plan" | "connect_bulk_sender" | null;
};

type Props = {
  status: AdaptiveStatus | null | undefined;
  compact?: boolean;
};

const toneByLevel = {
  normal: {
    background: "oklch(0.98 0.008 260)",
    border: "oklch(0.89 0.025 260)",
    accent: "oklch(0.38 0.10 260)",
  },
  approaching: {
    background: "oklch(0.98 0.025 84)",
    border: "oklch(0.84 0.12 84)",
    accent: "oklch(0.55 0.14 72)",
  },
  high: {
    background: "oklch(0.97 0.035 55)",
    border: "oklch(0.78 0.15 55)",
    accent: "oklch(0.53 0.18 42)",
  },
  blocked: {
    background: "oklch(0.97 0.03 28)",
    border: "oklch(0.78 0.13 28)",
    accent: "oklch(0.50 0.18 28)",
  },
} as const;

function UsageBar({
  value,
  limit,
  accent,
}: {
  value: number;
  limit: number;
  accent: string;
}) {
  const percentage =
    limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 100;
  return (
    <div
      className="h-2 overflow-hidden rounded-full"
      style={{ background: "oklch(0.91 0.015 260)" }}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full transition-transform duration-200"
        style={{ background: accent, width: `${percentage}%` }}
      />
    </div>
  );
}

export default function AdaptiveSendLimitStatus({
  status,
  compact = false,
}: Props) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!status || window.location.hash !== "#adaptive-sending-status") return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("adaptive-sending-status")
        ?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status]);

  if (!status) return null;

  if (!status.configured) {
    return (
      <div
        id="adaptive-sending-status"
        className="rounded-2xl p-4"
        style={{
          background: "oklch(0.98 0.008 260)",
          border: "1px solid oklch(0.89 0.025 260)",
        }}
      >
        <div className="flex items-start gap-3">
          <MailCheck size={18} className="mt-0.5 shrink-0 rr-text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black rr-text-navy">
              {t("adaptiveSending.notConfiguredTitle", {
                defaultValue: "Connect a sender first",
              })}
            </p>
            <p className="mt-0.5 text-xs font-semibold rr-text-navy-mid">
              {t("adaptiveSending.notConfiguredBody", {
                defaultValue:
                  "Connect your email account in Settings before sending review requests.",
              })}
            </p>
            <a
              href="/settings#email-connection"
              className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black rr-bg-navy rr-text-gold"
            >
              {t("adaptiveSending.connectEmail", {
                defaultValue: "Connect email",
              })}
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tone = toneByLevel[status.warningLevel];
  const resetAt =
    status.hourlyLimit - status.providerHourCount <=
    status.dailyLimit - status.providerTodayCount
      ? status.hourlyResetAt
      : status.dailyResetAt;
  const resetLabel = new Intl.DateTimeFormat(
    i18n.resolvedLanguage || i18n.language,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(resetAt));
  const stageLabel = status.rampStage
    ? t(`adaptiveSending.stage.${status.rampStage}`, {
        defaultValue: status.rampStage,
      })
    : "";
  const warningTitle =
    status.warningLevel === "blocked"
      ? t("adaptiveSending.blockedTitle", {
          defaultValue: "Safety limit reached",
        })
      : status.warningLevel === "high"
        ? t("adaptiveSending.highTitle", {
            defaultValue: "Sending capacity is nearly used",
          })
        : status.warningLevel === "approaching"
          ? t("adaptiveSending.approachingTitle", {
              defaultValue: "You’re approaching the safety limit",
            })
          : null;
  const warningBody =
    status.warningLevel === "blocked"
      ? t("adaptiveSending.blockedBody", {
          defaultValue:
            "Sending pauses automatically until the current safety window resets.",
        })
      : status.warningLevel === "high"
        ? t("adaptiveSending.highBody", {
            defaultValue:
              "Finish priority sends first. Get Phame will pause automatically before provider risk increases.",
          })
        : status.warningLevel === "approaching"
          ? t("adaptiveSending.approachingBody", {
              defaultValue:
                "Capacity is managed automatically. Consider sending the most important requests first.",
            })
          : null;

  return (
    <section
      id="adaptive-sending-status"
      className="scroll-mt-24 rounded-2xl p-4 sm:p-5"
      style={{
        background: tone.background,
        border: `1.5px solid ${tone.border}`,
      }}
      aria-labelledby="adaptive-send-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{
              background: "oklch(0.24 0.08 260)",
              color: "oklch(0.80 0.18 80)",
            }}
          >
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <h3
              id="adaptive-send-title"
              className="text-sm font-black rr-text-navy"
            >
              {t("adaptiveSending.title", {
                defaultValue: "Adaptive sending protection",
              })}
            </h3>
            <p className="mt-0.5 truncate text-xs font-bold rr-text-navy-mid">
              {status.providerLabel} · {stageLabel}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black"
          style={{ background: "oklch(0.93 0.025 260)", color: tone.accent }}
        >
          {t("adaptiveSending.remaining", {
            defaultValue: "{{count}} ready",
            count: status.remaining,
          })}
        </span>
      </div>

      {warningTitle && (
        <div
          className="mt-3 flex items-start gap-2 rounded-xl p-3"
          style={{
            background: "oklch(1 0 0 / 0.72)",
            border: `1px solid ${tone.border}`,
          }}
          role={status.warningLevel === "blocked" ? "alert" : "status"}
        >
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
            style={{ color: tone.accent }}
          />
          <div>
            <p className="text-xs font-black rr-text-navy">{warningTitle}</p>
            <p className="mt-0.5 text-xs font-semibold rr-text-navy-mid">
              {warningBody}
            </p>
          </div>
        </div>
      )}

      <div
        className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}
      >
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold rr-text-navy-mid">
            <span>
              {t("adaptiveSending.thisHour", { defaultValue: "This hour" })}
            </span>
            <span>
              {status.providerHourCount}/{status.hourlyLimit}
            </span>
          </div>
          <UsageBar
            value={status.providerHourCount}
            limit={status.hourlyLimit}
            accent={tone.accent}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold rr-text-navy-mid">
            <span>{t("adaptiveSending.today", { defaultValue: "Today" })}</span>
            <span>
              {status.providerTodayCount}/{status.dailyLimit}
            </span>
          </div>
          <UsageBar
            value={status.providerTodayCount}
            limit={status.dailyLimit}
            accent={tone.accent}
          />
        </div>
      </div>

      <div
        className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs font-semibold rr-text-navy-mid sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: tone.border }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={13} />
          {t("adaptiveSending.nextReset", {
            defaultValue: "Next capacity refresh: {{time}}",
            time: resetLabel,
          })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Zap size={13} />
          {t("adaptiveSending.automaticRamp", {
            defaultValue:
              "Limits grow automatically as the connection warms up",
          })}
        </span>
      </div>

      {status.recommendedAction &&
        (status.recommendedAction === "upgrade_plan" ? (
          <button
            type="button"
            onClick={() => openUpgradeModal("bulk_sender")}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black rr-bg-navy rr-text-gold"
          >
            <span>
              {t("adaptiveSending.upgradePlan", {
                defaultValue: "Upgrade for Bulk Sender",
              })}
            </span>
            <ProBadge variant="locked" size="sm" />
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <a
            href="/settings#bulk-sender"
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black rr-bg-navy rr-text-gold"
          >
            {t("adaptiveSending.connectBulkSender", {
              defaultValue: "Connect Bulk Sender",
            })}
            <ArrowUpRight size={14} />
          </a>
        ))}

      <p className="mt-3 text-xs font-semibold rr-text-navy-muted">
        {t("adaptiveSending.safetyNote", {
          defaultValue:
            "Provider-aware limits and a separate account safety ceiling always apply. Changing providers cannot bypass protection.",
        })}
      </p>
    </section>
  );
}
