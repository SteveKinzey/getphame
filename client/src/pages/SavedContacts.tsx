/**
 * SavedContacts — manage repeat customers for re-sending review requests.
 * Supports individual send, bulk-select, and "Send to Selected" action.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createContactExportPdfBlob, downloadContactExportBlob } from "@/lib/contactExportPdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import AdaptiveSendLimitStatus from "@/components/AdaptiveSendLimitStatus";
import {
  UserPlus,
  Send,
  Pencil,
  Trash2,
  ChevronLeft,
  Mail,
  Phone,
  Clock,
  Upload,
  CheckSquare,
  Square,
  Loader2,
  X,
  Star,
  Tag,
  Plus,
  Globe,
  ChevronDown,
  RefreshCw,
  ShoppingCart,
  CreditCard,
  Search,
  Download,
  UserX,
  History,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Eye,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  lastSentAt: number | null;
  totalSent: number;
  tags: string | null;
  source: string | null;
  optedOut?: number | null;
  sourceApp?: string | null;
  consentBasis?: string | null;
  consentCapturedAt?: number | null;
  consentSource?: string | null;
  optedOutAt?: number | null;
  createdAt?: Date | number | null;
};

type NaturalContactSearchResult = RouterOutputs["contacts"]["naturalSearch"];

function toContactSearchLocale(language: string): "en" | "zh-CN" | "es" | "fr" | "it" | "th" | "zh-TW" {
  const normalized = language.toLocaleLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk") || normalized.startsWith("zh-hant")) return "zh-TW";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("th")) return "th";
  return "en";
}

function ContactListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="rounded-2xl border border-[oklch(0.92_0.01_260)] bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/5 motion-reduce:animate-none" />
              <Skeleton className="h-3.5 w-3/5 motion-reduce:animate-none" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-16 rounded-full motion-reduce:animate-none" />
                <Skeleton className="h-5 w-20 rounded-full motion-reduce:animate-none" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

type FormData = { name: string; email: string; phone: string; notes: string; consentGiven: boolean };
const emptyForm: FormData = { name: "", email: "", phone: "", notes: "", consentGiven: false };

export default function SavedContacts() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { track } = useAnalytics();

  const [search, setSearch] = useState("");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [naturalSearchResult, setNaturalSearchResult] = useState<NaturalContactSearchResult | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "pdf" | null>(null);
  const [dormancyFilter, setDormancyFilter] = useState<"all" | "30" | "60" | "90">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "stripe" | "woocommerce" | "manual">("all");
  const [optedOutFilter, setOptedOutFilter] = useState<"all" | "unsubscribed">("all");
  const [consentFilter, setConsentFilter] = useState<"all" | "consent" | "no_consent" | "opted_out">(() => {
    // Initialize from URL query param: ?consent=consented
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const c = params.get("consent");
      if (c === "consented") return "consent";
      if (c === "no_consent") return "no_consent";
      if (c === "opted_out") return "opted_out";
    }
    return "all";
  });
  const [tagInputId, setTagInputId] = useState<number | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [sendTarget, setSendTarget] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // WooCommerce sync day range
  const [wooDays, setWooDays] = useState<30 | 60 | 90>(30);
  const [wooSyncHistoryOpen, setWooSyncHistoryOpen] = useState(false);
  const [wooHistorySearch, setWooHistorySearch] = useState("");

  const { data: wooSyncHistory = [] } = trpc.woo.syncHistory.useQuery(undefined, {
    enabled: isAuthenticated && wooSyncHistoryOpen,
  });

  // Bulk selection state
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkPlatformId, setBulkPlatformId] = useState<number | null>(null);
  const [scheduleReminders, setScheduleReminders] = useState(false);

  // Compliance checklist state
  const [complianceChecked, setComplianceChecked] = useState({ realCustomers: false, noIncentives: false, allCustomers: false });
  const allComplianceChecked = complianceChecked.realCustomers && complianceChecked.noIncentives && complianceChecked.allCustomers;

  // Send history drawer state
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const { data: sendHistory = [], isLoading: historyLoading } = trpc.contacts.sendHistory.useQuery(
    { contactId: historyContact?.id ?? 0 },
    { enabled: historyDrawerOpen && !!historyContact }
  );

  // Daily send status
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dailyStatus } = trpc.contacts.getDailyStatus.useQuery(undefined, { enabled: isAuthenticated });

  // Review platforms
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery(undefined, { enabled: isAuthenticated });
  const PLATFORM_LABELS: Record<string, string> = { google: "Google", yelp: "Yelp", tripadvisor: "TripAdvisor", bing: "Bing", facebook: "Facebook", apple: "Apple Maps", other: "Other" };

  const utils = trpc.useUtils();

  const { data: contacts = [], isLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const naturalSearchMutation = trpc.contacts.naturalSearch.useMutation({
    onSuccess: (result) => {
      setNaturalSearchResult(result);
      setSelected(new Set());
      track("contact_natural_search", {
        matched: result.matchedCount,
        truncated: result.truncated,
        parser: result.source,
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const prepareExportMutation = trpc.contacts.prepareExport.useMutation();

  const { data: syncStatus } = trpc.contacts.syncStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Contact saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDialogOpen(false);
      setEditContact(null);
      setForm(emptyForm);
      toast.success("Contact updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDeleteTarget(null);
      toast.success("Contact deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.requests.send.useMutation({
    onSuccess: () => {
      if (sendTarget) {
        markSentMutation.mutate({ id: sendTarget.id });
      }
      utils.contacts.list.invalidate();
      utils.requests.stats.invalidate();
      setSendTarget(null);
      toast.success("Review request sent!");
    },
    onError: (e) => {
      setSendTarget(null);
      toast.error(e.message);
    },
  });

  const markSentMutation = trpc.contacts.markSent.useMutation();

  // WooCommerce credentials (for last-synced timestamp)
  const { data: wooCreds } = trpc.woo.getCredentials.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const syncFromWooMutation = trpc.woo.sync.useMutation({
    onSuccess: (result) => {
      utils.contacts.list.invalidate();
      utils.woo.getCredentials.invalidate();
      const newContacts = result.added ?? 0;
      toast.success(
        `WooCommerce synced — ${result.total} customer${result.total !== 1 ? "s" : ""}` +
        (newContacts > 0 ? `, ${newContacts} new contact${newContacts !== 1 ? "s" : ""} added.` : ".")
      );
    },
    onError: (e) => toast.error(e.message),
  });

  // Source counts (computed from full contacts list, not filtered)
  const sourceCounts = {
    stripe: contacts.filter((c) => c.source === "stripe").length,
    woocommerce: contacts.filter((c) => c.source === "woocommerce").length,
    manual: contacts.filter((c) => !c.source || c.source === "manual").length,
  };

  const syncFromStripeMutation = trpc.contacts.syncFromStripe.useMutation({
    onSuccess: (result) => {
      utils.contacts.list.invalidate();
      if (result.inserted > 0) {
        toast.success(`${result.inserted} new contact${result.inserted !== 1 ? "s" : ""} imported from Stripe.`);
      } else {
        toast.info(result.total === 0 ? "No Stripe customers found." : "All Stripe customers are already in your contacts.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const setTagsMutation = trpc.contacts.setTags.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setTagInputId(null);
      setTagInputValue("");
    },
    onError: (e) => toast.error(e.message),
  });
  const [consentConfirmOpen, setConsentConfirmOpen] = useState(false);
  const [consentCustomSubject, setConsentCustomSubject] = useState("");
  const [consentCustomBody, setConsentCustomBody] = useState("");
  const [consentPreviewOpen, setConsentPreviewOpen] = useState(false);
  const [consentPreviewMode, setConsentPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const bulkConsentRequestMutation = trpc.contacts.bulkConsentRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`Consent emails sent: ${result.sent} delivered${result.failed > 0 ? `, ${result.failed} failed — check SMTP settings` : ""}.`);
      utils.contacts.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const sendConsentTestMutation = trpc.contacts.sendConsentTestEmail.useMutation({
    onSuccess: (result) => {
      toast.success(`Test email sent to ${result.to}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Collect all unique tags across all contacts for the filter row
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => parseTags(c.tags)))
  ).sort();

  const bulkSendMutation = trpc.contacts.bulkSend.useMutation({
    onSuccess: (result) => {
      utils.contacts.list.invalidate();
      utils.requests.stats.invalidate();
      utils.contacts.getDailyStatus.invalidate();
      setSelected(new Set());
      setBulkConfirmOpen(false);
      if (result.sent > 0) track("bulk_send", { count: result.sent });

      const queued = result.queued ?? 0;
      if (result.sent + queued > 0 && result.failed === 0) {
        toast.success(
          `${result.sent} review request${result.sent !== 1 ? "s" : ""} sent` +
          (queued > 0 ? `; ${queued} queued until local quiet hours end` : "!") +
          (result.skippedDueToLimit > 0 ? ` (${result.skippedDueToLimit} skipped — free limit reached)` : "")
        );
      } else if (result.sent + queued > 0 && result.failed > 0) {
        toast.warning(`${result.sent} sent, ${queued} queued, ${result.failed} failed. Check your email connection in Settings.`);
      } else {
        toast.error(`All ${result.failed} sends failed. Check your email connection in Settings.`);
      }
    },
    onError: (e) => {
      setBulkConfirmOpen(false);
      toast.error(e.message);
    },
  });

  const now = Date.now();
  const searchableContacts: Contact[] = naturalSearchResult?.results ?? contacts;
  const filtered = searchableContacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (tagFilter && !parseTags(c.tags).includes(tagFilter)) return false;
    if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
    if (optedOutFilter === "unsubscribed" && !c.optedOut) return false;
    if (consentFilter === "consent" && c.consentBasis !== "explicit_opt_in") return false;
    if (consentFilter === "no_consent" && (c.consentBasis === "explicit_opt_in" || c.consentBasis === "opted_out")) return false;
    if (consentFilter === "opted_out" && c.consentBasis !== "opted_out") return false;
    if (dormancyFilter === "all") return true;
    const days = parseInt(dormancyFilter, 10);
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return c.lastSentAt === null || c.lastSentAt < cutoff;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelected(new Set());

  const selectedCount = selected.size;
  const selectedIds = Array.from(selected);

  const interpretedFilters = naturalSearchResult ? [
    naturalSearchResult.filters.text ? t("contactsTools.filters.text", { value: naturalSearchResult.filters.text, defaultValue: `Matches “${naturalSearchResult.filters.text}”` }) : null,
    naturalSearchResult.filters.source ? t("contactsTools.filters.source", { value: naturalSearchResult.filters.source, defaultValue: `Source: ${naturalSearchResult.filters.source}` }) : null,
    naturalSearchResult.filters.tag ? t("contactsTools.filters.tag", { value: naturalSearchResult.filters.tag, defaultValue: `Tag: ${naturalSearchResult.filters.tag}` }) : null,
    naturalSearchResult.filters.sentState === "never" ? t("contactsTools.filters.neverSent", "Never contacted") : null,
    naturalSearchResult.filters.sentState === "sent" ? t("contactsTools.filters.sent", "Contacted before") : null,
    naturalSearchResult.filters.sentState === "dormant" ? t("contactsTools.filters.dormant", { count: naturalSearchResult.filters.dormantDays ?? 0, defaultValue: `Not contacted in ${naturalSearchResult.filters.dormantDays} days` }) : null,
    naturalSearchResult.filters.consent === "recorded" ? t("contactsTools.filters.consentRecorded", "Consent recorded") : null,
    naturalSearchResult.filters.consent === "missing" ? t("contactsTools.filters.consentMissing", "Consent not recorded") : null,
    naturalSearchResult.filters.suppression === "active" ? t("contactsTools.filters.active", "Active contacts") : null,
    naturalSearchResult.filters.suppression === "opted_out" ? t("contactsTools.filters.optedOut", "Opted out") : null,
    naturalSearchResult.filters.createdFrom ? t("contactsTools.filters.createdFrom", { value: naturalSearchResult.filters.createdFrom, defaultValue: `Added after ${naturalSearchResult.filters.createdFrom}` }) : null,
    naturalSearchResult.filters.createdTo ? t("contactsTools.filters.createdTo", { value: naturalSearchResult.filters.createdTo, defaultValue: `Added before ${naturalSearchResult.filters.createdTo}` }) : null,
  ].filter((filter): filter is string => Boolean(filter)) : [];

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  function openCreate() {
    setEditContact(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setForm({ name: c.name, email: c.email, phone: c.phone ?? "", notes: c.notes ?? "", consentGiven: false });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!editContact && !form.consentGiven) {
      toast.error(t("contactsTools.addConsentRequired", "Consent confirmation is required to add a contact"));
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editContact) {
      updateMutation.mutate({ id: editContact.id, ...payload });
    } else {
      createMutation.mutate({ ...payload, consentGiven: true, consentSource: "manual_add_contact_form" });
    }
  }

  function runNaturalSearch(query = naturalQuery) {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      toast.error(t("contactsTools.search.minimum", "Describe what you want to find using at least 3 characters."));
      return;
    }
    setNaturalQuery(trimmed);
    naturalSearchMutation.mutate({
      query: trimmed,
      locale: toContactSearchLocale(i18n.resolvedLanguage || i18n.language),
    });
  }

  function clearNaturalSearch() {
    setNaturalQuery("");
    setNaturalSearchResult(null);
    setSelected(new Set());
  }

  async function exportVisibleContacts(format: "csv" | "pdf") {
    if (filtered.length === 0) {
      toast.error(t("contactsTools.export.empty", "There are no visible contacts to export."));
      return;
    }

    const contactIds = filtered.slice(0, 5_000).map((contact) => contact.id);
    const clientTruncated = filtered.length > contactIds.length;
    setExportingFormat(format);
    try {
      const snapshot = await prepareExportMutation.mutateAsync({ contactIds, format });
      if (snapshot.exportedCount === 0) {
        toast.error(t("contactsTools.export.unavailable", "These contacts are no longer available to export."));
        return;
      }

      if (format === "csv") {
        const blob = new Blob([snapshot.csv ?? ""], { type: "text/csv;charset=utf-8" });
        downloadContactExportBlob(blob, snapshot.filename);
      } else {
        const blob = await createContactExportPdfBlob({
          snapshot,
          locale: i18n.resolvedLanguage || i18n.language || "en",
          generatedAt: new Date(),
          labels: {
            title: t("contactsTools.export.pdf.title", "Contact Export"),
            generated: t("contactsTools.export.pdf.generated", "Generated"),
            contacts: t("contactsTools.export.pdf.contacts", "Contacts"),
            truncated: t("contactsTools.export.pdf.truncated", "Limited to the first 750 contacts"),
            contact: t("contactsTools.export.pdf.contact", "Contact"),
            sourceAndTags: t("contactsTools.export.pdf.sourceAndTags", "Source / tags"),
            consent: t("contactsTools.export.pdf.consent", "Consent"),
            sends: t("contactsTools.export.pdf.sends", "Sends / last sent"),
            status: t("contactsTools.export.pdf.status", "Status"),
            created: t("contactsTools.export.pdf.created", "Created"),
            page: t("contactsTools.export.pdf.page", "Page {{current}} of {{total}}"),
          },
        });
        downloadContactExportBlob(blob, snapshot.filename);
      }

      const truncated = clientTruncated || snapshot.truncated;
      track("contact_export", { format, count: snapshot.exportedCount, truncated });
      toast.success(
        truncated
          ? t("contactsTools.export.successTruncated", { count: snapshot.exportedCount, defaultValue: `Downloaded ${snapshot.exportedCount} contacts. The export limit was applied.` })
          : t("contactsTools.export.success", { count: snapshot.exportedCount, defaultValue: `Downloaded ${snapshot.exportedCount} contacts.` }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("contactsTools.export.failed", "The export could not be prepared."));
    } finally {
      setExportingFormat(null);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-base font-bold rr-text-gold transition-opacity"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Saved Contacts
            </h1>
            <p className="text-base font-bold mt-1 text-white">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              {selectedCount > 0 && (
                <span className="rr-text-gold">
                  {" "}· {selectedCount} selected
                </span>
              )}
            </p>
          </div>
          {/* Gold Add button stays top-right */}
          <Button
            onClick={openCreate}
            size="sm"
            className="font-bold shrink-0 rr-bg-gold rr-text-navy"
          >
            <UserPlus size={16} className="mr-1" /> Add
          </Button>
        </div>
        {/* Action buttons row — scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {wooCreds && (
            <>
              <select
                value={wooDays}
                onChange={(e) => setWooDays(Number(e.target.value) as 30 | 60 | 90)}
                disabled={syncFromWooMutation.isPending}
                className="text-sm font-bold rounded-lg px-2 py-1.5 outline-none appearance-none cursor-pointer shrink-0"
                style={{
                  background: "oklch(0.32 0.07 260)",
                  color: "oklch(0.72 0.18 160)",
                  border: "none",
                  minWidth: "72px",
                }}
                title="Sync window"
               name="rr-pages-saved-contacts-woo-days-607">
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <Button
                onClick={() => syncFromWooMutation.mutate({ days: wooDays })}
                disabled={syncFromWooMutation.isPending}
                size="sm"
                variant="outline"
                className="font-bold border-0 shrink-0"
                style={{ background: "oklch(0.32 0.07 260)", color: "oklch(0.72 0.18 160)" }}
                title={wooCreds.lastSyncedAt ? `Last synced ${format(new Date(wooCreds.lastSyncedAt), "MMM d, h:mm a")}` : "Import customers from WooCommerce"}
              >
                {syncFromWooMutation.isPending ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <ShoppingCart size={14} className="mr-1" />
                )}
                {t("pageHeader.syncFromWooCommerce")}
              </Button>
            </>
          )}
          <Button
            onClick={() => syncFromStripeMutation.mutate()}
            disabled={syncFromStripeMutation.isPending}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0 rr-text-gold" style={{ background: "oklch(0.32 0.07 260)" }}
            title={syncStatus?.stripeLastSyncedAt ? `Last synced ${format(new Date(syncStatus.stripeLastSyncedAt), "MMM d, h:mm a")}` : "Import customers from Stripe"}
          >
            {syncFromStripeMutation.isPending ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <CreditCard size={14} className="mr-1" />
            )}
            {t("pageHeader.importFromStripe")}{syncStatus?.stripeLastSyncedAt ? (
              <span className="ml-1 opacity-60 text-xs font-normal">
                · {format(new Date(syncStatus.stripeLastSyncedAt), "MMM d")}
              </span>
            ) : null}
          </Button>
          <Button
            onClick={() => navigate("/import")}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0 rr-text-gold" style={{ background: "oklch(0.32 0.07 260)" }}
          >
            <Upload size={14} className="mr-1" /> {t("pageHeader.importCsv", "Import CSV")}
          </Button>
          <Button
            onClick={() => exportVisibleContacts("csv")}
            disabled={filtered.length === 0 || exportingFormat !== null || isLoading}
            aria-busy={exportingFormat === "csv"}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0 rr-text-gold"
            style={{ background: "oklch(0.32 0.07 260)" }}
            title={t("contactsTools.export.csvTitle", "Download the currently visible contacts as a sanitized CSV")}
          >
            {exportingFormat === "csv" ? <Loader2 size={14} className="mr-1 animate-spin" aria-hidden="true" /> : <FileSpreadsheet size={14} className="mr-1" aria-hidden="true" />}
            {exportingFormat === "csv" ? t("contactsTools.export.preparing", "Preparing…") : t("contactsTools.export.csv", "Export CSV")}
          </Button>
          <Button
            onClick={() => exportVisibleContacts("pdf")}
            disabled={filtered.length === 0 || exportingFormat !== null || isLoading}
            aria-busy={exportingFormat === "pdf"}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0 rr-text-gold"
            style={{ background: "oklch(0.32 0.07 260)" }}
            title={t("contactsTools.export.pdfTitle", "Download the currently visible contacts as a PDF")}
          >
            {exportingFormat === "pdf" ? <Loader2 size={14} className="mr-1 animate-spin" aria-hidden="true" /> : <FileText size={14} className="mr-1" aria-hidden="true" />}
            {exportingFormat === "pdf" ? t("contactsTools.export.preparing", "Preparing…") : t("contactsTools.export.pdfButton", "Export PDF")}
          </Button>
        </div>
      </div>

      {/* WooCommerce last-synced status line */}
      {wooCreds && (
        <div
          className="flex items-center gap-1.5 px-4 py-2"
          style={{ background: "oklch(0.96 0.02 260)", borderBottom: "1px solid oklch(0.91 0.02 260)" }}
        >
          <ShoppingCart size={12} className="rr-text-navy-muted" aria-hidden="true" />
          <span className="text-xs flex items-center gap-1 rr-text-navy-muted">
            WooCommerce —
            {syncFromWooMutation.isPending ? (
              <span className="ml-1 font-semibold" style={{ color: "oklch(0.72 0.18 160)" }}>Syncing…</span>
            ) : wooCreds.lastSyncedAt ? (
              <>
                <span className="ml-1 font-semibold" style={{ color: "oklch(0.40 0.05 260)" }}>
                  Last synced {format(new Date(wooCreds.lastSyncedAt), "MMM d 'at' h:mm a")}
                </span>
                <button
                  onClick={() => setWooSyncHistoryOpen(true)}
                  aria-label="View sync history"
                  className="ml-1 inline-flex items-center justify-center rounded hover:bg-gray-100 p-0.5 transition-colors"
                  title="View sync history"
                >
                  <Clock size={12} style={{ color: "oklch(0.55 0.08 260)" }} />
                </button>
              </>
            ) : (
              <span className="ml-1 font-semibold" style={{ color: "oklch(0.60 0.04 260)" }}>Never synced — tap WooCommerce above to import</span>
            )}
          </span>
        </div>
      )}
      <div className="px-4 pt-4 space-y-3">
        <section
          aria-labelledby="contact-natural-search-heading"
          aria-busy={naturalSearchMutation.isPending}
          className="rounded-2xl border border-[oklch(0.86_0.04_80)] bg-white p-4 rr-shadow-soft"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="contact-natural-search-heading" className="text-base font-black rr-text-navy">
                {t("contactsTools.search.title", "Find contacts in plain language")}
              </h2>
              <p className="mt-0.5 text-sm rr-text-navy-muted">
                {t("contactsTools.search.description", "Describe the customers you need. Contact data stays in Get Phame; only your query is interpreted.")}
              </p>
            </div>
          </div>

          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              runNaturalSearch();
            }}
          >
            <Label htmlFor="natural-contact-search" className="sr-only">
              {t("contactsTools.search.label", "Conversational contact search")}
            </Label>
            <Input
              id="natural-contact-search"
              value={naturalQuery}
              onChange={(event) => setNaturalQuery(event.target.value)}
              maxLength={300}
              autoComplete="off"
              placeholder={t("contactsTools.search.placeholder", "Example: Stripe contacts not contacted in 90 days")}
              className="min-h-11 flex-1 bg-[oklch(0.98_0.01_80)]"
              aria-describedby="natural-contact-search-help"
            />
            <Button
              type="submit"
              disabled={naturalSearchMutation.isPending || naturalQuery.trim().length < 3}
              className="min-h-11 shrink-0 font-black rr-bg-gold rr-text-navy"
            >
              {naturalSearchMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> : <Search size={16} className="mr-2" aria-hidden="true" />}
              {naturalSearchMutation.isPending ? t("contactsTools.search.searching", "Interpreting…") : t("contactsTools.search.action", "Find contacts")}
            </Button>
          </form>
          <p id="natural-contact-search-help" className="mt-2 text-xs rr-text-navy-muted">
            {t("contactsTools.search.help", "Try a source, consent status, tag, suppression state, date, or follow-up interval.")}
          </p>

          {naturalSearchMutation.isPending && (
            <div role="status" aria-live="polite" className="mt-3 rounded-xl bg-[oklch(0.98_0.01_80)] p-3">
              <span className="sr-only">{t("contactsTools.search.searching", "Interpreting…")}</span>
              <div aria-hidden="true" className="space-y-2">
                <Skeleton className="h-4 w-44 motion-reduce:animate-none" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-28 rounded-full motion-reduce:animate-none" />
                  <Skeleton className="h-6 w-36 rounded-full motion-reduce:animate-none" />
                  <Skeleton className="h-6 w-24 rounded-full motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          )}

          {!naturalSearchResult && !naturalSearchMutation.isPending && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("contactsTools.search.examplesLabel", "Search examples")}>
              {[
                t("contactsTools.search.examples.dormant", "Stripe contacts not contacted in 90 days"),
                t("contactsTools.search.examples.consent", "Contacts with recorded consent"),
                t("contactsTools.search.examples.optedOut", "Show opted-out contacts"),
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => runNaturalSearch(example)}
                  className="shrink-0 rounded-full border border-[oklch(0.86_0.04_80)] bg-[oklch(0.98_0.01_80)] px-3 py-1.5 text-xs font-bold rr-text-navy transition-colors hover:bg-[oklch(0.94_0.04_80)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.18_80)]"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {naturalSearchResult && (
            <div className="mt-3 rounded-xl bg-[oklch(0.96_0.025_160)] p-3" aria-live="polite">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black rr-text-navy">
                    {t("contactsTools.search.matches", {
                      count: naturalSearchResult.matchedCount,
                      defaultValue: `${naturalSearchResult.matchedCount} matching contacts`,
                    })}
                  </p>
                  <p className="mt-0.5 text-xs rr-text-navy-muted">
                    {naturalSearchResult.truncated
                      ? t("contactsTools.search.truncated", { count: naturalSearchResult.results.length, defaultValue: `Showing the first ${naturalSearchResult.results.length} results.` })
                      : t("contactsTools.search.complete", "All matching contacts are shown.")}
                    {naturalSearchResult.redacted ? ` ${t("contactsTools.search.redacted", "A secret-like value was removed before interpretation.")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearNaturalSearch}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg rr-text-navy transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.72_0.18_80)]"
                  aria-label={t("contactsTools.search.clear", "Clear conversational search")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {interpretedFilters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t("contactsTools.search.interpretedAs", "Interpreted filters")}>
                  {interpretedFilters.map((filter) => (
                    <span key={filter} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold rr-text-navy">
                      {filter}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Search + Select All row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-4 pr-10 bg-white border-gray-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
              style={{
                background: allFilteredSelected ? "oklch(0.22 0.09 260)" : "white",
                color: allFilteredSelected ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.05 260)",
                border: "1px solid oklch(0.88 0.02 260)",
              }}
            >
              {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* Source filter pills */}
        {(() => {
          const hasStripe = contacts.some((c) => c.source === "stripe");
          const hasWoo = contacts.some((c) => c.source === "woocommerce");
          if (!hasStripe && !hasWoo) return null;
          const pillLabels: Record<string, string> = {
            all: `All Sources (${contacts.length})`,
            stripe: `Stripe (${sourceCounts.stripe})`,
            woocommerce: `WooCommerce (${sourceCounts.woocommerce})`,
            manual: `Manual (${sourceCounts.manual})`,
          };
          return (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Globe size={13} className="rr-text-navy-muted" style={{ flexShrink: "0" }} />
              {(["all", ...(hasStripe ? ["stripe"] : []), ...(hasWoo ? ["woocommerce"] : []), "manual"] as const).map((opt) => {
                const active = sourceFilter === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setSourceFilter(opt as "all" | "stripe" | "woocommerce" | "manual")}
                    className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                    style={{
                      background: active ? "oklch(0.45 0.12 280)" : "white",
                      color: active ? "white" : "oklch(0.45 0.05 260)",
                      border: "1px solid oklch(0.88 0.02 260)",
                    }}
                  >
                    {pillLabels[opt]}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Unsubscribed filter pill */}
        {contacts.some((c) => c.optedOut) && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <UserX size={13} className="rr-text-navy-muted" style={{ flexShrink: "0" }} />
            {(["all", "unsubscribed"] as const).map((opt) => {
              const label = opt === "all" ? "All" : "Unsubscribed";
              const active = optedOutFilter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setOptedOutFilter(opt)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                  style={{
                    background: active ? (opt === "unsubscribed" ? "oklch(0.60 0.18 25)" : "oklch(0.22 0.09 260)") : "white",
                    color: active ? "white" : "oklch(0.45 0.05 260)",
                    border: "1px solid oklch(0.88 0.02 260)",
                  }}
                >
                  {label}
                </button>
              );
            })}
            {optedOutFilter === "unsubscribed" && (
              <span className="text-xs ml-1 rr-text-navy-muted">
                {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Consent status filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <ShieldCheck size={13} className="rr-text-navy-muted" style={{ flexShrink: "0" as const }} />
          {(["all", "consent", "no_consent", "opted_out"] as const).map((opt) => {
            const labels: Record<string, string> = {
              all: "All consent",
              consent: "Consented",
              no_consent: "No consent",
              opted_out: "Opted out",
            };
            const colors: Record<string, string> = {
              all: "oklch(0.22 0.09 260)",
              consent: "oklch(0.38 0.12 145)",
              no_consent: "oklch(0.50 0.04 260)",
              opted_out: "oklch(0.60 0.18 25)",
            };
            const active = consentFilter === opt;
            return (
              <button
                key={opt}
                onClick={() => setConsentFilter(opt)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? colors[opt] : "white",
                  color: active ? "white" : "oklch(0.45 0.05 260)",
                  border: "1px solid oklch(0.88 0.02 260)",
                }}
              >
                {labels[opt]}
              </button>
            );
          })}
          {consentFilter !== "all" && (
            <span className="text-xs ml-1 rr-text-navy-muted">
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {/* Dormancy filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Clock size={13} className="rr-text-navy-muted" style={{ flexShrink: "0" }} />
          {(["all", "30", "60", "90"] as const).map((opt) => {
            const label = opt === "all" ? "All" : `Not in ${opt}d`;
            const active = dormancyFilter === opt;
            return (
              <button
                key={opt}
                onClick={() => setDormancyFilter(opt)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? "oklch(0.22 0.09 260)" : "white",
                  color: active ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.05 260)",
                  border: "1px solid oklch(0.88 0.02 260)",
                }}
              >
                {label}
              </button>
            );
          })}
          {dormancyFilter !== "all" && (
            <span className="text-xs ml-1 rr-text-navy-muted">
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Tag size={13} className="rr-text-navy-muted" style={{ flexShrink: "0" }} />
              <button
                onClick={() => setTagFilter(null)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: tagFilter === null ? "oklch(0.55 0.12 160)" : "white",
                  color: tagFilter === null ? "white" : "oklch(0.45 0.05 260)",
                  border: "1px solid oklch(0.88 0.02 260)",
                }}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
                  style={{
                    background: tagFilter === tag ? "oklch(0.55 0.12 160)" : "white",
                    color: tagFilter === tag ? "white" : "oklch(0.45 0.05 260)",
                    border: "1px solid oklch(0.88 0.02 260)",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Bulk-send shortcut — appears when a tag filter is active */}
            {tagFilter !== null && filtered.length > 0 && (
              <button
                onClick={() => {
                  // Select all contacts matching the current tag filter, then open bulk-send dialog
                  setSelected(new Set(filtered.map((c) => c.id)));
                  setBulkConfirmOpen(true);
                }}
                className="flex items-center gap-2 self-start px-4 py-2 rounded-xl text-sm font-bold transition-colors rr-bg-navy rr-text-gold"
              >
                <Star size={14} />
                Send to all "{tagFilter}" ({filtered.length})
              </button>
            )}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <ContactListSkeleton label={t("contactsTools.loading.contacts", "Loading saved contacts")} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {search || naturalSearchResult ? t("contactsTools.search.noMatches", "No matches found") : "No saved contacts yet"}
            </p>
            {!search && !naturalSearchResult && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-gray-400 text-sm">Import a CSV or add contacts manually</p>
                <Button
                  onClick={() => navigate("/import")}
                  size="sm"
                  className="font-bold mt-1 rr-bg-navy rr-text-gold"
                >
                  <Upload size={14} className="mr-1" /> Import CSV
                </Button>
              </div>
            )}
          </div>
        ) : (
          filtered.map((c, index) => {
            const isChecked = selected.has(c.id);
            return (
              <div
                key={c.id}
                className="contact-result-enter bg-white rounded-2xl p-4 shadow-sm border transition-all"
                style={{
                  borderColor: isChecked ? "oklch(0.50 0.10 260)" : "oklch(0.92 0.01 260)",
                  background: isChecked ? "oklch(0.97 0.02 260)" : "white",
                  animationDelay: `${Math.min(index * 30, 150)}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(c.id)}
                    className="mt-0.5 shrink-0 transition-colors"
                    style={{ color: isChecked ? "oklch(0.22 0.09 260)" : "oklch(0.75 0.02 260)" }}
                    aria-label={isChecked ? "Deselect" : "Select"}
                  >
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  {/* Contact info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{c.name}</p>
                      {!!c.optedOut && (
                        <span
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: "oklch(0.95 0.02 27)", color: "oklch(0.50 0.15 27)", border: "1px solid oklch(0.85 0.08 27)" }}
                          title="This contact has unsubscribed from emails"
                        >
                          Unsubscribed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <Mail size={12} />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                        <Phone size={12} />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic truncate">{c.notes}</p>
                    )}
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {parseTags(c.tags).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "oklch(0.92 0.05 160)", color: "oklch(0.35 0.10 160)" }}
                        >
                          {tag}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newTags = parseTags(c.tags).filter((t) => t !== tag);
                              setTagsMutation.mutate({ id: c.id, tags: newTags });
                            }}
                            className="ml-0.5 hover:opacity-70"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {tagInputId === c.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const val = tagInputValue.trim();
                            if (!val) { setTagInputId(null); return; }
                            const existing = parseTags(c.tags);
                            if (!existing.includes(val)) {
                              setTagsMutation.mutate({ id: c.id, tags: [...existing, val] });
                            } else {
                              setTagInputId(null);
                              setTagInputValue("");
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            autoFocus
                            value={tagInputValue}
                            onChange={(e) => setTagInputValue(e.target.value)}
                            onBlur={() => { setTagInputId(null); setTagInputValue(""); }}
                            placeholder="tag name"
                            className="text-xs px-2 py-0.5 rounded-full border outline-none w-24"
                            style={{ borderColor: "oklch(0.75 0.08 160)" }}
                           name="rr-pages-saved-contacts-tag-input-value-1178" />
                        </form>
                      ) : (
                        <button
                          onClick={() => { setTagInputId(c.id); setTagInputValue(""); }}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border border-dashed transition-colors hover:opacity-70"
                          style={{ borderColor: "oklch(0.75 0.08 160)", color: "oklch(0.55 0.08 160)" }}
                        >
                          <Plus size={10} /> tag
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        Sent {c.totalSent} time{c.totalSent !== 1 ? "s" : ""}
                      </span>
                      {c.lastSentAt && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} />
                          Last: {format(new Date(c.lastSentAt), "MMM d, yyyy")}
                        </span>
                      )}
                      {c.source === "stripe" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.93 0.04 280)", color: "oklch(0.45 0.12 280)" }}>
                          <CreditCard size={9} /> Stripe
                        </span>
                      )}
                      {c.source === "woocommerce" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.93 0.05 200)", color: "oklch(0.40 0.12 200)" }}>
                          <ShoppingCart size={9} /> WooCommerce
                        </span>
                      )}
                      {/* Consent badge */}
                      {c.consentBasis === "explicit_opt_in" ? (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full cursor-default"
                          style={{ background: "oklch(0.93 0.06 145)", color: "oklch(0.38 0.12 145)" }}
                          title={c.consentCapturedAt
                            ? `Consent given on ${format(new Date(c.consentCapturedAt), "MMM d, yyyy 'at' h:mm a")}${c.consentSource ? ` via ${c.consentSource.replace(/_/g, " ")}` : ""}`
                            : "Customer has given explicit consent to be contacted"}
                        >
                          <ShieldCheck size={9} /> Consent
                        </span>
                      ) : c.consentBasis === "opted_out" ? null : (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full cursor-default"
                          style={{ background: "oklch(0.95 0.01 260)", color: "oklch(0.60 0.04 260)" }}
                          title="No explicit consent recorded for this contact. Use the bulk consent request action to send them a consent email."
                        >
                          <ShieldOff size={9} /> No consent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setHistoryContact(c); setHistoryDrawerOpen(true); }}
                      aria-label={`View send history for ${c.name}`}
                      title="Send history"
                      className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Clock size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      aria-label={`Edit contact: ${c.name}`}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      aria-label={`Delete contact: ${c.name}`}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                    <Button
                      size="sm"
                      onClick={() => setSendTarget(c)}
                      className="font-bold text-xs px-3"
                      style={{ background: c.optedOut ? "oklch(0.70 0.02 260)" : "oklch(0.22 0.09 260)", color: "white" }}
                      disabled={!!c.optedOut}
                      title={c.optedOut ? "Contact has unsubscribed" : undefined}
                    >
                      <Send size={13} className="mr-1" /> Send
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Sticky Bulk Send Bar ─────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div
          className="fixed bottom-28 left-0 right-0 px-4 z-40"
          style={{ maxWidth: "430px", margin: "0 auto" }}
        >
          <div
            className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl rr-bg-navy" style={{ border: "1px solid oklch(0.35 0.07 260)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 rr-bg-gold rr-text-navy"
              >
                {selectedCount}
              </div>
              <span className="text-sm font-bold text-white">
                contact{selectedCount !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-on-dark-secondary)" }}
              >
                <X size={16} />
              </button>
              <button
                onClick={() => setConsentConfirmOpen(true)}
                disabled={bulkConsentRequestMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: "oklch(0.93 0.06 145)", color: "oklch(0.28 0.10 145)", border: "1px solid oklch(0.75 0.10 145)" }}
                title="Send a consent request email to selected contacts with no consent on file"
              >
                <ShieldCheck size={13} />
                Consent
              </button>
              <button
                onClick={() => setBulkConfirmOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all rr-bg-gold rr-text-navy"
              >
                <Star size={14} />
                Send to {selectedCount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditContact(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{editContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Regular customer, prefers email" rows={2} />
            </div>
            {!editContact && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Checkbox
                  id="consent-checkbox"
                  checked={form.consentGiven}
                  onCheckedChange={(checked) => setForm({ ...form, consentGiven: !!checked })}
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor="consent-checkbox" className="cursor-pointer text-xs leading-snug text-amber-900">
                  {t("contactsTools.addConsentLabel", {
                    businessName: profile?.consentLabelName || profile?.businessName || "your business",
                    defaultValue: "I confirm this customer has consented to be contacted by {{businessName}} via email and/or text about their experience and purchases",
                  })}
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="rr-bg-navy text-white">
              {isSaving ? "Saving…" : editContact ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from your saved contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Send Confirm */}
      <AlertDialog open={!!sendTarget} onOpenChange={(o) => { if (!o) setSendTarget(null); }}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Send review request?</AlertDialogTitle>
            <AlertDialogDescription>
              Send a review request email to <strong>{sendTarget?.name}</strong> ({sendTarget?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendMutation.isPending}
              onClick={() =>
                sendTarget &&
                sendMutation.mutate({
                  customerName: sendTarget.name,
                  customerEmail: sendTarget.email,
                  method: "email",
                })
              }
              className="rr-bg-navy text-white"
            >
              {sendMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Sending…</>
              ) : "Send Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Send Confirm */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={(o) => { if (!o) setBulkConfirmOpen(false); }}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {selectedCount} contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a review request email to all {selectedCount} selected contact{selectedCount !== 1 ? "s" : ""} using your default email template.
            </AlertDialogDescription>

            {/* Yelp warning */}
            {platforms.some((p) => p.platform === "yelp") && (
              <div className="mt-2 rounded-xl px-3 py-2 text-xs flex items-start gap-2 rr-bg-gold-pale" style={{ border: "1px solid oklch(0.85 0.12 80)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.18 80)" }} />
                <span className="rr-text-gold-dim">
                  <strong>Yelp note:</strong> Your Yelp listing will appear as a search suggestion rather than a direct link. Yelp discourages direct solicitation.
                </span>
              </div>
            )}

            {/* Bulk-send volume warning */}
            {selectedCount >= 20 && (
              <div className="mt-2 rounded-xl px-3 py-2 text-xs flex items-start gap-2 rr-bg-gold-pale" style={{ border: "1px solid oklch(0.85 0.12 80)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.18 80)" }} />
                <span className="rr-text-gold-dim">
                  <strong>Large send ({selectedCount} contacts):</strong> Sudden spikes can look spammy to review platforms. Consider spreading sends over multiple days.
                </span>
              </div>
            )}
            <div className="mt-3"><AdaptiveSendLimitStatus status={dailyStatus} compact /></div>
          </AlertDialogHeader>
          {platforms.length > 0 && (
            <div className="mt-1">
              <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                <Globe size={12} className="inline mr-1" />
                Review Platform
              </label>
              <div className="relative">
                <select
                  value={bulkPlatformId ?? "default"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkPlatformId(val === "default" ? null : Number(val));
                  }}
                  className="w-full px-3 py-2 pr-8 rounded-xl text-sm outline-none appearance-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
                 name="rr-pages-saved-contacts-bulk-platform-id-1470">
                  <option value="default">
                    {platforms.find((p) => p.isDefault === 1)
                      ? `${platforms.find((p) => p.isDefault === 1)!.label || PLATFORM_LABELS[platforms.find((p) => p.isDefault === 1)!.platform] || "Default"} (default)`
                      : "Default platform"}
                  </option>
                  {platforms.filter((p) => p.isDefault !== 1).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rr-text-navy-mid" />
              </div>
            </div>
          )}
          {/* Reminder toggle */}
          <div
            className="mt-2 flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer rr-bg-white-card" style={{ border: "1px solid oklch(0.88 0.03 260)" }}
            onClick={() => setScheduleReminders((v) => !v)}
          >
            <Checkbox
              id="bulk-reminder-checkbox"
              checked={scheduleReminders}
              onCheckedChange={(v) => setScheduleReminders(Boolean(v))}
              className="mt-0.5 shrink-0"
            />
            <div>
              <label htmlFor="bulk-reminder-checkbox" className="text-xs font-semibold cursor-pointer block rr-text-navy">
                Schedule 3-day follow-up reminders
              </label>
              <p className="text-xs mt-0.5 rr-text-navy-mid">
                Automatically send a reminder to any contact who hasn't responded in 3 days.
              </p>
            </div>
          </div>

          {/* Compliance checklist */}
          <div className="mt-2 rounded-xl p-3 rr-bg-white-card" style={{ border: "1px solid oklch(0.88 0.03 260)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="rr-text-green" />
                <p className="text-xs font-bold rr-text-navy">Compliance Checklist</p>
              </div>
              <a href="/compliance" target="_blank" rel="noopener noreferrer" className="text-xs font-medium flex items-center gap-0.5" style={{ color: "oklch(0.40 0.14 150)" }} onClick={(e) => e.stopPropagation()}>
                Full Guide <ExternalLink size={10} />
              </a>
            </div>
            {([
              { key: "realCustomers" as const, label: "These are real customers who transacted with me" },
              { key: "noIncentives" as const, label: "No incentives or discounts are being offered" },
              { key: "allCustomers" as const, label: "I'm sending to all customers, not filtering by satisfaction" },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-start gap-2 py-1 cursor-pointer" onClick={() => setComplianceChecked((v) => ({ ...v, [key]: !v[key] }))}>
                {complianceChecked[key]
                  ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 rr-text-green" />
                  : <div className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border-2" style={{ borderColor: "oklch(0.70 0.04 260)" }} />}
                <span className="text-xs" style={{ color: complianceChecked[key] ? "oklch(0.35 0.05 260)" : "oklch(0.50 0.04 260)" }}>{label}</span>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkSendMutation.isPending || !allComplianceChecked}
              onClick={() => bulkSendMutation.mutate({
                contactIds: selectedIds,
                platformId: bulkPlatformId ?? undefined,
                scheduleFollowUps: scheduleReminders,
              })}
              className="rr-bg-navy rr-text-gold"
            >
              {bulkSendMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Sending…</>
              ) : (
                <><Star size={14} className="mr-1" /> Send {selectedCount} Requests</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consent Request Confirmation Modal with Template Editor */}
      <AlertDialog open={consentConfirmOpen} onOpenChange={(o) => { if (!o) { setConsentConfirmOpen(false); setConsentPreviewOpen(false); } }}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-600" />
              Send Consent Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sending to <strong>{selectedCount}</strong> contact{selectedCount !== 1 ? "s" : ""} with no consent on file. Contacts with existing consent or who opted out are skipped automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Template Editor */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold rr-text-navy-mid">Customize email (optional)</p>
              <button
                onClick={() => setConsentPreviewOpen(p => !p)}
                className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                style={{ background: consentPreviewOpen ? "oklch(0.22 0.09 260)" : "oklch(0.95 0.02 260)", color: consentPreviewOpen ? "white" : "oklch(0.40 0.06 260)" }}
              >
                <Eye size={11} /> {consentPreviewOpen ? "Hide preview" : "Preview"}
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs rr-text-navy-muted">Insert:</span>
              {([
                { label: "{{name}}", desc: "Contact's name" },
                { label: "{{businessName}}", desc: "Your business name" },
                { label: "{{email}}", desc: "Contact's email address" },
                { label: "{{currentDate}}", desc: "Today's date (e.g. August 10, 2026)" },
              ] as const).map(({ label, desc }) => (
                <button
                  key={label}
                  title={desc}
                  onClick={() => setConsentCustomBody(b => b ? b + " " + label : label)}
                  className="text-xs font-mono px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                  style={{ background: "oklch(0.93 0.04 260)", color: "oklch(0.30 0.09 260)", border: "1px solid oklch(0.82 0.04 260)" }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 rr-text-navy-mid">Subject</label>
              <input
                type="text"
                value={consentCustomSubject}
                onChange={(e) => setConsentCustomSubject(e.target.value)}
                placeholder="A note about your email preferences from {{businessName}}"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.02 260)", fontSize: "13px" }}
               name="rr-pages-saved-contacts-consent-custom-subject-1605" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 rr-text-navy-mid">Message body</label>
              <textarea
                value={consentCustomBody}
                onChange={(e) => setConsentCustomBody(e.target.value)}
                placeholder={"We value your privacy...\n\nBy continuing to receive our emails, you confirm that you consent to be contacted by {{businessName}} via email...\n\nIf you prefer not to receive future emails, you can unsubscribe at any time."}
                rows={5}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                style={{ border: "1.5px solid oklch(0.88 0.02 260)", fontSize: "13px", lineHeight: "1.5" }}
               name="rr-pages-saved-contacts-consent-custom-body-1616" />
            </div>
            {(consentCustomSubject || consentCustomBody) && (
              <button
                onClick={() => { setConsentCustomSubject(""); setConsentCustomBody(""); }}
                className="text-xs text-left rr-text-navy-muted hover:underline"
              >
                Reset to default
              </button>
            )}
            {/* Live preview pane */}
            {consentPreviewOpen && (() => {
              const biz = profile?.consentLabelName || profile?.businessName || "Your Business";
              const sampleName = "Jane Smith";
              const sampleEmail = "jane.smith@example.com";
              const sampleDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
              const defaultSubj = `A note about your email preferences from ${biz}`;
              const defaultBody = `We value your privacy and want to make sure you are comfortable receiving emails from us about your experience and purchases with ${biz}.\n\nBy continuing to receive our emails, you confirm that you consent to be contacted by ${biz} via email about your experience and purchases.\n\nIf you prefer not to receive future emails, you can unsubscribe at any time.`;
              const resolveVars = (t: string) => t
                .replace(/\{\{name\}\}/g, sampleName)
                .replace(/\{\{businessName\}\}/g, biz)
                .replace(/\{\{email\}\}/g, sampleEmail)
                .replace(/\{\{currentDate\}\}/g, sampleDate);
              const previewSubject = resolveVars(consentCustomSubject || defaultSubj);
              const previewBody = resolveVars(consentCustomBody || defaultBody);
              const previewBodyHtml = previewBody.split(/\n\n+/).map((p: string) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`).join("");
              const isMobile = consentPreviewMode === "mobile";
              return (
                <div className="rounded-xl overflow-hidden mt-1" style={{ border: "1.5px solid oklch(0.85 0.04 260)" }}>
                  <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: "oklch(0.95 0.02 260)", borderBottom: "1px solid oklch(0.88 0.02 260)" }}>
                    <div className="flex items-center gap-1.5">
                      <Eye size={11} className="rr-text-navy-muted" />
                      <span className="text-xs font-semibold rr-text-navy-mid">Preview (sample: {sampleName})</span>
                    </div>
                    {/* Desktop / Mobile toggle */}
                    <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "oklch(0.88 0.02 260)" }}>
                      {(["desktop", "mobile"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setConsentPreviewMode(mode)}
                          className="text-xs px-2 py-0.5 rounded-md font-semibold transition-colors capitalize"
                          style={{
                            background: consentPreviewMode === mode ? "white" : "transparent",
                            color: consentPreviewMode === mode ? "oklch(0.22 0.09 260)" : "oklch(0.55 0.04 260)",
                            boxShadow: consentPreviewMode === mode ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                          }}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white overflow-x-auto" style={{ maxHeight: "240px" }}>
                    <div style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: isMobile ? "12px" : "13px",
                      color: "#1a1a2e",
                      padding: "12px",
                      maxWidth: isMobile ? "375px" : "600px",
                      margin: "0 auto",
                      overflowY: "auto",
                    }}>
                      <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#6b7280" }}><strong>Subject:</strong> {previewSubject}</p>
                      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />
                      <h3 style={{ margin: "0 0 10px", fontSize: isMobile ? "14px" : "15px", color: "#1a1a2e" }}>A quick note from {biz}</h3>
                      <p style={{ margin: "0 0 10px" }}>Hi {sampleName},</p>
                      <div dangerouslySetInnerHTML={{ __html: previewBodyHtml }} />
                      <p style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
                        You received this email because you are a customer of {biz}.{" "}
                        <span style={{ color: "#9ca3af", textDecoration: "underline" }}>Unsubscribe</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <AlertDialogFooter className="mt-2">
            <button
              onClick={() => sendConsentTestMutation.mutate({
                customSubject: consentCustomSubject.trim() || undefined,
                customBody: consentCustomBody.trim() || undefined,
              })}
              disabled={sendConsentTestMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors mr-auto"
              style={{ background: "oklch(0.95 0.02 260)", color: "oklch(0.40 0.06 260)", border: "1px solid oklch(0.85 0.02 260)" }}
              title="Send a test email to your own address to preview how it looks"
            >
              {sendConsentTestMutation.isPending ? (
                <><Loader2 size={12} className="animate-spin" /> Sending…</>
              ) : (
                <><Mail size={12} /> Send test to me</>
              )}
            </button>
            <AlertDialogCancel onClick={() => setConsentConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConsentConfirmOpen(false);
                setConsentPreviewOpen(false);
                bulkConsentRequestMutation.mutate({
                  contactIds: Array.from(selected),
                  customSubject: consentCustomSubject.trim() || undefined,
                  customBody: consentCustomBody.trim() || undefined,
                });
              }}
              className="flex items-center gap-1.5"
              style={{ background: "oklch(0.38 0.12 145)", color: "white" }}
            >
              {bulkConsentRequestMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Sending…</>
              ) : (
                <><ShieldCheck size={14} className="mr-1" /> Send Consent Emails</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WooCommerce Sync History Modal */}
      <Dialog open={wooSyncHistoryOpen} onOpenChange={(open) => { setWooSyncHistoryOpen(open); if (!open) setWooHistorySearch(""); }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rr-text-navy">
              <ShoppingCart size={16} aria-hidden="true" />
              WooCommerce Sync History
            </DialogTitle>
          </DialogHeader>

          {/* Search / filter input */}
          {wooSyncHistory.length > 0 && (
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.60 0.05 260)" }} aria-hidden="true" />
              <Input
                placeholder="Filter by date or result…"
                value={wooHistorySearch}
                onChange={(e) => setWooHistorySearch(e.target.value)}
                className="pl-8 pr-8 text-xs h-8"
                aria-label="Filter sync history"
              />
              {wooHistorySearch && (
                <button
                  onClick={() => setWooHistorySearch("")}
                  aria-label="Clear filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded hover:bg-gray-100 p-0.5"
                >
                  <X size={12} className="rr-text-navy-muted" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(() => {
              const q = wooHistorySearch.toLowerCase();
              const filtered = wooSyncHistory.filter((log) => {
                if (!q) return true;
                const dateStr = format(new Date(log.syncedAt), "MMM d, yyyy h:mm a").toLowerCase();
                const resultStr = log.added > 0 ? `${log.added} new` : "no new";
                return dateStr.includes(q) || resultStr.includes(q) || String(log.total).includes(q);
              });
              if (wooSyncHistory.length === 0) {
                return (
                  <p className="text-sm text-center py-6 rr-text-navy-muted">
                    No sync history yet. Run a sync to see results here.
                  </p>
                );
              }
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-center py-4 rr-text-navy-muted">
                    No results for "{wooHistorySearch}"
                  </p>
                );
              }
              return filtered.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg px-3 py-2.5 flex items-start gap-3 rr-bg-white-card" style={{ border: "1px solid oklch(0.92 0.02 260)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold rr-text-navy">
                      {format(new Date(log.syncedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs mt-0.5 rr-text-navy-muted">
                      {log.added > 0
                        ? <><span className="font-semibold" style={{ color: "oklch(0.45 0.15 160)" }}>{log.added} new</span> customer{log.added !== 1 ? "s" : ""} imported · {log.total} orders scanned ({log.daysWindow}d window)</>
                        : <>No new customers · {log.total} orders scanned ({log.daysWindow}d window)</>}
                    </p>
                  </div>
                  <RefreshCw size={12} style={{ color: "oklch(0.70 0.05 260)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                </div>
              ));
            })()}
          </div>
          {/* Sync progress bar — visible only while syncing */}
          {syncFromWooMutation.isPending && (
            <div className="px-1">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 size={12} className="animate-spin rr-text-gold" aria-hidden="true" />
                <span className="text-xs font-semibold rr-text-navy">
                  Syncing WooCommerce orders…
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.02 260)" }}>
                <div
                  className="h-full rounded-full animate-pulse rr-bg-gold" style={{ width: "60%" }}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                disabled={syncFromWooMutation.isPending || !wooCreds}
                onClick={() => wooCreds && syncFromWooMutation.mutate({ days: wooDays })}
                className="rr-bg-navy rr-text-gold"
                aria-label={syncFromWooMutation.isPending ? "Syncing WooCommerce orders" : `Sync WooCommerce orders (last ${wooDays} days)`}
              >
                {syncFromWooMutation.isPending ? (
                  <><Loader2 size={13} className="animate-spin mr-1" aria-hidden="true" /> Syncing…</>
                ) : (
                  <><RefreshCw size={13} className="mr-1" aria-hidden="true" /> Sync Now ({wooDays}d)</>
                )}
              </Button>
              {wooSyncHistory.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Export sync history as CSV"
                  title="Export sync history as CSV"
                  onClick={() => {
                    const rows = [
                      ["Date", "New Customers", "Orders Scanned", "Days Window"],
                      ...wooSyncHistory.map((log) => [
                        new Date(log.syncedAt).toLocaleString(),
                        String(log.added),
                        String(log.total),
                        String(log.daysWindow),
                      ]),
                    ];
                    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `woo-sync-history-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  <Download size={13} className="mr-1" aria-hidden="true" /> CSV
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setWooSyncHistoryOpen(false); setWooHistorySearch(""); }}
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send History Drawer ─────────────────────────────────────────────── */}
      <Dialog open={historyDrawerOpen} onOpenChange={(o) => { if (!o) { setHistoryDrawerOpen(false); setHistoryContact(null); } }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rr-text-navy">
              <Clock size={16} aria-hidden="true" />
              Send History
            </DialogTitle>
            {historyContact && (
              <p className="text-xs mt-0.5 rr-text-navy-mid">
                {historyContact.name} &middot; {historyContact.email}
              </p>
            )}
          </DialogHeader>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} className="animate-spin rr-text-navy" />
            </div>
          ) : sendHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Mail size={32} className="mx-auto mb-3" style={{ color: "oklch(0.75 0.04 260)" }} />
              <p className="text-sm rr-text-navy-mid">No emails sent to this contact yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {sendHistory.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2 rr-bg-white-card" style={{ border: "1px solid oklch(0.90 0.02 260)" }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold rr-text-navy">
                      {row.sentAt ? format(new Date(row.sentAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                    </p>
                    {row.platformLabel && (
                      <p className="text-xs mt-0.5 rr-text-navy-mid">
                        Platform: {row.platformLabel}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: row.status === "followed_up"
                        ? "oklch(0.92 0.08 145)"
                        : row.status === "sent"
                        ? "oklch(0.94 0.04 260)"
                        : "oklch(0.94 0.02 260)",
                      color: row.status === "followed_up"
                        ? "oklch(0.35 0.12 145)"
                        : row.status === "sent"
                        ? "oklch(0.30 0.08 260)"
                        : "oklch(0.40 0.04 260)",
                    }}
                  >
                    {row.status === "followed_up" ? "Followed Up" : row.status === "sent" ? "Sent" : row.status === "pending" ? "Pending" : row.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Consent Activity Log */}
          {historyContact && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid oklch(0.92 0.02 260)" }}>
              <p className="text-xs font-bold mb-2 flex items-center gap-1.5 rr-text-navy-mid">
                <ShieldCheck size={12} /> Consent Activity
              </p>
              <div className="flex flex-col gap-1.5">
                {historyContact.consentBasis === "explicit_opt_in" ? (
                  <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: "oklch(0.96 0.03 145)", border: "1px solid oklch(0.85 0.06 145)" }}>
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.38 0.12 145)" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "oklch(0.28 0.10 145)" }}>Consent given</p>
                      {historyContact.consentCapturedAt && (
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.08 145)" }}>
                          {format(new Date(historyContact.consentCapturedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                      {historyContact.consentSource && (
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.06 145)" }}>
                          via {historyContact.consentSource.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : historyContact.consentBasis === "opted_out" ? (
                  <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: "oklch(0.96 0.02 27)", border: "1px solid oklch(0.85 0.08 27)" }}>
                    <ShieldOff size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.15 27)" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "oklch(0.45 0.15 27)" }}>Opted out</p>
                      {historyContact.optedOutAt && (
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.10 27)" }}>
                          {format(new Date(historyContact.optedOutAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}>
                    <ShieldOff size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.60 0.04 260)" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "oklch(0.50 0.04 260)" }}>No consent recorded</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.60 0.03 260)" }}>
                        Select this contact and use the Consent button to send a consent request email.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setHistoryDrawerOpen(false); setHistoryContact(null); }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
