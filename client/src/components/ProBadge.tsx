// Reusable premium marker for account status, locked actions, and nav destinations.

import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "status" | "locked" | "compact";
}

const sizes = {
  sm: { crown: 10, px: "px-2 py-0.5", text: "text-[9px]", gap: "gap-1", compact: "h-4 w-4" },
  md: { crown: 12, px: "px-2.5 py-1", text: "text-[10px]", gap: "gap-1", compact: "h-5 w-5" },
  lg: { crown: 14, px: "px-3 py-1.5", text: "text-xs", gap: "gap-1.5", compact: "h-6 w-6" },
};

export default function ProBadge({ size = "md", className = "", variant = "status" }: ProBadgeProps) {
  const { t } = useTranslation();
  const s = sizes[size];
  const premiumLabel = t("premiumConversion.marker.label", { defaultValue: "Premium" });
  const containsPremiumLabel = t("premiumConversion.marker.contains", { defaultValue: "Contains premium features" });

  if (variant === "compact") {
    return (
      <span
        role="img"
        aria-label={containsPremiumLabel}
        title={containsPremiumLabel}
        data-premium-marker="compact"
        className={`inline-flex shrink-0 items-center justify-center rounded-full rr-bg-gold rr-text-navy ring-2 ring-[oklch(0.22_0.09_260)] ${s.compact} ${className}`}
      >
        <Crown size={s.crown} strokeWidth={2.7} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      aria-label={premiumLabel}
      data-premium-marker={variant}
      className={`inline-flex items-center rr-bg-gold rr-text-navy ${s.gap} ${s.px} rounded-full font-black tracking-widest uppercase ${s.text} ${className}`}
      style={{ letterSpacing: "0.08em" }}
    >
      <Crown size={s.crown} strokeWidth={2.5} aria-hidden="true" />
      {variant === "status" ? "PRO" : premiumLabel}
    </span>
  );
}
