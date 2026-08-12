import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Mail, ChevronDown, Moon, Sun, Send, Loader2, Copy, Check,
  ExternalLink, SlidersHorizontal, ChevronUp, RotateCcw, Save, X,
} from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = [
  { value: "magic-link", label: "Magic Link (Sign-in)" },
  { value: "welcome", label: "Welcome Email" },
  { value: "upgrade-receipt-pro", label: "Upgrade Receipt — Pro Monthly" },
  { value: "upgrade-receipt-annual", label: "Upgrade Receipt — Pro Annual" },
  { value: "upgrade-receipt-lifetime", label: "Upgrade Receipt — Lifetime" },
  { value: "account-deletion", label: "Account Deletion Confirmation" },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["value"];
type ViewMode = "desktop" | "mobile" | "split";

const DEFAULT_VARS = {
  name: "Alex Johnson",
  company: "Sunrise Bakery",
  plan: "Pro Monthly",
  email: "alex@example.com",
};

const PRESET_KEY = "getphame-email-preview-presets";
type Preset = { name: string; vars: typeof DEFAULT_VARS };

export default function AdminEmailPreview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<TemplateKey>("magic-link");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [darkMode, setDarkMode] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email ?? "");
  const [copied, setCopied] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [vars, setVars] = useState(DEFAULT_VARS);

  // Preset state
  const [presets, setPresets] = useState<Preset[]>(() => {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [presetName, setPresetName] = useState("");

  // Seed testEmail once user auth resolves
  useEffect(() => {
    if (user?.email && !testEmail) setTestEmail(user.email);
  }, [user?.email]);

  const { data, isLoading, error } = trpc.admin.emailPreview.useQuery(
    { template: selected },
    {
      enabled: user?.role === "admin",
      placeholderData: previousData => previousData,
    }
  );

  const sendTest = trpc.admin.sendTestEmail.useMutation({
    onSuccess: () =>
      toast.success(
        `${t("adminEmailPreview.testSent", { defaultValue: "Test email sent!" })} → ${testEmail}`
      ),
    onError: (err) =>
      toast.error(
        t("adminEmailPreview.testFailed", { defaultValue: "Failed to send test email." }) +
          (err.message ? ` (${err.message})` : "")
      ),
  });

  // Apply variable substitutions to raw HTML
  const buildPreviewHtml = useCallback((raw: string) => {
    let html = raw
      .replace(/\[name\]/gi, vars.name)
      .replace(/\[company\]/gi, vars.company)
      .replace(/\[plan\]/gi, vars.plan)
      .replace(/\[email\]/gi, vars.email);
    if (darkMode) {
      html = html.replace(
        "<body",
        '<style>body{background:#1a1a1a!important}table[role="presentation"]{background:#1a1a1a!important}</style><body'
      );
    }
    return html;
  }, [vars, darkMode]);

  const previewHtml = data?.html ? buildPreviewHtml(data.html) : null;
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewHtml) {
      setPreviewDocumentUrl(null);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([previewHtml], { type: "text/html;charset=utf-8" })
    );
    setPreviewDocumentUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [previewHtml]);

  // Auto-height iframe handler
  const autoHeight = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    try {
      const body = iframe.contentDocument?.body;
      if (body) iframe.style.height = `${body.scrollHeight + 32}px`;
    } catch {
      // cross-origin — use default height
    }
  }, []);

  const iframeKey = `${selected}-${viewMode}-${darkMode}-${JSON.stringify(vars)}`;

  const handleCopy = () => {
    if (!data?.html) return;
    const html = buildPreviewHtml(data.html);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(html).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } else {
      const el = document.createElement("textarea");
      el.value = html;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleOpenTab = () => {
    if (!data?.html) return;
    const html = buildPreviewHtml(data.html);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // Preset management
  const savePreset = () => {
    if (!presetName.trim()) return;
    const next = [
      ...presets.filter(p => p.name !== presetName.trim()),
      { name: presetName.trim(), vars: { ...vars } },
    ];
    setPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    setPresetName("");
  };

  const loadPreset = (name: string) => {
    const p = presets.find(p => p.name === name);
    if (p) setVars({ ...p.vars });
  };

  const deletePreset = (name: string) => {
    const next = presets.filter(p => p.name !== name);
    setPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
  };

  // Shared iframe pane renderer
  const renderIframePane = (label: string, width: number, key: string) => (
    <div
      className="shrink-0 overflow-hidden rounded-2xl border border-gray-200 shadow-lg"
      style={{ width, background: darkMode ? "#1a1a1a" : "#fff" }}
    >
      <div className="border-b border-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400">
        {label}
      </div>
      {previewDocumentUrl ? (
        <iframe
          key={key}
          src={previewDocumentUrl}
          title={`${label} preview`}
          className="block w-full border-0"
          style={{ minHeight: 500, height: "auto" }}
          onLoad={autoHeight}
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

        {/* Viewport toggle — desktop / mobile / split */}
        <div className="flex rounded-xl border border-white/20 bg-white shadow-sm overflow-hidden">
          {(["desktop", "mobile", "split"] as const).map(mode => (
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
              {mode === "split"
                ? t("adminEmailPreview.split", { defaultValue: "Split" })
                : mode}
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(d => !d)}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition"
          style={{ color: darkMode ? "oklch(0.22 0.09 260)" : "#555" }}
          aria-pressed={darkMode}
        >
          {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          {t("adminEmailPreview.darkMode", { defaultValue: "Dark mode" })}
        </button>

        {/* Copy HTML button */}
        <button
          type="button"
          disabled={!data?.html}
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-40"
          style={{ color: copied ? "oklch(0.22 0.09 260)" : "#555" }}
          aria-label={t("adminEmailPreview.copyHtml", { defaultValue: "Copy HTML" })}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied
            ? t("adminEmailPreview.copied", { defaultValue: "Copied!" })
            : t("adminEmailPreview.copyHtml", { defaultValue: "Copy HTML" })}
        </button>

        {/* Open in new tab button */}
        <button
          type="button"
          disabled={!data?.html}
          onClick={handleOpenTab}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-40"
          style={{ color: "#555" }}
          aria-label={t("adminEmailPreview.openTab", { defaultValue: "Open in tab" })}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t("adminEmailPreview.openTab", { defaultValue: "Open in tab" })}
        </button>

        {/* Variables toggle */}
        <button
          type="button"
          onClick={() => setShowVars(v => !v)}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition"
          style={{ color: showVars ? "oklch(0.22 0.09 260)" : "#555" }}
          aria-pressed={showVars}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("adminEmailPreview.variables", { defaultValue: "Variables" })}
          {showVars ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
        </button>

        {/* Custom email input + send button */}
        <input
          type="email"
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          placeholder={t("adminEmailPreview.emailPlaceholder", { defaultValue: "Send to…" })}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 w-56"
          style={{ "--tw-ring-color": "oklch(0.80 0.18 80)" } as React.CSSProperties}
          aria-label={t("adminEmailPreview.emailPlaceholder", { defaultValue: "Send to…" })}
        />
        <button
          type="button"
          disabled={sendTest.isPending || isLoading || !data?.html || !testEmail}
          onClick={() => sendTest.mutate({ template: selected, to: testEmail })}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50"
          style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
        >
          {sendTest.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("adminEmailPreview.sending", { defaultValue: "Sending…" })}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("adminEmailPreview.sendTest", { defaultValue: "Send test email" })}
            </>
          )}
        </button>

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

      {/* Variable injection panel */}
      {showVars && (
        <div className="mx-5 mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* Panel header */}
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t("adminEmailPreview.variablesNote", { defaultValue: "Substitute [name], [company], [plan], [email] placeholders in the template" })}
            </p>
            {/* Reset button */}
            <button
              type="button"
              onClick={() => setVars(DEFAULT_VARS)}
              className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-100"
              style={{ color: "#888" }}
              title={t("adminEmailPreview.resetVars", { defaultValue: "Reset to defaults" })}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("adminEmailPreview.resetVars", { defaultValue: "Reset" })}
            </button>
          </div>

          {/* Variable inputs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(vars) as (keyof typeof vars)[]).map(key => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  [{key}]
                </span>
                <input
                  type="text"
                  value={vars[key]}
                  onChange={e => setVars(v => ({ ...v, [key]: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "oklch(0.80 0.18 80)" } as React.CSSProperties}
                  placeholder={DEFAULT_VARS[key]}
                />
              </label>
            ))}
          </div>

          {/* Preset chips */}
          {presets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map(p => (
                <div
                  key={p.name}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1"
                >
                  <button
                    type="button"
                    onClick={() => loadPreset(p.name)}
                    className="text-xs font-semibold text-gray-700 hover:underline"
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePreset(p.name)}
                    className="text-gray-400 transition hover:text-red-500"
                    aria-label={`Delete preset ${p.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save preset row */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder={t("adminEmailPreview.presetNamePlaceholder", { defaultValue: "Preset name…" })}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "oklch(0.80 0.18 80)" } as React.CSSProperties}
              onKeyDown={e => e.key === "Enter" && savePreset()}
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={!presetName.trim()}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-40"
              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {t("adminEmailPreview.savePreset", { defaultValue: "Save" })}
            </button>
          </div>
        </div>
      )}

      {/* Preview area */}
      <div className="px-5 pb-10">
        {viewMode === "split" ? (
          /* Split-screen: desktop + mobile side-by-side */
          <div className="flex gap-4 overflow-x-auto pb-2">
            {renderIframePane("Desktop — 800px", 800, `split-desktop-${iframeKey}`)}
            {renderIframePane("Mobile — 390px", 390, `split-mobile-${iframeKey}`)}
          </div>
        ) : (
          /* Single viewport */
          <div
            className="mx-auto overflow-hidden rounded-2xl border border-gray-200 shadow-lg transition-all duration-300"
            style={{
              maxWidth: viewMode === "mobile" ? 390 : 800,
              background: darkMode ? "#1a1a1a" : "#fff",
            }}
          >
             {previewDocumentUrl ? (
               <iframe
                 key={iframeKey}
                 src={previewDocumentUrl}
                title={`Email preview: ${TEMPLATES.find(tpl => tpl.value === selected)?.label ?? selected}`}
                className="block w-full border-0"
                style={{ minHeight: 600, height: "auto" }}
                onLoad={autoHeight}
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
        )}
        <p className="mt-3 text-center text-xs text-gray-400">
          {t("adminEmailPreview.note", { defaultValue: "Preview uses sample data. Actual emails are sent with real user names and secure links." })}
          {testEmail && (
            <span className="ml-1">
              Test sends to <strong>{testEmail}</strong>.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
