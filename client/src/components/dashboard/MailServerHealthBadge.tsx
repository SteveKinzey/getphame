import { AlertCircle, CheckCircle2, Mail, Settings2 } from "lucide-react";

type Translate = (key: string, options?: { defaultValue?: string }) => string;

export type MailServerHealth = "healthy" | "attention" | "disconnected" | "bulk_active";

export function resolveMailServerHealth(
  smtp: { connected?: boolean; verified?: boolean; lastHealthStatus?: string | null; activeDeliveryChannel?: string | null } | undefined,
  bulk: { connected?: boolean; selectedForOutreach?: boolean } | undefined,
): MailServerHealth {
  if (smtp?.activeDeliveryChannel === "bulk" && bulk?.connected && bulk?.selectedForOutreach) return "bulk_active";
  if (!smtp?.connected || smtp.activeDeliveryChannel !== "personal") return "disconnected";
  if (!smtp.verified || smtp.lastHealthStatus === "fail") return "attention";
  return "healthy";
}

export default function MailServerHealthBadge({
  smtp,
  bulk,
  translate,
}: {
  smtp: { connected?: boolean; verified?: boolean; lastHealthStatus?: string | null; activeDeliveryChannel?: string | null } | undefined;
  bulk: { connected?: boolean; selectedForOutreach?: boolean } | undefined;
  translate: Translate;
}) {
  const health = resolveMailServerHealth(smtp, bulk);
  const details: Record<MailServerHealth, { label: string; message: string; icon: typeof CheckCircle2; tone: string; background: string }> = {
    healthy: {
      label: translate("dashboard.mailHealth.healthy", { defaultValue: "Mail server healthy" }),
      message: translate("dashboard.mailHealth.healthyDetail", { defaultValue: "Your connected mail server is ready for outreach." }),
      icon: CheckCircle2,
      tone: "oklch(0.30 0.12 145)",
      background: "oklch(0.96 0.04 145)",
    },
    attention: {
      label: translate("dashboard.mailHealth.attention", { defaultValue: "Mail server needs attention" }),
      message: translate("dashboard.mailHealth.attentionDetail", { defaultValue: "Re-test or update your mail server in Settings before sending outreach." }),
      icon: AlertCircle,
      tone: "oklch(0.45 0.14 27)",
      background: "oklch(0.97 0.03 27)",
    },
    disconnected: {
      label: translate("dashboard.mailHealth.disconnected", { defaultValue: "Mail server not connected" }),
      message: translate("dashboard.mailHealth.disconnectedDetail", { defaultValue: "Connect a user-owned mail server before sending outreach." }),
      icon: Mail,
      tone: "oklch(0.38 0.04 260)",
      background: "oklch(0.95 0.02 260)",
    },
    bulk_active: {
      label: translate("dashboard.mailHealth.bulkActive", { defaultValue: "Bulk mail server active" }),
      message: translate("dashboard.mailHealth.bulkActiveDetail", { defaultValue: "Your selected bulk mail provider is active for outreach." }),
      icon: CheckCircle2,
      tone: "oklch(0.30 0.12 145)",
      background: "oklch(0.96 0.04 145)",
    },
  };
  const current = details[health];
  const Icon = current.icon;

  return (
    <a href="/settings" data-testid="dashboard-mail-server-health" className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" style={{ background: current.background, color: current.tone }}>
      <Icon size={20} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{current.label}</span>
        <span className="block text-xs leading-relaxed opacity-85">{current.message}</span>
      </span>
      <Settings2 size={16} aria-hidden="true" />
    </a>
  );
}
