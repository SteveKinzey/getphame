import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Mail, ChevronDown } from "lucide-react";

const TEMPLATES = [
  { value: "magic-link", label: "Magic Link (Sign-in)" },
  { value: "welcome", label: "Welcome Email" },
  { value: "upgrade-receipt-pro", label: "Upgrade Receipt — Pro Monthly" },
  { value: "upgrade-receipt-annual", label: "Upgrade Receipt — Pro Annual" },
  { value: "upgrade-receipt-lifetime", label: "Upgrade Receipt — Lifetime" },
  { value: "account-deletion", label: "Account Deletion Confirmation" },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["value"];

export default function AdminEmailPreview() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<TemplateKey>("magic-link");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const { data, isLoading, error } = trpc.admin.emailPreview.useQuery(
    { template: selected },
    { keepPreviousData: true }
  );

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 shadow-sm"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <Mail className="h-5 w-5 shrink-0" style={{ color: "oklch(0.80 0.18 80)" }} aria-hidden="true" />
        <h1
          className="text-lg font-bold text-white"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {t("adminEmailPreview.title", { defaultValue: "Email Template Preview" })}
        </h1>
        <span className="ml-auto text-xs font-semibold text-white/40">Admin only</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        {/* Template selector */}
        <div className="relative">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value as TemplateKey)}
            className="appearance-none rounded-xl border border-white/20 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "oklch(0.80 0.18 80)" } as React.CSSProperties}
            aria-label={t("adminEmailPreview.selectTemplate", { defaultValue: "Select template" })}
          >
            {TEMPLATES.map(tpl => (
              <option key={tpl.value} value={tpl.value}>{tpl.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        </div>

        {/* Viewport toggle */}
        <div className="flex rounded-xl border border-white/20 bg-white shadow-sm overflow-hidden">
          {(["desktop", "mobile"] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="px-4 py-2 text-sm font-semibold capitalize transition"
              style={{
                background: viewMode === mode ? "oklch(0.22 0.09 260)" : "transparent",
                color: viewMode === mode ? "#fff" : "#555",
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {isLoading && (
          <span className="text-xs text-gray-400 animate-pulse">
            {t("adminEmailPreview.loading", { defaultValue: "Loading preview…" })}
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500">
            {t("adminEmailPreview.error", { defaultValue: "Failed to load preview." })}
          </span>
        )}
      </div>

      {/* Preview iframe */}
      <div className="px-5 pb-10">
        <div
          className="mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all duration-300"
          style={{ maxWidth: viewMode === "mobile" ? 390 : 800 }}
        >
          {data?.html ? (
            <iframe
              key={`${selected}-${viewMode}`}
              srcDoc={data.html}
              title={`Email preview: ${TEMPLATES.find(t => t.value === selected)?.label ?? selected}`}
              className="block w-full border-0"
              style={{ minHeight: 600, height: "auto" }}
              onLoad={e => {
                const iframe = e.currentTarget;
                try {
                  const body = iframe.contentDocument?.body;
                  if (body) {
                    iframe.style.height = `${body.scrollHeight + 32}px`;
                  }
                } catch {
                  // cross-origin — use default height
                }
              }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center text-sm text-gray-400">
              {isLoading
                ? t("adminEmailPreview.loading", { defaultValue: "Loading preview…" })
                : t("adminEmailPreview.noPreview", { defaultValue: "No preview available." })}
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          {t("adminEmailPreview.note", { defaultValue: "Preview uses sample data. Actual emails are sent with real user names and secure links." })}
        </p>
      </div>
    </div>
  );
}
