import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Check,
  Clock3,
  Code2,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { IntegrationGuide } from "@/components/IntegrationGuide";
import { DeveloperApiEnrollmentPanel } from "@/components/DeveloperApiEnrollmentPanel";
import { SourceSetupGuide } from "@/components/SourceSetupGuide";
import { SourceOperationsPanel } from "@/components/SourceOperationsPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type DeveloperScope = "contacts:write" | "review_requests:send";
type PendingAction = { type: "rotate" | "revoke"; id: number; label: string } | null;
type RevealedSecret = { rawKey: string; label: string; keyHint: string } | null;
type WordPressPairingFailure = "not_found" | "unavailable";

export function classifyWordPressPairingFailure(error: unknown): WordPressPairingFailure {
  const code = typeof error === "object" && error !== null && "data" in error
    ? (error as { data?: { code?: string } }).data?.code
    : undefined;
  return code === "NOT_FOUND" ? "not_found" : "unavailable";
}

const SCOPE_OPTIONS: Array<{ value: DeveloperScope; label: string; detail: string }> = [
  {
    value: "contacts:write",
    label: "Import contacts",
    detail: "Create or update consent-attested customer records.",
  },
  {
    value: "review_requests:send",
    label: "Send individual requests",
    detail: "Send one review request from an approved customer action.",
  },
];

function formatDate(value: Date | number | string | null | undefined, fallback = "Never") {
  if (value == null) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString();
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function statusClasses(status: string) {
  if (status === "active" || status === "created" || status === "success") return "bg-emerald-50 text-emerald-800";
  if (status === "expired" || status === "updated" || status === "deduplicated") return "bg-amber-50 text-amber-900";
  if (status === "suspended" || status === "revoked" || status === "rejected" || status === "error" || status === "rate_limited" || status === "abuse_blocked") return "bg-rose-50 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export default function DeveloperIntegrationsPage() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const utils = trpc.useUtils();
  const wordpressPairingId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("wordpress_pairing");
    return value?.startsWith("wpb_") ? value : null;
  }, [location]);
  const [label, setLabel] = useState("Website form");
  const [scopes, setScopes] = useState<DeveloperScope[]>(["contacts:write"]);
  const [expiryDays, setExpiryDays] = useState("never");
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showGuide, setShowGuide] = useState(() => new URLSearchParams(window.location.search).get("guides") === "1");
  const [wordpressPairingActionFailure, setWordpressPairingActionFailure] = useState<WordPressPairingFailure | null>(null);

  const keyQuery = trpc.apiKey.list.useQuery();
  const importQuery = trpc.apiKey.recentImports.useQuery({ limit: 25 });
  const enrollmentQuery = trpc.apiKey.enrollment.useQuery();
  const wordpressPairingQuery = trpc.wordpressPairing.get.useQuery(
    { pairingId: wordpressPairingId ?? "wpb_unavailable" },
    { enabled: Boolean(wordpressPairingId), retry: false },
  );
  const approveWordPressPairing = trpc.wordpressPairing.approve.useMutation({
    onSuccess: async () => {
      setWordpressPairingActionFailure(null);
      await wordpressPairingQuery.refetch();
      toast.success(t("developerIntegrations.wordpressPairing.connectedToast", { defaultValue: "WordPress connected. Return to your WordPress dashboard while the plugin completes setup." }));
    },
    onError: (error) => {
      const failure = classifyWordPressPairingFailure(error);
      setWordpressPairingActionFailure(failure);
      toast.error(failure === "not_found"
        ? t("developerIntegrations.wordpressPairing.notFoundToast", { defaultValue: "This connection request is no longer available. Start a new request in WordPress." })
        : t("developerIntegrations.wordpressPairing.unavailableToast", { defaultValue: "We could not authorize this connection. Try again or start a new request in WordPress." }));
    },
  });
  const wordpressPairingFailure = wordpressPairingActionFailure
    ?? (wordpressPairingQuery.error ? classifyWordPressPairingFailure(wordpressPairingQuery.error) : null);

  const createKey = trpc.apiKey.generate.useMutation({
    onSuccess: async (data) => {
      await keyQuery.refetch();
      setRevealedSecret({ rawKey: data.rawKey, label: data.label, keyHint: data.keyHint });
      toast.success(t("developerIntegrations.keys.created", { defaultValue: "API key created. Copy it before closing the dialog." }));
    },
    onError: (error) => toast.error(error.message),
  });

  const rotateKey = trpc.apiKey.rotate.useMutation({
    onSuccess: async (data) => {
      setPendingAction(null);
      await keyQuery.refetch();
      setRevealedSecret({ rawKey: data.rawKey, label: data.label, keyHint: data.keyHint });
      toast.success(t("developerIntegrations.keys.rotated", { defaultValue: "API key rotated. Replace the old key in your integration now." }));
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: async () => {
      setPendingAction(null);
      await keyQuery.refetch();
      toast.success(t("developerIntegrations.keys.revoked", { defaultValue: "API key revoked." }));
    },
    onError: (error) => toast.error(error.message),
  });

  const activeKeyCount = useMemo(
    () => keyQuery.data?.filter((key) => key.status === "active").length ?? 0,
    [keyQuery.data],
  );
  const totalUsage = useMemo(
    () => keyQuery.data?.reduce((total, key) => total + key.usageCount, 0) ?? 0,
    [keyQuery.data],
  );
  const endpoint = `${typeof window === "undefined" ? "https://getphame.app" : window.location.origin}/api/v1/contacts`;

  const toggleScope = (scope: DeveloperScope) => {
    if (scope === "review_requests:send" && !enrollmentQuery.data?.sendScopeApproved) {
      document.getElementById("developer-send-enrollment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast.error(t("developerEnrollment.send.requiredForScope", { defaultValue: "Complete business-use enrollment before adding sending permission." }));
    }
    setScopes((current) => current.includes(scope)
      ? current.filter((item) => item !== scope)
      : [...current, scope]);
  };

  const submitKey = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return toast.error(t("developerIntegrations.keys.labelRequired", { defaultValue: "Enter a key label." }));
    if (scopes.length === 0) return toast.error(t("developerIntegrations.keys.scopeRequired", { defaultValue: "Select at least one permission." }));
    if (!enrollmentQuery.data?.termsAccepted) {
      document.getElementById("developer-enrollment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast.error(t("developerEnrollment.terms.requiredForKey", { defaultValue: "Accept the API Terms before creating a key." }));
    }
    const days = expiryDays === "never" ? null : Number(expiryDays);
    createKey.mutate({
      label: trimmedLabel,
      scopes,
      expiresInDays: days,
    });
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(t("developerIntegrations.copyFailed", { defaultValue: "Could not copy automatically. Select and copy the value manually." }));
    }
  };

  const exportImports = () => {
    const rows = importQuery.data ?? [];
    if (rows.length === 0) return toast.error(t("developerIntegrations.imports.empty", { defaultValue: "No API imports to export." }));
    const header = ["Date", "Masked email", "Key", "Source", "Outcome", "Consent basis", "Error code"];
    const body = rows.map((row) => [
      formatDate(row.createdAt, ""),
      row.email,
      row.keyLabel,
      row.sourceApp ?? "",
      row.outcome,
      row.consentBasis ?? "",
      row.errorCode ?? "",
    ]);
    const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `get-phame-api-imports-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "rotate") rotateKey.mutate({ id: pendingAction.id });
    else revokeKey.mutate({ id: pendingAction.id });
  };

  const approvePendingWordPressPairing = () => {
    if (!wordpressPairingId) return;
    if (!enrollmentQuery.data?.termsAccepted) {
      document.getElementById("developer-enrollment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(t("developerIntegrations.wordpressPairing.termsRequired", { defaultValue: "Accept the API Terms before connecting WordPress." }));
      return;
    }
    setWordpressPairingActionFailure(null);
    approveWordPressPairing.mutate({ pairingId: wordpressPairingId });
  };

  return (
    <div className="min-h-screen pb-36 rr-bg-cream-warm" data-testid="developer-integrations-page">
      <header className="rr-bg-navy px-5 pb-8 pt-10 text-white sm:px-7">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-white/85 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.18_80)] active:scale-[0.97]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("developerIntegrations.back", { defaultValue: "Back to settings" })}
        </button>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 rr-text-gold">
              <Code2 size={18} aria-hidden="true" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                {t("developerIntegrations.eyebrow", { defaultValue: "Developer workspace" })}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {t("developerIntegrations.title", { defaultValue: "Developer integrations" })}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              {t("developerIntegrations.description", { defaultValue: "Connect website forms to Get Phame with scoped keys, consent-aware imports, and privacy-safe activity history." })}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[26rem] sm:gap-3">
            {[
              [t("developerIntegrations.summary.activeKeys", { defaultValue: "Active keys" }), activeKeyCount],
              [t("developerIntegrations.summary.requests", { defaultValue: "Key uses" }), totalUsage],
              [t("developerIntegrations.summary.imports", { defaultValue: "Recent imports" }), importQuery.data?.length ?? 0],
            ].map(([summaryLabel, value]) => (
              <div key={String(summaryLabel)} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] font-bold leading-4 text-white/60 sm:text-xs">{summaryLabel}</p>
                <p className="mt-1 text-2xl font-black rr-text-gold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section aria-labelledby="api-contract-title" className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <div className="flex items-center gap-2 rr-text-navy">
                <ShieldCheck size={20} aria-hidden="true" />
                <h2 id="api-contract-title" className="text-xl font-semibold">
                  {t("developerIntegrations.contract.title", { defaultValue: "Import API contract" })}
                </h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 rr-text-navy-muted">
                {t("developerIntegrations.contract.description", { defaultValue: "Use one request per customer action. The canonical endpoint requires a bearer key with contacts:write permission and an affirmative consent attestation." })}
              </p>
            </div>
            <a href="#integration-guides" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold transition active:scale-[0.97]">
              {t("developerIntegrations.contract.openGuide", { defaultValue: "Open setup guides" })}
            </a>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <span className="w-fit rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-black text-emerald-800">POST</span>
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <code className="min-w-0 flex-1 break-all text-xs font-semibold rr-text-navy sm:text-sm">{endpoint}</code>
              <button type="button" onClick={() => copyText(endpoint, t("developerIntegrations.contract.endpointCopied", { defaultValue: "Endpoint copied." }))} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white" aria-label={t("developerIntegrations.contract.copyEndpoint", { defaultValue: "Copy endpoint" })}>
                <Copy size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {wordpressPairingId && (
          <section
            aria-labelledby="wordpress-pairing-title"
            className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${wordpressPairingFailure === "not_found" ? "border-rose-300 bg-rose-50" : wordpressPairingFailure === "unavailable" ? "border-amber-300 bg-amber-50" : "border-[oklch(0.78_0.13_80)] bg-[oklch(0.98_0.025_80)]"}`}
            data-testid="wordpress-pairing-approval"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${wordpressPairingFailure === "not_found" ? "bg-rose-100 text-rose-800" : wordpressPairingFailure === "unavailable" ? "bg-amber-100 text-amber-900" : "rr-bg-navy rr-text-gold"}`}>
                  {wordpressPairingFailure ? <ShieldAlert size={20} aria-hidden="true" /> : <ShieldCheck size={20} aria-hidden="true" />}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">{t("developerIntegrations.wordpressPairing.eyebrow", { defaultValue: "WordPress connection request" })}</p>
                  <h2 id="wordpress-pairing-title" className="mt-1 text-xl font-semibold rr-text-navy">
                    {wordpressPairingFailure === "not_found"
                      ? t("developerIntegrations.wordpressPairing.notFoundTitle", { defaultValue: "Connection request no longer available" })
                      : wordpressPairingFailure === "unavailable"
                        ? t("developerIntegrations.wordpressPairing.unavailableTitle", { defaultValue: "We could not load this connection" })
                        : t("developerIntegrations.wordpressPairing.title", { defaultValue: "Authorize this WordPress site" })}
                  </h2>
                  {wordpressPairingQuery.isLoading ? (
                    <p className="mt-2 flex items-center gap-2 text-sm rr-text-navy-muted"><Loader2 size={15} className="animate-spin" aria-hidden="true" />{t("developerIntegrations.wordpressPairing.loading", { defaultValue: "Loading connection details…" })}</p>
                  ) : wordpressPairingFailure ? (
                    <div className="mt-3 max-w-2xl" role="alert" data-testid={`wordpress-pairing-${wordpressPairingFailure}`}>
                      <p className={`text-sm font-bold leading-6 ${wordpressPairingFailure === "not_found" ? "text-rose-900" : "text-amber-950"}`}>
                        {wordpressPairingFailure === "not_found"
                          ? t("developerIntegrations.wordpressPairing.notFoundDescription", { defaultValue: "For your security, Get Phame cannot verify this request. Return to WordPress and start a new connection." })
                          : t("developerIntegrations.wordpressPairing.unavailableDescription", { defaultValue: "Your account is safe. Try loading the request again. If it still fails, start a new connection in WordPress." })}
                      </p>
                      {wordpressPairingFailure === "unavailable" && (
                        <button
                          type="button"
                          onClick={() => {
                            setWordpressPairingActionFailure(null);
                            void wordpressPairingQuery.refetch();
                          }}
                          disabled={wordpressPairingQuery.isFetching}
                          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-400 bg-white px-4 text-sm font-black text-amber-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.97] disabled:opacity-60"
                        >
                          <RefreshCw size={15} className={wordpressPairingQuery.isFetching ? "animate-spin" : ""} aria-hidden="true" />
                          {t("developerIntegrations.wordpressPairing.retry", { defaultValue: "Try again" })}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 max-w-2xl text-sm leading-6 rr-text-navy-muted">
                      {wordpressPairingQuery.data?.status === "approved" || wordpressPairingQuery.data?.status === "claimed"
                        ? <>{t("developerIntegrations.wordpressPairing.alreadyAuthorized", { defaultValue: "This site is already authorized. Return to WordPress to finish the connection." })}</>
                        : wordpressPairingQuery.data?.status === "expired"
                          ? <>{t("developerIntegrations.wordpressPairing.expiredDescription", { defaultValue: "This connection request expired. Return to WordPress and start a new connection request." })}</>
                          : <>{t("developerIntegrations.wordpressPairing.authorizePrefix", { defaultValue: "Authorize" })} <strong className="rr-text-navy">{wordpressPairingQuery.data?.siteLabel ?? t("developerIntegrations.wordpressPairing.siteFallback", { defaultValue: "this WordPress site" })}</strong> ({wordpressPairingQuery.data?.siteHost}) {t("developerIntegrations.wordpressPairing.authorizeSuffix", { defaultValue: "to import customer contacts into this Get Phame account. A dedicated, least-privilege integration key will be issued automatically." })}</>}
                    </p>
                  )}
                </div>
              </div>
              {wordpressPairingFailure ? (
                <span className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black ${wordpressPairingFailure === "not_found" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-950"}`}>
                  <ShieldAlert size={16} aria-hidden="true" />
                  {t("developerIntegrations.wordpressPairing.actionRequired", { defaultValue: "Action required" })}
                </span>
              ) : wordpressPairingQuery.data?.status === "approved" || wordpressPairingQuery.data?.status === "claimed" ? (
                <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-4 text-sm font-black text-emerald-900"><Check size={16} aria-hidden="true" />{t("developerIntegrations.wordpressPairing.connected", { defaultValue: "Connected" })}</span>
              ) : (
                <button
                  type="button"
                  onClick={approvePendingWordPressPairing}
                  disabled={wordpressPairingQuery.isLoading || wordpressPairingQuery.isError || wordpressPairingQuery.data?.status === "expired" || approveWordPressPairing.isPending}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.65_0.16_80)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {approveWordPressPairing.isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  {wordpressPairingQuery.data?.status === "expired"
                    ? t("developerIntegrations.wordpressPairing.expired", { defaultValue: "Connection expired" })
                    : t("developerIntegrations.wordpressPairing.connect", { defaultValue: "Connect this site" })}
                </button>
              )}
            </div>
            <p className={`mt-4 border-t pt-3 text-xs leading-5 ${wordpressPairingFailure === "not_found" ? "border-rose-200 text-rose-900" : "border-amber-200 text-amber-900"}`}>
              {wordpressPairingFailure
                ? t("developerIntegrations.wordpressPairing.failurePrivacy", { defaultValue: "No credentials were created or exposed. Start again from your WordPress dashboard." })
                : wordpressPairingQuery.data?.status === "expired"
                  ? t("developerIntegrations.wordpressPairing.expiredPrivacy", { defaultValue: "Start a new connection in WordPress. Get Phame never receives your WordPress administrator credentials." })
                  : t("developerIntegrations.wordpressPairing.privacy", { defaultValue: "This request expires in 15 minutes. Get Phame never receives your WordPress administrator credentials." })}
            </p>
          </section>
        )}

        <SourceSetupGuide endpoint={endpoint} />

        <SourceOperationsPanel />

        <DeveloperApiEnrollmentPanel />

        <section aria-labelledby="create-key-title" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold"><KeyRound size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="create-key-title" className="text-xl font-semibold rr-text-navy">{t("developerIntegrations.keys.createTitle", { defaultValue: "Create a scoped API key" })}</h2>
              <p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t("developerIntegrations.keys.createDescription", { defaultValue: "Name the integration, grant only required permissions, and set an optional earlier expiry. Every key also expires after 12 months without a successful use. The secret is shown once." })}</p>
            </div>
          </div>

          <form onSubmit={submitKey} className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-12" data-testid="developer-key-form">
            <label className="lg:col-span-7">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">{t("developerIntegrations.keys.label", { defaultValue: "Key label" })}</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} autoComplete="off" required className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" placeholder={t("developerIntegrations.keys.labelPlaceholder", { defaultValue: "Website contact form" })}  name="rr-pages-developer-integrations-label-415" />
            </label>
            <label className="lg:col-span-5">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">{t("developerIntegrations.keys.expiry", { defaultValue: "Expiry" })}</span>
              <select value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" name="rr-pages-developer-integrations-expiry-days-419">
                <option value="never">{t("developerIntegrations.keys.neverExpires", { defaultValue: "No earlier expiry" })}</option>
                <option value="30">{t("developerIntegrations.keys.days30", { defaultValue: "30 days" })}</option>
                <option value="90">{t("developerIntegrations.keys.days90", { defaultValue: "90 days" })}</option>
                <option value="365">{t("developerIntegrations.keys.days365", { defaultValue: "1 year" })}</option>
              </select>
            </label>
            <fieldset className="lg:col-span-12">
              <legend className="mb-2 text-sm font-bold rr-text-navy">{t("developerIntegrations.keys.permissions", { defaultValue: "Permissions" })}</legend>
              <div className="grid gap-2 md:grid-cols-2">
                {SCOPE_OPTIONS.map((option) => {
                  const selected = scopes.includes(option.value);
                  const requiresEnrollment = option.value === "review_requests:send" && !enrollmentQuery.data?.sendScopeApproved;
                  return (
                    <button key={option.value} type="button" onClick={() => toggleScope(option.value)} aria-pressed={selected} aria-describedby={requiresEnrollment ? "send-scope-enrollment-note" : undefined} className={`flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${selected ? "border-[oklch(0.66_0.16_80)] bg-[oklch(0.96_0.04_80)]" : "border-slate-200 bg-white"} ${requiresEnrollment ? "opacity-70" : ""}`}>
                      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-[oklch(0.60_0.16_80)] rr-bg-gold rr-text-navy" : "border-slate-300"}`}>{selected && <Check size={13} aria-hidden="true" />}</span>
                      <span><span className="block text-sm font-bold rr-text-navy">{t(`developerIntegrations.scopes.${option.value}.label`, { defaultValue: option.label })}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{t(`developerIntegrations.scopes.${option.value}.detail`, { defaultValue: option.detail })}</span>{requiresEnrollment && <span id="send-scope-enrollment-note" className="mt-1 block text-[11px] font-bold text-amber-800">{t("developerEnrollment.send.scopeLocked", { defaultValue: "Business-use enrollment required" })}</span>}<code className="mt-1 block text-[11px] text-slate-500">{option.value}</code></span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
              <p className="max-w-2xl text-xs leading-5 text-slate-500">{t("developerIntegrations.keys.securityNote", { defaultValue: "Store the secret in your website’s secure server-side settings. Never place it in browser JavaScript, public repositories, screenshots, or support messages." })}</p>
              <button type="submit" disabled={createKey.isPending || scopes.length === 0 || !enrollmentQuery.data?.termsAccepted} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black rr-bg-gold rr-text-navy transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60">
                {createKey.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {createKey.isPending ? t("developerIntegrations.keys.creating", { defaultValue: "Creating…" }) : t("developerIntegrations.keys.create", { defaultValue: "Create API key" })}
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="key-list-title" className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 id="key-list-title" className="text-xl font-semibold rr-text-navy">{t("developerIntegrations.keys.listTitle", { defaultValue: "API keys" })}</h2><p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t("developerIntegrations.keys.listDescription", { defaultValue: "Rotate compromised or aging keys. Abuse protection can temporarily suspend a key, while revoked and expired keys remain visible for audit context." })}</p></div>
            <button type="button" onClick={() => keyQuery.refetch()} disabled={keyQuery.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold rr-text-navy transition active:scale-[0.97] disabled:opacity-60"><RefreshCw size={15} className={keyQuery.isFetching ? "animate-spin" : ""} aria-hidden="true" />{t("developerIntegrations.refresh", { defaultValue: "Refresh" })}</button>
          </div>
          {(keyQuery.data?.some((key) => key.warningLevel) ?? false) && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
              <div className="flex items-start gap-3">
                <ShieldAlert size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{t("developerIntegrations.keys.inactivityWarning", { defaultValue: "One or more keys will expire soon because they have not completed a successful request recently. Run the integration or rotate the key before the displayed inactivity date." })}</p>
              </div>
            </div>
          )}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {keyQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin rr-text-navy" aria-label={t("developerIntegrations.loading", { defaultValue: "Loading API keys" })} /></div>
            ) : keyQuery.error ? (
              <p className="p-5 text-sm text-rose-800">{keyQuery.error.message}</p>
            ) : (keyQuery.data?.length ?? 0) === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">{t("developerIntegrations.keys.empty", { defaultValue: "No API keys yet. Create one above to connect your first integration." })}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {keyQuery.data?.map((key) => {
                  const canRotate = key.status === "active" || key.statusReason === "inactivity";
                  const canRevoke = key.status !== "revoked" && key.statusReason !== "manual_expiry" && key.statusReason !== "inactivity";
                  return (
                    <article key={key.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold rr-text-navy">{key.label}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(key.status)}`}>{t(`developerIntegrations.status.${key.status}`, { defaultValue: key.status })}</span>
                          {key.warningLevel && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">{key.warningLevel === "urgent" ? t("developerIntegrations.keys.expiresWithinWeek", { defaultValue: "Expires within 7 days" }) : t("developerIntegrations.keys.expiresWithinMonth", { defaultValue: "Expires within 30 days" })}</span>}
                        </div>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">{key.keyHint}</p>
                        {key.statusReason === "inactivity" && <p className="mt-2 text-xs font-semibold text-amber-900">{t("developerIntegrations.keys.inactiveExpired", { defaultValue: "Expired after 12 months without a successful API request. Rotate it to create a replacement." })}</p>}
                        {key.status === "suspended" && <p className="mt-2 text-xs font-semibold text-rose-800">{t("developerIntegrations.keys.suspendedHelp", { defaultValue: "Temporarily suspended by abuse protection. Review integration traffic and wait until the protection window ends." })}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">{key.scopes.map((scope) => <span key={scope} className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">{scope}</span>)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 lg:grid-cols-1">
                        <p><span className="block font-bold rr-text-navy">{t("developerIntegrations.keys.lastUsed", { defaultValue: "Last successful use" })}</span>{formatDate(key.lastUsedAt)}</p>
                        <p><span className="block font-bold rr-text-navy">{t("developerIntegrations.keys.inactivityExpiry", { defaultValue: "Inactive-key expiry" })}</span>{formatDate(key.inactivityExpiresAt)}</p>
                        {key.expiresAt && <p><span className="block font-bold rr-text-navy">{t("developerIntegrations.keys.configuredExpiry", { defaultValue: "Configured expiry" })}</span>{formatDate(key.expiresAt)}</p>}
                        {key.status === "suspended" && <p><span className="block font-bold rr-text-navy">{t("developerIntegrations.keys.suspensionEnds", { defaultValue: "Protection ends" })}</span>{formatDate(key.suspensionExpiresAt)}</p>}
                        <p><span className="block font-bold rr-text-navy">{t("developerIntegrations.keys.usage", { defaultValue: "Successful uses" })}</span>{key.usageCount.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        {canRotate && <button type="button" onClick={() => setPendingAction({ type: "rotate", id: key.id, label: key.label })} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold rr-text-navy transition active:scale-[0.97] lg:flex-none"><RotateCcw size={14} aria-hidden="true" />{t("developerIntegrations.keys.rotate", { defaultValue: "Rotate" })}</button>}
                        {canRevoke && <button type="button" onClick={() => setPendingAction({ type: "revoke", id: key.id, label: key.label })} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 transition active:scale-[0.97] lg:flex-none"><Trash2 size={14} aria-hidden="true" />{t("developerIntegrations.keys.revoke", { defaultValue: "Revoke" })}</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="import-history-title" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex items-center gap-2 rr-text-navy"><Clock3 size={20} aria-hidden="true" /><h2 id="import-history-title" className="text-xl font-semibold">{t("developerIntegrations.imports.title", { defaultValue: "Recent API imports" })}</h2></div><p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t("developerIntegrations.imports.description", { defaultValue: "A privacy-safe operational record. Customer emails are masked and idempotency secrets are never displayed." })}</p></div>
            <button type="button" onClick={exportImports} disabled={!importQuery.data?.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold rr-text-navy transition active:scale-[0.97] disabled:opacity-50"><Download size={15} aria-hidden="true" />{t("developerIntegrations.imports.export", { defaultValue: "Export CSV" })}</button>
          </div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            {importQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin rr-text-navy" aria-label={t("developerIntegrations.loading", { defaultValue: "Loading imports" })} /></div> : importQuery.error ? <p className="p-5 text-sm text-rose-800">{importQuery.error.message}</p> : (importQuery.data?.length ?? 0) === 0 ? <p className="p-6 text-center text-sm text-slate-500">{t("developerIntegrations.imports.noRows", { defaultValue: "No API imports have been recorded yet." })}</p> : <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-bold">{t("developerIntegrations.imports.date", { defaultValue: "Date" })}</th><th className="px-4 py-3 font-bold">{t("developerIntegrations.imports.customer", { defaultValue: "Masked email" })}</th><th className="px-4 py-3 font-bold">{t("developerIntegrations.imports.key", { defaultValue: "Key" })}</th><th className="px-4 py-3 font-bold">{t("developerIntegrations.imports.source", { defaultValue: "Source" })}</th><th className="px-4 py-3 font-bold">{t("developerIntegrations.imports.outcome", { defaultValue: "Outcome" })}</th></tr></thead><tbody className="divide-y divide-slate-100">{importQuery.data?.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(row.createdAt, "")}</td><td className="px-4 py-3 font-mono text-xs rr-text-navy">{row.email}</td><td className="px-4 py-3"><span className="font-semibold rr-text-navy">{row.keyLabel}</span></td><td className="px-4 py-3 text-slate-600">{row.sourceApp ?? "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(row.outcome)}`}>{t(`developerIntegrations.status.${row.outcome}`, { defaultValue: row.outcome })}</span>{row.errorCode && <p className="mt-1 font-mono text-[11px] text-rose-700">{row.errorCode}</p>}</td></tr>)}</tbody></table>}
          </div>
        </section>

        <section id="integration-guides" aria-labelledby="integration-guides-title" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <h2 id="integration-guides-title" className="text-xl font-semibold rr-text-navy">{t("developerIntegrations.guides.title", { defaultValue: "Form-builder setup guides" })}</h2>
          <p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t("developerIntegrations.guides.description", { defaultValue: "Choose your builder for endpoint, authorization, field mapping, consent, and testing instructions." })}</p>
          <div className="mt-4"><IntegrationGuide showSnippet={showGuide} setShowSnippet={setShowGuide} /></div>
        </section>
      </main>

      <Dialog open={Boolean(revealedSecret)} onOpenChange={(open) => { if (!open) setRevealedSecret(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{t("developerIntegrations.secret.title", { defaultValue: "Copy this API key now" })}</DialogTitle><DialogDescription>{t("developerIntegrations.secret.description", { defaultValue: "For security, Get Phame stores only a hash. This secret cannot be shown again after you close this dialog." })}</DialogDescription></DialogHeader>
          {revealedSecret && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">{revealedSecret.label} · {revealedSecret.keyHint}</p><code className="mt-2 block select-all break-all font-mono text-sm font-bold rr-text-navy" data-testid="revealed-api-key">{revealedSecret.rawKey}</code></div>}
          <DialogFooter className="gap-2 sm:gap-0"><button type="button" onClick={() => revealedSecret && copyText(revealedSecret.rawKey, t("developerIntegrations.secret.copied", { defaultValue: "API key copied." }))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy"><Copy size={15} aria-hidden="true" />{t("developerIntegrations.secret.copy", { defaultValue: "Copy key" })}</button><button type="button" onClick={() => setRevealedSecret(null)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold rr-text-navy">{t("developerIntegrations.secret.done", { defaultValue: "I saved it" })}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingAction?.type === "rotate" ? t("developerIntegrations.confirm.rotateTitle", { defaultValue: "Rotate this API key?" }) : t("developerIntegrations.confirm.revokeTitle", { defaultValue: "Revoke this API key?" })}</AlertDialogTitle><AlertDialogDescription>{pendingAction?.type === "rotate" ? t("developerIntegrations.confirm.rotateDescription", { defaultValue: "The current key will stop working immediately. You must replace it wherever the integration is configured." }) : t("developerIntegrations.confirm.revokeDescription", { defaultValue: "This immediately disables the key and cannot be undone." })} {pendingAction?.label ? `(${pendingAction.label})` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel><AlertDialogAction onClick={confirmAction} className={pendingAction?.type === "revoke" ? "bg-rose-700 text-white hover:bg-rose-800" : "rr-bg-gold rr-text-navy"}>{pendingAction?.type === "rotate" ? t("developerIntegrations.keys.rotate", { defaultValue: "Rotate" }) : t("developerIntegrations.keys.revoke", { defaultValue: "Revoke" })}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
