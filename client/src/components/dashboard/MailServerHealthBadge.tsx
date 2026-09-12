import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  Mail,
  Settings2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Translate = (key: string, options?: { defaultValue?: string }) => string;

export type MailServerHealth =
  | "healthy"
  | "attention"
  | "disconnected"
  | "bulk_active";

export function resolveMailServerHealth(
  smtp:
    | {
        connected?: boolean;
        verified?: boolean;
        lastHealthStatus?: string | null;
        activeDeliveryChannel?: string | null;
      }
    | undefined,
  bulk: { connected?: boolean; selectedForOutreach?: boolean } | undefined
): MailServerHealth {
  if (
    smtp?.activeDeliveryChannel === "bulk" &&
    bulk?.connected &&
    bulk?.selectedForOutreach
  )
    return "bulk_active";
  if (!smtp?.connected || smtp.activeDeliveryChannel !== "personal")
    return "disconnected";
  if (!smtp.verified || smtp.lastHealthStatus === "fail") return "attention";
  return "healthy";
}

export default function MailServerHealthBadge({
  smtp,
  bulk,
  translate,
  onTestConnection,
  isTesting = false,
  testResult,
}: {
  smtp:
    | {
        connected?: boolean;
        verified?: boolean;
        lastHealthStatus?: string | null;
        activeDeliveryChannel?: string | null;
      }
    | undefined;
  bulk: { connected?: boolean; selectedForOutreach?: boolean } | undefined;
  translate: Translate;
  onTestConnection?: () => void;
  isTesting?: boolean;
  testResult?: { ok: boolean; error?: string | null } | null;
}) {
  const health = resolveMailServerHealth(smtp, bulk);
  const details: Record<
    MailServerHealth,
    {
      label: string;
      message: string;
      tooltip: string;
      icon: typeof CheckCircle2;
      tone: string;
      background: string;
    }
  > = {
    healthy: {
      label: translate("dashboard.mailHealth.healthy", {
        defaultValue: "Mail server healthy",
      }),
      message: translate("dashboard.mailHealth.healthyDetail", {
        defaultValue: "Your connected mail server is ready for outreach.",
      }),
      tooltip: translate("dashboard.mailHealth.healthyTooltip", {
        defaultValue:
          "A verified personal mail server is selected, and its latest health signal does not require action.",
      }),
      icon: CheckCircle2,
      tone: "oklch(0.30 0.12 145)",
      background: "oklch(0.96 0.04 145)",
    },
    attention: {
      label: translate("dashboard.mailHealth.attention", {
        defaultValue: "Mail server needs attention",
      }),
      message: translate("dashboard.mailHealth.attentionDetail", {
        defaultValue:
          "Re-test or update your mail server in Settings before sending outreach.",
      }),
      tooltip: translate("dashboard.mailHealth.attentionTooltip", {
        defaultValue:
          "Your saved connection needs attention. Re-test it or update the provider settings before sending customer outreach.",
      }),
      icon: AlertCircle,
      tone: "oklch(0.45 0.14 27)",
      background: "oklch(0.97 0.03 27)",
    },
    disconnected: {
      label: translate("dashboard.mailHealth.disconnected", {
        defaultValue: "Mail server not connected",
      }),
      message: translate("dashboard.mailHealth.disconnectedDetail", {
        defaultValue:
          "Connect a user-owned mail server before sending outreach.",
      }),
      tooltip: translate("dashboard.mailHealth.disconnectedTooltip", {
        defaultValue:
          "No verified tenant-owned delivery channel is selected. Customer outreach stays paused until you connect one in Settings.",
      }),
      icon: Mail,
      tone: "oklch(0.38 0.04 260)",
      background: "oklch(0.95 0.02 260)",
    },
    bulk_active: {
      label: translate("dashboard.mailHealth.bulkActive", {
        defaultValue: "Bulk mail server active",
      }),
      message: translate("dashboard.mailHealth.bulkActiveDetail", {
        defaultValue:
          "Your selected bulk mail provider is active for outreach.",
      }),
      tooltip: translate("dashboard.mailHealth.bulkActiveTooltip", {
        defaultValue:
          "A verified tenant-owned bulk provider is selected for customer outreach. Manage or replace it in Settings.",
      }),
      icon: CheckCircle2,
      tone: "oklch(0.30 0.12 145)",
      background: "oklch(0.96 0.04 145)",
    },
  };
  const current = details[health];
  const Icon = current.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href="/settings"
          data-testid="dashboard-mail-server-health"
          className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ background: current.background, color: current.tone }}
        >
          <Icon size={20} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">{current.label}</span>
            <span className="block text-xs leading-relaxed opacity-85">
              {current.message}
            </span>
          </span>
          <CircleHelp
            size={15}
            aria-label={translate("dashboard.mailHealth.details", {
              defaultValue: "Mail server health details",
            })}
          />
          <Settings2 size={16} aria-hidden="true" />
        </a>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-xs text-sm leading-relaxed"
      >
        <div className="space-y-2">
          <p>{current.tooltip}</p>
          {health === "attention" ? (
            <div className="flex flex-wrap gap-2">
              {onTestConnection ? (
                <button
                  type="button"
                  onClick={onTestConnection}
                  disabled={isTesting}
                  data-testid="dashboard-mail-health-test-connection"
                  className="inline-flex min-h-8 items-center rounded-md px-2 text-xs font-bold text-white rr-bg-navy"
                >
                  {isTesting
                    ? translate("smtp.testingConnection", {
                        defaultValue: "Testing…",
                      })
                    : translate("smtp.testConnection", {
                        defaultValue: "Test Connection",
                      })}
                </button>
              ) : null}
              <a
                href="/settings?focus=smtp#smtp-settings"
                data-testid="dashboard-mail-health-troubleshoot"
                className="inline-flex min-h-8 items-center rounded-md border px-2 text-xs font-bold rr-text-navy"
              >
                {translate("dashboard.mailHealth.troubleshoot", {
                  defaultValue: "Troubleshoot",
                })}
              </a>
            </div>
          ) : null}
          {health === "attention" && testResult ? (
            <p role="status" className="text-xs">
              {testResult.ok
                ? translate("smtp.connectionTestPassed", {
                    defaultValue: "Connection verified.",
                  })
                : testResult.error ||
                  translate("smtp.connectionTestFailed", {
                    defaultValue: "Connection still needs attention.",
                  })}
            </p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
