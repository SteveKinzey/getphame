// Reusable Pro badge — shown next to user name / profile wherever tier = 'pro'

import { Crown } from "lucide-react";

interface ProBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { crown: 10, px: "px-2 py-0.5", text: "text-[9px]", gap: "gap-1" },
  md: { crown: 12, px: "px-2.5 py-1", text: "text-[10px]", gap: "gap-1" },
  lg: { crown: 14, px: "px-3 py-1.5", text: "text-xs", gap: "gap-1.5" },
};

export default function ProBadge({ size = "md", className = "" }: ProBadgeProps) {
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full font-black tracking-widest uppercase ${s.text} ${className}`}
      style={{
        background: "oklch(0.80 0.18 80)",
        color: "oklch(0.22 0.09 260)",
        fontFamily: "'Syne', sans-serif",
        letterSpacing: "0.08em",
      }}
    >
      <Crown size={s.crown} strokeWidth={2.5} />
      PRO
    </span>
  );
}
