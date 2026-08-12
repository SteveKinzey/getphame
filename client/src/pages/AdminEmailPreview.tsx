import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mail, ChevronDown, Moon, Sun, Send, Loader2, Copy, Check,
  ExternalLink, SlidersHorizontal, ChevronUp, RotateCcw, Save, X, Download,
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

function getInitialTemplate(): TemplateKey {
  if (typeof window === "undefined") return "magic-link";
  const requested = new URLSearchParams(window.location.search).get("template");
  return TEMPLATES.some(template => template.value === requested)
    ? requested as TemplateKey
    : "magic-link";
}

const DEFAULT_VARS = {
  name: "Alex Johnson",
  company: "Sunrise Bakery",
  plan: "Pro Monthly",
  email: "alex@example.com",
};

const PRESET_KEY = "getphame-email-preview-presets";
type Preset = { name: string; vars: typeof DEFAULT_VARS };

function sanitizeEmailPreviewHtml(html: string): string {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  documentFragment
    .querySelectorAll("script, iframe, object, embed, base, form")
    .forEach(node => node.remove());

  documentFragment.querySelectorAll<HTMLElement>("*").forEach(node => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || (name === "srcdoc")) {
        node.removeAttribute(attribute.name);
        continue;
      }
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  const headStyles = Array.from(documentFragment.head.querySelectorAll("style, link[rel='stylesheet']"))
    .map(node => node.outerHTML)
    .join("");

  return `${headStyles}<div data-email-preview-content>${documentFragment.body.innerHTML}</div>`;
}

function EmailPreviewSurface({
  html,
  minHeight,
  onReady,
  onError,
}: {
  html: string;
  minHeight: number;
  onReady: () => void;
  onError: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const host = hostRef.current;
      if (!host) return;
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>:host{display:block} [data-email-preview-content]{display:block;min-height:${minHeight}px;overflow-wrap:anywhere}</style>${sanitizeEmailPreviewHtml(html)}`;

      const content = shadow.querySelector<HTMLElement>("[data-email-preview-content]");
      const renderedText = content?.innerText?.trim() ?? "";
      if (!content || !renderedText) throw new Error("Email preview contains no rendered content");
      onReady();
    } catch {
      onError();
    }
  }, [html, minHeight, onError, onReady]);

  return <div ref={hostRef} data-testid="email-preview-surface" style={{ minHeight }} />;
}

export default function AdminEmailPreview({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<TemplateKey>(getInitialTemplate);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [darkMode, setDarkMode] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email ?? "");
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
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
      // The rendered HTML is static sample content. Keep it available in the
      // managed preview host even when that host cannot forward the app cookie.
      enabled: true,
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
        '<style>body{background:#111827!important;color:#f8fafc!important}table[role="presentation"]{background:#161b22!important}.email-card{background:#161b22!important}.email-body,.email-body *{color:#f8fafc!important}.email-body a{color:#f6d56e!important}.email-footer{background:#0f172a!important}.email-footer,.email-footer *{color:#cbd5e1!important}</style><body'
      );
    }
    return html;
  }, [vars, darkMode]);

  const previewHtml = data?.html ? buildPreviewHtml(data.html) : null;
  const [previewReadyKey, setPreviewReadyKey] = useState<string | null>(null);
  const [previewErrorKey, setPreviewErrorKey] = useState<string | null>(null);

  const previewKey = `${selected}-${viewMode}-${darkMode}-${JSON.stringify(vars)}`;
  const previewRenderState = previewErrorKey === previewKey
    ? "error"
    : previewReadyKey === previewKey
      ? "ready"
      : "loading";

  const handlePreviewReady = useCallback((key: string) => {
    setPreviewErrorKey(current => current === key ? null : current);
    setPreviewReadyKey(key);
  }, []);
  const handlePreviewError = useCallback((key: string) => {
    setPreviewReadyKey(current => current === key ? null : current);
    setPreviewErrorKey(key);
  }, []);

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

  const handleExportHtml = () => {
    if (!previewHtml) return;

    const templateSlug = selected.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `get-phame-${templateSlug}-email-preview.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 1500);
  };

  const handleOpenTab = () => {
    if (!data?.html) return;
    const html = buildPreviewHtml(data.html);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const renderPreviewFallback = () => (
    <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
      <span>{t("adminEmailPreview.previewFallback", { defaultValue: "This preview could not render in the embedded frame." })}</span>
      <button
        type="button"
        onClick={handleOpenTab}
        disabled={!data?.html}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-300 disabled:opacity-50"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {t("adminEmailPreview.openTab", { defaultValue: "Open in tab" })}
      </button>
    </div>
  );

  const renderPreviewSkeleton = (minHeight: number) => (
    <div
      className="flex flex-col gap-5 bg-white p-6"
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-label={t("adminEmailPreview.previewLoading", { defaultValue: "Generating email preview…" })}
    >
      <div className="h-14 w-full animate-pulse rounded-lg" style={{ background: "oklch(0.22 0.09 260 / 0.12)" }} />
      <div className="h-6 w-3/5 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3 pt-3">
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-auto h-10 w-36 animate-pulse rounded-lg" style={{ background: "oklch(0.80 0.18 80 / 0.28)" }} />
      <span className="sr-only">{t("adminEmailPreview.previewLoading", { defaultValue: "Generating email preview…" })}</span>
    </div>
  );

  const renderPreviewDocument = (title: string, key: string, minHeight: number) =>
    <div className="relative" style={{ minHeight }}>
      <EmailPreviewSurface
        key={key}
        html={previewHtml ?? ""}
        minHeight={minHeight}
        onReady={() => handlePreviewReady(previewKey)}
        onError={() => handlePreviewError(previewKey)}
      />
      {previewRenderState === "loading" && (
        <div className="absolute inset-0">{renderPreviewSkeleton(minHeight)}</div>
      )}
    </div>;

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
      {previewRenderState === "error" ? renderPreviewFallback() : previewHtml ? (
        renderPreviewDocument(`${label} preview`, key, 500)
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
        {!readOnly && <span className="ml-auto text-xs font-semibold text-white/40">Admin only</span>}
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

        {/* Export rendered HTML button */}
        <button
          type="button"
          disabled={!previewHtml}
          onClick={handleExportHtml}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-40"
          style={{ color: exported ? "oklch(0.22 0.09 260)" : "#555" }}
          aria-label={t("adminEmailPreview.exportHtml", { defaultValue: "Export HTML" })}
        >
          {exported ? <Check className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {exported
            ? t("adminEmailPreview.exported", { defaultValue: "Downloaded!" })
            : t("adminEmailPreview.exportHtml", { defaultValue: "Export HTML" })}
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

        {!readOnly && (
          <>
            {/* Variables are editable only in the administrative preview workspace. */}
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

            {/* Test sending stays protected by the admin procedure. */}
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
          </>
        )}

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
      {!readOnly && showVars && (
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
            {renderIframePane("Desktop — 800px", 800, `split-desktop-${previewKey}`)}
            {renderIframePane("Mobile — 390px", 390, `split-mobile-${previewKey}`)}
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
             {previewRenderState === "error" ? renderPreviewFallback() : previewHtml ? (
               renderPreviewDocument(
                 `Email preview: ${TEMPLATES.find(tpl => tpl.value === selected)?.label ?? selected}`,
                 previewKey,
                 600
               )
            ) : (
              <div className="flex min-h-96 items-center justify-center text-sm text-gray-400">
                {isLoading
                  ? t("adminEmailPreview.loading", { defaultValue: "Loading preview…" })
                  : t("adminEmailPreview.noPreview", { defaultValue: "No preview available." })}
              </div>
            )}
          </div>
        )}
        {previewRenderState === "ready" && previewHtml && (
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-semibold text-emerald-700" aria-live="polite">
            <Check className="h-4 w-4" aria-hidden="true" />
            {t("adminEmailPreview.previewReady", { defaultValue: "Preview ready" })}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-gray-400">
          {t("adminEmailPreview.note", { defaultValue: "Preview uses sample data. Actual emails are sent with real user names and secure links." })}
          {!readOnly && testEmail && (
            <span className="ml-1">
              Test sends to <strong>{testEmail}</strong>.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
