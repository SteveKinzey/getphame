import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

type NetworkStatusBadgeProps = {
  variant: "sidebar" | "mobile";
};

export default function NetworkStatusBadge({
  variant,
}: NetworkStatusBadgeProps) {
  const { t } = useTranslation();
  const isOnline = useNetworkStatus();
  const status = isOnline
    ? t("apiRecovery.networkOnline", { defaultValue: "Online" })
    : t("apiRecovery.networkOffline", { defaultValue: "Offline" });
  const accessibleLabel = t("apiRecovery.networkStatusLabel", {
    defaultValue: "Network status",
  });
  const Icon = isOnline ? Wifi : WifiOff;

  if (variant === "mobile") {
    return (
      <div
        data-testid="mobile-network-status-badge"
        data-network-status={isOnline ? "online" : "offline"}
        role="status"
        aria-live="polite"
        aria-label={`${accessibleLabel}: ${status}`}
        className="flex min-h-7 items-center justify-center gap-1.5 border-b border-white/10 bg-[#061426] px-3 py-1 text-[11px] font-bold tracking-wide text-white/80"
      >
        <Icon
          size={13}
          strokeWidth={2.4}
          aria-hidden="true"
          className={isOnline ? "text-emerald-400" : "text-[#D4A017]"}
        />
        <span>{status}</span>
      </div>
    );
  }

  return (
    <div
      data-testid="sidebar-network-status-badge"
      data-network-status={isOnline ? "online" : "offline"}
      role="status"
      aria-live="polite"
      aria-label={`${accessibleLabel}: ${status}`}
      title={`${accessibleLabel}: ${status}`}
      className="flex min-h-8 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 lg:justify-start lg:px-3"
    >
      <Icon
        size={14}
        strokeWidth={2.4}
        aria-hidden="true"
        className={
          isOnline ? "shrink-0 text-emerald-400" : "shrink-0 text-[#D4A017]"
        }
      />
      <span className="app-sidebar-label hidden text-xs font-bold text-white/75">
        {status}
      </span>
    </div>
  );
}
