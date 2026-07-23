import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudDownload,
  DatabaseZap,
  FileSpreadsheet,
  History,
  Loader2,
  LockKeyhole,
  Plug,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Unplug,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WorkspaceView = "overview" | "csv" | "woocommerce" | "history";
type ConsentBasis = "express" | "contract" | "legitimate_interest" | "other";
type ImportRow = { name: string; email: string; phone?: string; externalId?: string };
type ImportPreview = {
  importRecord: { id: number };
  rows: ImportRow[];
  stats: { requested: number; valid: number; duplicates: number; rejected: number };
  reused: boolean;
};

const sourceCards = [
  { key: "csv", icon: FileSpreadsheet, available: true },
  { key: "woocommerce", icon: ShoppingBag, available: true },
  { key: "shopify", icon: ShoppingBag, available: false },
  { key: "square", icon: DatabaseZap, available: false },
  { key: "hubspot", icon: Users, available: false },
  { key: "pipedrive", icon: Plug, available: false },
] as const;

function makeIdempotencyKey(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { headers: [] as string[], records: [] as Record<string, string>[] };
  const headers = parseCsvLine(lines[0]);
  const records = lines.slice(1, 1001).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, records };
}

function parseSettings(settingsJson: string | null | undefined) {
  if (!settingsJson) return {} as { storeUrl?: string };
  try {
    return JSON.parse(settingsJson) as { storeUrl?: string };
  } catch {
    return {} as { storeUrl?: string };
  }
}

function ConsentPanel({
  basis,
  source,
  attested,
  onBasisChange,
  onSourceChange,
  onAttestedChange,
}: {
  basis: ConsentBasis;
  source: string;
  attested: boolean;
  onBasisChange: (value: ConsentBasis) => void;
  onSourceChange: (value: string) => void;
  onAttestedChange: (value: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 sm:p-5 dark:border-amber-300/20 dark:bg-amber-300/5" aria-labelledby="sources-consent-heading">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-amber-700 dark:text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id="sources-consent-heading" className="rr-h5 text-foreground">
            {t("sources.consent.title", { defaultValue: "Confirm permission before importing" })}
          </h3>
          <p className="rr-l2 mt-1 text-muted-foreground">
            {t("sources.consent.description", { defaultValue: "Only import people who gave your business permission to contact them. Importing never sends a message." })}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sources-consent-basis">{t("sources.consent.basisLabel", { defaultValue: "Permission basis" })}</Label>
          <Select value={basis} onValueChange={(value) => onBasisChange(value as ConsentBasis)}>
            <SelectTrigger id="sources-consent-basis" className="min-h-11 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="express">{t("sources.consent.basis.express", { defaultValue: "Express permission" })}</SelectItem>
              <SelectItem value="contract">{t("sources.consent.basis.contract", { defaultValue: "Customer relationship / contract" })}</SelectItem>
              <SelectItem value="legitimate_interest">{t("sources.consent.basis.legitimateInterest", { defaultValue: "Documented legitimate interest" })}</SelectItem>
              <SelectItem value="other">{t("sources.consent.basis.other", { defaultValue: "Other documented basis" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sources-consent-source">{t("sources.consent.sourceLabel", { defaultValue: "Where permission was recorded" })}</Label>
          <Input
            id="sources-consent-source"
            value={source}
            maxLength={255}
            onChange={(event) => onSourceChange(event.target.value)}
            placeholder={t("sources.consent.sourcePlaceholder", { defaultValue: "Example: checkout opt-in on 20 July 2026" })}
            className="min-h-11 bg-background"
          />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 focus-within:ring-2 focus-within:ring-ring">
        <input
          type="checkbox"
          checked={attested}
          onChange={(event) => onAttestedChange(event.target.checked)}
          className="mt-1 h-4 w-4 accent-[oklch(0.68_0.18_75)]"
        />
        <span className="rr-l2 text-foreground">
          {t("sources.consent.attestation", { defaultValue: "I confirm these contacts gave my business permission to contact them, and I will review the preview before importing." })}
        </span>
      </label>
    </section>
  );
}

function PreviewPanel({ preview, committing, onCommit }: { preview: ImportPreview; committing: boolean; onCommit: () => void }) {
  const { t } = useTranslation();
  const metrics = [
    [t("sources.preview.requested", { defaultValue: "Rows" }), preview.stats.requested],
    [t("sources.preview.valid", { defaultValue: "Valid" }), preview.stats.valid],
    [t("sources.preview.duplicates", { defaultValue: "Duplicates" }), preview.stats.duplicates],
    [t("sources.preview.rejected", { defaultValue: "Rejected" }), preview.stats.rejected],
  ] as const;

  return (
    <section className="rr-card p-4 sm:p-6" aria-labelledby="sources-preview-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="rr-h6 rr-text-gold">{t("sources.preview.eyebrow", { defaultValue: "Review required" })}</p>
          <h3 id="sources-preview-heading" className="rr-h3 mt-1 text-foreground">
            {t("sources.preview.title", { defaultValue: "Import preview" })}
          </h3>
          <p className="rr-l2 mt-1 text-muted-foreground">
            {t("sources.preview.description", { defaultValue: "Duplicates are skipped. Nothing is sent when you import." })}
          </p>
        </div>
        {preview.reused && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("sources.preview.reused", { defaultValue: "Existing preview reused" })}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted p-3 text-center">
            <p className="rr-stat-number text-2xl">{value}</p>
            <p className="rr-l2 text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-border" tabIndex={0} aria-label={t("sources.preview.tableLabel", { defaultValue: "Contact import preview" })}>
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-bold">{t("sources.preview.name", { defaultValue: "Name" })}</th>
              <th className="px-3 py-2 font-bold">{t("sources.preview.email", { defaultValue: "Email" })}</th>
              <th className="px-3 py-2 font-bold">{t("sources.preview.phone", { defaultValue: "Phone" })}</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 100).map((row, index) => (
              <tr key={`${row.email}-${index}`} className="border-t border-border">
                <td className="px-3 py-2 font-semibold text-foreground">{row.name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button className="mt-4 min-h-12 w-full rounded-xl font-black sm:w-auto" onClick={onCommit} disabled={committing || preview.rows.length === 0}>
        {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t("sources.preview.commit", { defaultValue: "Import reviewed contacts" })}
      </Button>
    </section>
  );
}

export default function SourcesPage() {
  const { t, i18n } = useTranslation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<WorkspaceView>("overview");
  const [csvRows, setCsvRows] = useState<ImportRow[]>([]);
  const [csvFilename, setCsvFilename] = useState("");
  const [csvIdempotencyKey, setCsvIdempotencyKey] = useState(() => makeIdempotencyKey("csv"));
  const [csvPreview, setCsvPreview] = useState<ImportPreview | null>(null);
  const [wooPreview, setWooPreview] = useState<ImportPreview | null>(null);
  const [consentBasis, setConsentBasis] = useState<ConsentBasis>("express");
  const [consentSource, setConsentSource] = useState("");
  const [consentAttested, setConsentAttested] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");

  const overview = trpc.sources.overview.useQuery();
  const wooConnection = overview.data?.connections.find((connection) => connection.sourceType === "woocommerce");
  const wooSettings = useMemo(() => parseSettings(wooConnection?.settingsJson), [wooConnection?.settingsJson]);

  const canPreview = consentAttested && consentSource.trim().length >= 3;
  const consent = { basis: consentBasis, source: consentSource.trim(), attested: true as const };

  const connectWoo = trpc.sources.connectWooCommerce.useMutation({
    onSuccess: async () => {
      toast.success(t("sources.woo.connectedToast", { defaultValue: "WooCommerce connected securely." }));
      setConsumerKey("");
      setConsumerSecret("");
      await overview.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const disconnectWoo = trpc.sources.disconnectWooCommerce.useMutation({
    onSuccess: async () => {
      toast.success(t("sources.woo.disconnectedToast", { defaultValue: "WooCommerce disconnected." }));
      setWooPreview(null);
      await overview.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const stageWoo = trpc.woo.sync.useMutation({
    onSuccess: async (result) => {
      toast.success(result.added > 0
        ? t("sources.woo.stagedToast", { defaultValue: "{{count}} contacts staged for review.", count: result.added })
        : t("sources.woo.noNewToast", { defaultValue: "No new WooCommerce contacts were found." }));
      setWooPreview(null);
      await Promise.all([overview.refetch(), utils.woo.pendingCount.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const previewCsv = trpc.sources.previewCsv.useMutation({
    onSuccess: (result) => setCsvPreview(result as ImportPreview),
    onError: (error) => toast.error(error.message),
  });
  const commitCsv = trpc.sources.commitCsv.useMutation({
    onSuccess: async (result) => {
      toast.success(t("sources.import.successToast", { defaultValue: "Imported {{imported}} contacts; skipped {{skipped}} duplicates.", imported: result.imported, skipped: result.skipped }));
      setCsvRows([]);
      setCsvFilename("");
      setCsvPreview(null);
      setCsvIdempotencyKey(makeIdempotencyKey("csv"));
      await overview.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const previewWoo = trpc.sources.previewWooPending.useMutation({
    onSuccess: (result) => setWooPreview(result as ImportPreview),
    onError: (error) => toast.error(error.message),
  });
  const commitWoo = trpc.sources.commitWooPending.useMutation({
    onSuccess: async (result) => {
      toast.success(t("sources.import.successToast", { defaultValue: "Imported {{imported}} contacts; skipped {{skipped}} duplicates.", imported: result.imported, skipped: result.skipped }));
      setWooPreview(null);
      await overview.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  async function handleCsvFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("sources.csv.tooLarge", { defaultValue: "Choose a CSV file smaller than 2 MB." }));
      return;
    }
    try {
      const { headers, records } = parseCsv(await file.text());
      const fieldLookup = headers.map((field) => ({ normalized: field.trim().toLowerCase(), original: field }));
      const emailField = fieldLookup.find(({ normalized }) => normalized === "email" || normalized.includes("email"))?.original;
      const nameField = fieldLookup.find(({ normalized }) => normalized === "name" || normalized === "full name" || normalized.includes("customer name"))?.original;
      const firstNameField = fieldLookup.find(({ normalized }) => normalized === "first name" || normalized === "firstname")?.original;
      const lastNameField = fieldLookup.find(({ normalized }) => normalized === "last name" || normalized === "lastname")?.original;
      const phoneField = fieldLookup.find(({ normalized }) => normalized.includes("phone") || normalized.includes("mobile"))?.original;
      if (!emailField) {
        toast.error(t("sources.csv.emailMissing", { defaultValue: "The CSV needs an email column." }));
        return;
      }
      const rows = records.map((row) => ({
        name: nameField ? row[nameField] ?? "" : `${firstNameField ? row[firstNameField] ?? "" : ""} ${lastNameField ? row[lastNameField] ?? "" : ""}`.trim(),
        email: row[emailField] ?? "",
        phone: phoneField ? row[phoneField] || undefined : undefined,
      }));
      setCsvRows(rows);
      setCsvFilename(file.name);
      setCsvIdempotencyKey(makeIdempotencyKey("csv"));
      setCsvPreview(null);
      toast.success(t("sources.csv.loadedToast", { defaultValue: "Loaded {{count}} rows for review.", count: rows.length }));
    } catch {
      toast.error(t("sources.csv.parseError", { defaultValue: "The CSV could not be read. Check its formatting and try again." }));
    }
  }

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }), [i18n.language]);

  if (overview.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin rr-text-gold" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-8">
      <header className="rr-bg-navy px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[oklch(0.80_0.18_80/0.15)] p-3"><DatabaseZap className="h-6 w-6 rr-text-gold" /></div>
            <div>
              <p className="rr-h6 rr-text-gold">{t("sources.eyebrow", { defaultValue: "Contact intake" })}</p>
              <h1 className="rr-h1 mt-1">{t("sources.title", { defaultValue: "Sources" })}</h1>
              <p className="rr-b2 rr-on-dark-secondary mt-2 max-w-2xl">
                {t("sources.subtitle", { defaultValue: "Connect approved data sources, review every person, and add consented contacts without starting a campaign." })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-50 p-4 sm:grid-cols-3 dark:border-emerald-300/20 dark:bg-emerald-300/5">
          {[
            [LockKeyhole, t("sources.safeguards.encrypted", { defaultValue: "Credentials encrypted at rest" })],
            [Users, t("sources.safeguards.reviewed", { defaultValue: "Contacts reviewed before import" })],
            [ShieldCheck, t("sources.safeguards.noSend", { defaultValue: "Importing never sends messages" })],
          ].map(([Icon, label]) => {
            const SafeguardIcon = Icon as typeof LockKeyhole;
            return <div key={String(label)} className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200"><SafeguardIcon className="h-4 w-4 flex-none" />{String(label)}</div>;
          })}
        </div>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label={t("sources.nav.label", { defaultValue: "Sources workspace" })}>
          {(["overview", "csv", "woocommerce", "history"] as WorkspaceView[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              aria-current={view === item ? "page" : undefined}
              className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-black transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-sm"}`}
            >
              {t(`sources.nav.${item}`, { defaultValue: item === "woocommerce" ? "WooCommerce" : item[0].toUpperCase() + item.slice(1) })}
            </button>
          ))}
        </nav>

        {overview.isError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
            <div><p className="font-bold">{t("sources.error.title", { defaultValue: "Sources could not load" })}</p><p className="text-sm">{overview.error.message}</p></div>
          </div>
        )}

        {view === "overview" && (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("sources.cards.label", { defaultValue: "Available data sources" })}>
              {sourceCards.map(({ key, icon: Icon, available }) => {
                const connected = key === "woocommerce" && Boolean(wooConnection);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    onClick={() => available && setView(key as WorkspaceView)}
                    className="rr-card group min-h-40 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-xl bg-[oklch(0.80_0.18_80/0.12)] p-2.5"><Icon className="h-5 w-5 rr-text-gold" /></span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${connected ? "bg-emerald-100 text-emerald-800" : available ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground"}`}>
                        {connected ? t("sources.status.connected", { defaultValue: "Connected" }) : available ? t("sources.status.available", { defaultValue: "Available" }) : t("sources.status.comingSoon", { defaultValue: "Coming soon" })}
                      </span>
                    </div>
                    <h2 className="rr-h4 mt-4 text-foreground">{t(`sources.cards.${key}.title`, { defaultValue: key === "csv" ? "CSV file" : key[0].toUpperCase() + key.slice(1) })}</h2>
                    <p className="rr-l2 mt-1 text-muted-foreground">{t(`sources.cards.${key}.description`, { defaultValue: available ? "Review and add consented contacts." : "Planned connector." })}</p>
                    {available && <span className="mt-3 inline-flex items-center gap-1 text-xs font-black rr-text-gold">{t("sources.cards.open", { defaultValue: "Open source" })}<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>}
                  </button>
                );
              })}
            </section>

            <section className="rr-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="rr-h6 rr-text-gold">{t("sources.activity.eyebrow", { defaultValue: "Recent activity" })}</p><h2 className="rr-h3 mt-1 text-foreground">{t("sources.activity.title", { defaultValue: "Import history" })}</h2></div><Button variant="outline" onClick={() => setView("history")}>{t("sources.activity.viewAll", { defaultValue: "View all" })}</Button></div>
              {overview.data?.imports.length ? (
                <div className="mt-4 space-y-2">{overview.data.imports.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{t(`sources.type.${item.sourceType}`, { defaultValue: item.sourceType })}</p><p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(item.createdAt))}</p></div><span className="rounded-full bg-background px-2.5 py-1 text-xs font-black text-muted-foreground">{t(`sources.importStatus.${item.status}`, { defaultValue: item.status })}</span></div>)}</div>
              ) : <p className="rr-b2 mt-4 text-muted-foreground">{t("sources.activity.empty", { defaultValue: "No imports yet. Choose a source to begin with a review-only preview." })}</p>}
            </section>
          </div>
        )}

        {view === "csv" && (
          <div className="space-y-5">
            <section className="rr-card p-5 sm:p-6">
              <p className="rr-h6 rr-text-gold">{t("sources.csv.eyebrow", { defaultValue: "One-time import" })}</p>
              <h2 className="rr-h2 mt-1 text-foreground">{t("sources.csv.title", { defaultValue: "Upload a CSV" })}</h2>
              <p className="rr-b2 mt-2 text-muted-foreground">{t("sources.csv.description", { defaultValue: "Use a header row with an email column. Up to 1,000 rows and 2 MB per reviewed import." })}</p>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => handleCsvFile(event.target.files?.[0])} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-5 text-center transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Upload className="h-7 w-7 rr-text-gold" />
                <span className="rr-l1 mt-2 text-foreground">{csvFilename || t("sources.csv.choose", { defaultValue: "Choose CSV file" })}</span>
                <span className="rr-l2 mt-1 text-muted-foreground">{csvRows.length ? t("sources.csv.rowsLoaded", { defaultValue: "{{count}} rows loaded", count: csvRows.length }) : t("sources.csv.chooseHelp", { defaultValue: "Email is required; name and phone are optional" })}</span>
              </button>
            </section>
            <ConsentPanel basis={consentBasis} source={consentSource} attested={consentAttested} onBasisChange={setConsentBasis} onSourceChange={setConsentSource} onAttestedChange={setConsentAttested} />
            {!csvPreview ? (
              <Button className="min-h-12 w-full rounded-xl font-black sm:w-auto" disabled={!canPreview || csvRows.length === 0 || previewCsv.isPending} onClick={() => previewCsv.mutate({ idempotencyKey: csvIdempotencyKey, rows: csvRows, consent })}>
                {previewCsv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
                {t("sources.preview.create", { defaultValue: "Create review preview" })}
              </Button>
            ) : <PreviewPanel preview={csvPreview} committing={commitCsv.isPending} onCommit={() => commitCsv.mutate({ importId: csvPreview.importRecord.id, rows: csvPreview.rows })} />}
          </div>
        )}

        {view === "woocommerce" && (
          <div className="space-y-5">
            {!wooConnection ? (
              <section className="rr-card p-5 sm:p-6">
                <p className="rr-h6 rr-text-gold">{t("sources.woo.eyebrow", { defaultValue: "Secure connection" })}</p>
                <h2 className="rr-h2 mt-1 text-foreground">{t("sources.woo.connectTitle", { defaultValue: "Connect WooCommerce" })}</h2>
                <p className="rr-b2 mt-2 text-muted-foreground">{t("sources.woo.connectDescription", { defaultValue: "Use read-only WooCommerce REST API credentials. Secrets are encrypted and never displayed after saving." })}</p>
                <div className="mt-5 grid gap-4">
                  <div className="space-y-2"><Label htmlFor="woo-store-url">{t("sources.woo.storeUrl", { defaultValue: "Store URL" })}</Label><Input id="woo-store-url" type="url" value={storeUrl} onChange={(event) => setStoreUrl(event.target.value)} placeholder="https://store.example.com" className="min-h-11" /></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="woo-consumer-key">{t("sources.woo.consumerKey", { defaultValue: "Consumer key" })}</Label><Input id="woo-consumer-key" value={consumerKey} onChange={(event) => setConsumerKey(event.target.value)} autoComplete="off" className="min-h-11" /></div>
                    <div className="space-y-2"><Label htmlFor="woo-consumer-secret">{t("sources.woo.consumerSecret", { defaultValue: "Consumer secret" })}</Label><Input id="woo-consumer-secret" type="password" value={consumerSecret} onChange={(event) => setConsumerSecret(event.target.value)} autoComplete="new-password" className="min-h-11" /></div>
                  </div>
                </div>
                <Button className="mt-5 min-h-12 w-full rounded-xl font-black sm:w-auto" disabled={connectWoo.isPending || storeUrl.trim().length < 8 || consumerKey.trim().length < 8 || consumerSecret.trim().length < 8} onClick={() => connectWoo.mutate({ storeUrl: storeUrl.trim(), consumerKey: consumerKey.trim(), consumerSecret: consumerSecret.trim() })}>
                  {connectWoo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}{t("sources.woo.connect", { defaultValue: "Test and connect" })}
                </Button>
              </section>
            ) : (
              <>
                <section className="rr-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />{t("sources.status.connected", { defaultValue: "Connected" })}</span><h2 className="rr-h2 mt-3 text-foreground">WooCommerce</h2><p className="rr-l2 mt-1 text-muted-foreground">{wooSettings.storeUrl || t("sources.woo.connectedStore", { defaultValue: "Connected store" })}</p></div>
                    <Button variant="outline" className="min-h-11" disabled={disconnectWoo.isPending} onClick={() => disconnectWoo.mutate()}>{disconnectWoo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}{t("sources.woo.disconnect", { defaultValue: "Disconnect" })}</Button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted p-4"><p className="rr-stat-number text-3xl">{overview.data?.pendingWooCount ?? 0}</p><p className="rr-l2 text-muted-foreground">{t("sources.woo.pending", { defaultValue: "Staged contacts awaiting review" })}</p></div>
                    <div className="rounded-xl bg-muted p-4"><p className="flex items-center gap-2 text-sm font-black text-foreground"><ShieldCheck className="h-4 w-4 text-emerald-600" />{t("sources.woo.manualOnly", { defaultValue: "Manual review only" })}</p><p className="rr-l2 mt-2 text-muted-foreground">{t("sources.woo.manualDescription", { defaultValue: "No schedules and no automatic campaigns." })}</p></div>
                  </div>
                  <Button variant="secondary" className="mt-4 min-h-11 w-full sm:w-auto" disabled={stageWoo.isPending} onClick={() => stageWoo.mutate({ days: 30 })}>{stageWoo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t("sources.woo.fetch", { defaultValue: "Fetch recent orders for review" })}</Button>
                </section>
                <ConsentPanel basis={consentBasis} source={consentSource} attested={consentAttested} onBasisChange={setConsentBasis} onSourceChange={setConsentSource} onAttestedChange={setConsentAttested} />
                {!wooPreview ? (
                  <Button className="min-h-12 w-full rounded-xl font-black sm:w-auto" disabled={!canPreview || (overview.data?.pendingWooCount ?? 0) === 0 || previewWoo.isPending} onClick={() => previewWoo.mutate({ idempotencyKey: makeIdempotencyKey("woo"), consent })}>{previewWoo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}{t("sources.preview.create", { defaultValue: "Create review preview" })}</Button>
                ) : <PreviewPanel preview={wooPreview} committing={commitWoo.isPending} onCommit={() => commitWoo.mutate({ importId: wooPreview.importRecord.id })} />}
              </>
            )}
          </div>
        )}

        {view === "history" && (
          <section className="rr-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-2.5"><History className="h-5 w-5 rr-text-gold" /></span><div><p className="rr-h6 rr-text-gold">{t("sources.history.eyebrow", { defaultValue: "Audit trail" })}</p><h2 className="rr-h2 mt-1 text-foreground">{t("sources.history.title", { defaultValue: "Import history" })}</h2><p className="rr-b2 mt-1 text-muted-foreground">{t("sources.history.description", { defaultValue: "PII-free counts and consent metadata for your most recent reviewed imports." })}</p></div></div>
            {overview.data?.imports.length ? (
              <div className="mt-5 overflow-x-auto rounded-xl border border-border" tabIndex={0}>
                <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-3 font-bold">{t("sources.history.source", { defaultValue: "Source" })}</th><th className="px-3 py-3 font-bold">{t("sources.history.date", { defaultValue: "Date" })}</th><th className="px-3 py-3 font-bold">{t("sources.history.status", { defaultValue: "Status" })}</th><th className="px-3 py-3 font-bold">{t("sources.history.valid", { defaultValue: "Valid" })}</th><th className="px-3 py-3 font-bold">{t("sources.history.imported", { defaultValue: "Imported" })}</th><th className="px-3 py-3 font-bold">{t("sources.history.skipped", { defaultValue: "Skipped" })}</th></tr></thead><tbody>{overview.data.imports.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-3 py-3 font-bold text-foreground">{t(`sources.type.${item.sourceType}`, { defaultValue: item.sourceType })}</td><td className="px-3 py-3 text-muted-foreground">{dateFormatter.format(new Date(item.createdAt))}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">{t(`sources.importStatus.${item.status}`, { defaultValue: item.status })}</span></td><td className="px-3 py-3 text-muted-foreground">{item.validRowCount}</td><td className="px-3 py-3 text-muted-foreground">{item.importedCount}</td><td className="px-3 py-3 text-muted-foreground">{item.skippedCount}</td></tr>)}</tbody></table>
              </div>
            ) : <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center"><Clock3 className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="rr-h4 mt-3 text-foreground">{t("sources.history.emptyTitle", { defaultValue: "No import history yet" })}</h3><p className="rr-b2 mt-1 text-muted-foreground">{t("sources.history.emptyDescription", { defaultValue: "Reviewed imports will appear here with counts and status." })}</p></div>}
          </section>
        )}
      </div>
    </div>
  );
}
