/**
 * SavedContacts — manage repeat customers for re-sending review requests.
 * Supports individual send, bulk-select, and "Send to Selected" action.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Rocket,
  Tag,
  Plus,
  Globe,
  ChevronDown,
  RefreshCw,
  ShoppingCart,
  CreditCard,
  Search,
  Download,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

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
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

type FormData = { name: string; email: string; phone: string; notes: string };
const emptyForm: FormData = { name: "", email: "", phone: "", notes: "" };

export default function SavedContacts() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { track } = useAnalytics();

  const [search, setSearch] = useState("");
  const [dormancyFilter, setDormancyFilter] = useState<"all" | "30" | "60" | "90">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "stripe" | "woocommerce" | "manual">("all");
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

  // Review platforms
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery(undefined, { enabled: isAuthenticated });
  const PLATFORM_ICONS: Record<string, string> = { google: "🔍", yelp: "⭐", tripadvisor: "🦉", bing: "🌐", facebook: "👍", other: "🔗" };
  const PLATFORM_LABELS: Record<string, string> = { google: "Google", yelp: "Yelp", tripadvisor: "TripAdvisor", bing: "Bing", facebook: "Facebook", other: "Other" };

  const utils = trpc.useUtils();

  const { data: contacts = [], isLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  // Collect all unique tags across all contacts for the filter row
  const allTags = Array.from(
    new Set(contacts.flatMap((c) => parseTags(c.tags)))
  ).sort();

  const bulkSendMutation = trpc.contacts.bulkSend.useMutation({
    onSuccess: (result) => {
      utils.contacts.list.invalidate();
      utils.requests.stats.invalidate();
      setSelected(new Set());
      setBulkConfirmOpen(false);
      if (result.sent > 0) track("bulk_send", { count: result.sent });

      if (result.sent > 0 && result.failed === 0) {
        toast.success(
          `${result.sent} review request${result.sent !== 1 ? "s" : ""} sent!` +
          (result.skippedDueToLimit > 0 ? ` (${result.skippedDueToLimit} skipped — free limit reached)` : "")
        );
      } else if (result.sent > 0 && result.failed > 0) {
        toast.warning(`${result.sent} sent, ${result.failed} failed. Check your email connection in Settings.`);
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
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (tagFilter && !parseTags(c.tags).includes(tagFilter)) return false;
    if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
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
    setForm({ name: c.name, email: c.email, phone: c.phone ?? "", notes: c.notes ?? "" });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
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
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen pb-40" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-sm opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Saved Contacts
            </h1>
            <p className="text-sm mt-1 opacity-70 text-white">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              {selectedCount > 0 && (
                <span style={{ color: "oklch(0.80 0.18 80)" }}>
                  {" "}· {selectedCount} selected
                </span>
              )}
            </p>
          </div>
          {/* Gold Add button stays top-right */}
          <Button
            onClick={openCreate}
            size="sm"
            className="font-bold shrink-0"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
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
                className="text-xs font-bold rounded-lg px-2 py-1.5 outline-none appearance-none cursor-pointer shrink-0"
                style={{
                  background: "oklch(0.32 0.07 260)",
                  color: "oklch(0.72 0.18 160)",
                  border: "none",
                  minWidth: "72px",
                }}
                title="Sync window"
              >
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
                WooCommerce
              </Button>
            </>
          )}
          <Button
            onClick={() => syncFromStripeMutation.mutate()}
            disabled={syncFromStripeMutation.isPending}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0"
            style={{ background: "oklch(0.32 0.07 260)", color: "oklch(0.80 0.18 80)" }}
            title={syncStatus?.stripeLastSyncedAt ? `Last synced ${format(new Date(syncStatus.stripeLastSyncedAt), "MMM d, h:mm a")}` : "Import customers from Stripe"}
          >
            {syncFromStripeMutation.isPending ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <CreditCard size={14} className="mr-1" />
            )}
            Stripe{syncStatus?.stripeLastSyncedAt ? (
              <span className="ml-1 opacity-60 text-xs font-normal">
                · {format(new Date(syncStatus.stripeLastSyncedAt), "MMM d")}
              </span>
            ) : null}
          </Button>
          <Button
            onClick={() => navigate("/import")}
            size="sm"
            variant="outline"
            className="font-bold border-0 shrink-0"
            style={{ background: "oklch(0.32 0.07 260)", color: "oklch(0.80 0.18 80)" }}
          >
            <Upload size={14} className="mr-1" /> Import CSV
          </Button>
        </div>
      </div>

      {/* WooCommerce last-synced status line */}
      {wooCreds && (
        <div
          className="flex items-center gap-1.5 px-4 py-2"
          style={{ background: "oklch(0.96 0.02 260)", borderBottom: "1px solid oklch(0.91 0.02 260)" }}
        >
          <ShoppingCart size={12} style={{ color: "oklch(0.50 0.05 260)" }} aria-hidden="true" />
          <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.50 0.05 260)", fontFamily: "'Nunito', sans-serif" }}>
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
              <Globe size={13} style={{ color: "oklch(0.55 0.03 260)", flexShrink: 0 }} />
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

        {/* Dormancy filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Clock size={13} style={{ color: "oklch(0.55 0.03 260)", flexShrink: 0 }} />
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
            <span className="text-xs ml-1" style={{ color: "oklch(0.55 0.03 260)" }}>
              {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Tag size={13} style={{ color: "oklch(0.55 0.03 260)", flexShrink: 0 }} />
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
                className="flex items-center gap-2 self-start px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "oklch(0.80 0.18 80)",
                }}
              >
                <Rocket size={14} />
                Send to all "{tagFilter}" ({filtered.length})
              </button>
            )}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {search ? "No matches found" : "No saved contacts yet"}
            </p>
            {!search && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-gray-400 text-sm">Import a CSV or add contacts manually</p>
                <Button
                  onClick={() => navigate("/import")}
                  size="sm"
                  className="font-bold mt-1"
                  style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                >
                  <Upload size={14} className="mr-1" /> Import CSV
                </Button>
              </div>
            )}
          </div>
        ) : (
          filtered.map((c) => {
            const isChecked = selected.has(c.id);
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 shadow-sm border transition-all"
                style={{
                  borderColor: isChecked ? "oklch(0.50 0.10 260)" : "oklch(0.92 0.01 260)",
                  background: isChecked ? "oklch(0.97 0.02 260)" : "white",
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
                    <p className="font-bold text-gray-900 truncate">{c.name}</p>
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
                          />
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
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
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
                      style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
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
            className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl"
            style={{ background: "oklch(0.22 0.09 260)", border: "1px solid oklch(0.35 0.07 260)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
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
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <X size={16} />
              </button>
              <button
                onClick={() => setBulkConfirmOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all"
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
              >
                <Rocket size={14} />
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
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} style={{ background: "oklch(0.22 0.09 260)", color: "white" }}>
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
              style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
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
          </AlertDialogHeader>
          {platforms.length > 0 && (
            <div className="mt-1">
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
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
                  className="w-full px-3 py-2 pr-8 rounded-xl text-sm outline-none appearance-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", background: "white", fontSize: "14px" }}
                >
                  <option value="default">
                    {platforms.find((p) => p.isDefault === 1)
                      ? `${PLATFORM_ICONS[platforms.find((p) => p.isDefault === 1)!.platform] ?? "🔗"} ${platforms.find((p) => p.isDefault === 1)!.label || PLATFORM_LABELS[platforms.find((p) => p.isDefault === 1)!.platform] || "Default"} (default)`
                      : "Default platform"}
                  </option>
                  {platforms.filter((p) => p.isDefault !== 1).map((p) => (
                    <option key={p.id} value={p.id}>
                      {PLATFORM_ICONS[p.platform] ?? "🔗"} {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.50 0.04 260)" }} />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkSendMutation.isPending}
              onClick={() => bulkSendMutation.mutate({ contactIds: selectedIds, platformId: bulkPlatformId ?? undefined })}
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {bulkSendMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-1" /> Sending…</>
              ) : (
                <><Rocket size={14} className="mr-1" /> Send {selectedCount} Requests</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WooCommerce Sync History Modal */}
      <Dialog open={wooSyncHistoryOpen} onOpenChange={(open) => { setWooSyncHistoryOpen(open); if (!open) setWooHistorySearch(""); }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
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
                  <X size={12} style={{ color: "oklch(0.55 0.05 260)" }} />
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
                  <p className="text-sm text-center py-6" style={{ color: "oklch(0.55 0.05 260)" }}>
                    No sync history yet. Run a sync to see results here.
                  </p>
                );
              }
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-center py-4" style={{ color: "oklch(0.55 0.05 260)" }}>
                    No results for "{wooHistorySearch}"
                  </p>
                );
              }
              return filtered.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg px-3 py-2.5 flex items-start gap-3"
                  style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.92 0.02 260)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "oklch(0.22 0.09 260)" }}>
                      {format(new Date(log.syncedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.05 260)" }}>
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
                <Loader2 size={12} className="animate-spin" style={{ color: "oklch(0.80 0.18 80)" }} aria-hidden="true" />
                <span className="text-xs font-semibold" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Nunito', sans-serif" }}>
                  Syncing WooCommerce orders…
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.02 260)" }}>
                <div
                  className="h-full rounded-full animate-pulse"
                  style={{ width: "60%", background: "oklch(0.80 0.18 80)" }}
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
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)", fontFamily: "'Nunito', sans-serif" }}
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
    </div>
  );
}
