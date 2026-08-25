/**
 * WooCustomers — Import & send review requests to WooCommerce customers.
 *
 * Shows customers from completed orders who have NOT yet received a review
 * request. Users can select individuals or all, then bulk-send in one click.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AdaptiveSendLimitStatus from "@/components/AdaptiveSendLimitStatus";
import {
  RefreshCw,
  Send,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  X,
  MailCheck,
  RotateCcw,
  Mail,
  Loader2,
  UserX,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WooCustomers() {
  const [, navigate] = useLocation();
  const [days, setDays] = useState<number>(30);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"pending" | "all">("pending");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingStatusChange = useRef<{ customerId: number; sent: boolean } | null>(null);

  // Bulk confirm dialog state
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const pendingBulkChange = useRef<{ sent: boolean } | null>(null);

  // Bulk send confirm dialog state
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [wooPlatformId, setWooPlatformId] = useState<number | null>(null);
  const [scheduleReminders, setScheduleReminders] = useState(false);

  // Compliance checklist state
  const [wooComplianceChecked, setWooComplianceChecked] = useState({ realCustomers: false, noIncentives: false, allCustomers: false });
  const allWooComplianceChecked = wooComplianceChecked.realCustomers && wooComplianceChecked.noIncentives && wooComplianceChecked.allCustomers;

  // Send history dialog state
  const [historyCustomer, setHistoryCustomer] = useState<{ id: number; name: string; email: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: sendHistory = [], isLoading: historyLoading } = trpc.woo.sendHistory.useQuery(
    { customerId: historyCustomer?.id ?? 0 },
    { enabled: historyOpen && !!historyCustomer }
  );

  const utils = trpc.useUtils();
  const { data: emailPreview, isLoading: previewLoading } = trpc.smtp.previewEmail.useQuery();

  const { data: creds } = trpc.woo.getCredentials.useQuery();
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery();
  const { data: dailyStatus } = trpc.contacts.getDailyStatus.useQuery();
  const { data: pendingCustomers = [], isLoading: loadingPending } = trpc.woo.listPending.useQuery();
  const { data: allCustomers = [], isLoading: loadingAll } = trpc.woo.listAll.useQuery();

  const customers = viewMode === "pending" ? pendingCustomers : allCustomers;
  const isLoading = viewMode === "pending" ? loadingPending : loadingAll;

  const sync = trpc.woo.sync.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Sync complete — ${result.added} new customer${result.added !== 1 ? "s" : ""} added from ${result.total} orders.`
      );
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
      utils.woo.getCredentials.invalidate();
      setSelectedIds(new Set());
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  const setStatus = trpc.woo.setStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
      toast.success(variables.sent ? "Marked as Sent" : "Marked as Pending");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const bulkSetStatus = trpc.woo.bulkSetStatus.useMutation({
    onSuccess: (data, variables) => {
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
      setSelectedIds(new Set());
      toast.success(
        `${data.count} customer${data.count !== 1 ? "s" : ""} marked as ${variables.sent ? "Sent" : "Pending"}.`
      );
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  function requestStatusChange(customerId: number, sent: boolean) {
    pendingStatusChange.current = { customerId, sent };
    setConfirmOpen(true);
  }

  function confirmStatusChange() {
    if (pendingStatusChange.current) {
      setStatus.mutate(pendingStatusChange.current);
      pendingStatusChange.current = null;
    }
    setConfirmOpen(false);
  }

  function requestBulkStatusChange(sent: boolean) {
    pendingBulkChange.current = { sent };
    setBulkConfirmOpen(true);
  }

  function confirmBulkStatusChange() {
    if (pendingBulkChange.current) {
      bulkSetStatus.mutate({
        customerIds: Array.from(selectedIds),
        sent: pendingBulkChange.current.sent,
      });
      pendingBulkChange.current = null;
    }
    setBulkConfirmOpen(false);
  }

  const bulkSend = trpc.woo.bulkSend.useMutation({
    onSuccess: (result) => {
      const queued = result.queued ?? 0;
      if (result.errors.length > 0) {
        toast.warning(
          `Sent ${result.sent}, queued ${queued} — ${result.errors.length} failed. Check your email connection.`
        );
      } else {
        toast.success(
          `${result.sent} review request${result.sent !== 1 ? "s" : ""} sent` +
          (queued > 0 ? `; ${queued} queued until local quiet hours end.` : " successfully.")
        );
      }
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
      utils.contacts.getDailyStatus.invalidate();
      setSelectedIds(new Set());
      setSendConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(`Send failed: ${err.message}`);
    },
  });

  // In "pending" mode, only pending customers are selectable
  const selectableCustomers = viewMode === "pending"
    ? customers
    : customers.filter((c) => !c.reviewRequestSentAt);

  const filteredCustomers = search.trim()
    ? customers.filter(
        (c) =>
          c.customerName.toLowerCase().includes(search.toLowerCase()) ||
          c.customerEmail.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const filteredSelectable = filteredCustomers.filter((c) => !c.reviewRequestSentAt);
  const allSelected = filteredSelectable.length > 0 && filteredSelectable.every((c) => selectedIds.has(c.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredSelectable.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredSelectable.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!creds) {
    return (
      <div className="min-h-screen pb-40 rr-bg-cream-warm">
        <div
          className="px-5 pt-14 pb-6 rr-bg-navy"
        >
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1 text-base font-bold mb-4 rr-text-gold"
          >
            <ArrowLeft size={14} /> Settings
          </button>
          <h1
            className="text-2xl font-black text-white"
          >
            WooCommerce Customers
          </h1>
        </div>
        <div className="px-5 py-10 text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-500 mb-4">
            Connect your WooCommerce store in Settings to import customers.
          </p>
          <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Single-customer status change confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change customer status?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange.current?.sent
                ? "This will mark the customer as Sent and remove them from the Pending list."
                : "This will mark the customer as Pending so they can receive a review request again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send review requests confirm dialog with platform picker */}
      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Review Requests</AlertDialogTitle>
            <AlertDialogDescription>
              Send review request emails to {selectedIds.size} selected customer{selectedIds.size !== 1 ? "s" : ""}.
            </AlertDialogDescription>

            {platforms.some((p) => p.platform === "yelp") && (
              <div className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold flex items-start gap-2 rr-bg-gold-pale" style={{ border: "1px solid oklch(0.85 0.12 80)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.18 80)" }} />
                <span className="rr-text-gold-dim">
                  <strong>Yelp note:</strong> Your Yelp listing will appear as a search suggestion rather than a direct link.
                </span>
              </div>
            )}

            {selectedIds.size >= 20 && (
              <div className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold flex items-start gap-2 rr-bg-gold-pale" style={{ border: "1px solid oklch(0.85 0.12 80)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.18 80)" }} />
                <span className="rr-text-gold-dim">
                  <strong>Large send ({selectedIds.size} customers):</strong> Sudden spikes can look spammy. Consider spreading sends over multiple days.
                </span>
              </div>
            )}
            <div className="mt-3"><AdaptiveSendLimitStatus status={dailyStatus} compact /></div>
          </AlertDialogHeader>

          {/* Platform picker */}
          {platforms.length > 0 && (
            <div className="py-2">
              <label className="block text-sm font-bold mb-1.5 rr-text-navy-mid">
                Review Platform
              </label>
              <select
                value={wooPlatformId ?? ""}
                onChange={(e) => setWooPlatformId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)" }}
               name="rr-pages-woo-customers-woo-platform-id-325">
                <option value="">Use default platform</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.platform === "other" ? p.label : `${p.platform.charAt(0).toUpperCase()}${p.platform.slice(1)}`}
                    {p.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {platforms.length === 0 && (
            <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.15 27)" }}>
              No review platforms configured. Add one in Settings → Review Platforms.
            </p>
          )}

          {/* Reminder toggle */}
          <div
            className="mt-2 flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer rr-bg-white-card" style={{ border: "1px solid oklch(0.88 0.03 260)" }}
            onClick={() => setScheduleReminders((v) => !v)}
          >
            <Checkbox
              id="woo-reminder-checkbox"
              checked={scheduleReminders}
              onCheckedChange={(v) => setScheduleReminders(Boolean(v))}
              className="mt-0.5 shrink-0"
            />
            <div>
              <label htmlFor="woo-reminder-checkbox" className="text-xs font-semibold cursor-pointer block rr-text-navy">
                Schedule 3-day follow-up reminders
              </label>
              <p className="text-sm font-semibold mt-0.5 rr-text-navy-mid">
                Automatically send a reminder to any customer who hasn't responded in 3 days.
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
              { key: "allCustomers" as const, label: "Sending to all customers, not filtering by satisfaction" },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-start gap-2 py-1 cursor-pointer" onClick={() => setWooComplianceChecked((v) => ({ ...v, [key]: !v[key] }))}>
                {wooComplianceChecked[key]
                  ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 rr-text-green" />
                  : <div className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border-2" style={{ borderColor: "oklch(0.70 0.04 260)" }} />}
                <span className="text-xs" style={{ color: wooComplianceChecked[key] ? "oklch(0.35 0.05 260)" : "oklch(0.50 0.04 260)" }}>{label}</span>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkSend.mutate({
                customerIds: Array.from(selectedIds),
                platformId: wooPlatformId ?? undefined,
                scheduleFollowUps: scheduleReminders,
              })}
              disabled={bulkSend.isPending || !allWooComplianceChecked}
            >
              {bulkSend.isPending ? "Sending…" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk status change confirmation */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk status change?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkChange.current?.sent
                ? `Mark all ${selectedIds.size} selected customer${selectedIds.size !== 1 ? "s" : ""} as Sent?`
                : `Mark all ${selectedIds.size} selected customer${selectedIds.size !== 1 ? "s" : ""} as Pending?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkStatusChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Navy header */}
      <div
        className="px-5 pt-14 pb-6 rr-bg-navy"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-base font-bold mb-4 rr-text-gold"
        >
          <ArrowLeft size={14} /> Home
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-black text-white"
            >
              WooCommerce
            </h1>
            <p className="text-sm mt-1" style={{ color: "oklch(0.70 0.05 260)" }}>
              {creds.storeUrl}
            </p>
          </div>
          <ShoppingBag size={28} className="rr-text-gold" />
        </div>

        {creds.lastSyncedAt && (
          <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "oklch(0.65 0.05 260)" }}>
            <Clock size={11} />
            Last synced {formatDate(creds.lastSyncedAt)}
          </p>
        )}
      </div>

      {/* Two-column layout on desktop: customer list left, email preview right */}
      <div className="lg:flex lg:gap-6 lg:px-8 lg:pt-6 lg:pb-6">
      {/* Left column: customer list */}
      <div className="lg:flex-1 lg:min-w-0">
      {/* Pending / All toggle */}
      <div className="px-5 pt-4 pb-0 lg:px-0 flex gap-2">
        <button
          onClick={() => { setViewMode("pending"); setSelectedIds(new Set()); }}
          className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
          style={viewMode === "pending"
            ? { background: "oklch(0.22 0.09 260)", color: "white" }
            : { background: "oklch(0.93 0.01 260)", color: "oklch(0.40 0.05 260)" }
          }
        >
          Pending
        </button>
        <button
          onClick={() => { setViewMode("all"); setSelectedIds(new Set()); }}
          className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
          style={viewMode === "all"
            ? { background: "oklch(0.22 0.09 260)", color: "white" }
            : { background: "oklch(0.93 0.01 260)", color: "oklch(0.40 0.05 260)" }
          }
        >
          All Customers
        </button>
      </div>

      {/* Search bar */}
      <div className="px-5 pt-4 pb-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ fontFamily: "'Nunito', sans-serif" }}
           name="rr-pages-woo-customers-search-490" />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Sync controls */}
      <div className="px-5 py-4 flex items-center gap-3">
        <Select
          value={String(days)}
          onValueChange={(v) => setDays(Number(v))}
        >
          <SelectTrigger className="w-36 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => sync.mutate({ days })}
          disabled={sync.isPending}
          className="flex items-center gap-2 rr-bg-navy text-white"
        >
          <RefreshCw size={14} className={sync.isPending ? "animate-spin" : ""} />
          {sync.isPending ? "Syncing…" : "Sync Orders"}
        </Button>
      </div>

      {/* Customer list */}
      <div className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2
              size={48}
              className="mx-auto mb-4"
              style={{ color: "oklch(0.65 0.15 145)" }}
            />
            <p className="font-semibold text-gray-700">
              {search ? "No matches found" : "All caught up!"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {search
                ? `No customers match "${search}". Try a different name or email.`
                : "No pending customers. Sync orders to find new ones."}
            </p>
          </div>
        ) : (
          <>
            {/* Select all + bulk send bar */}
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  disabled={filteredSelectable.length === 0}
                />
                Select all ({filteredSelectable.length}{search ? ` of ${selectableCustomers.length}` : ""})
              </label>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestBulkStatusChange(false)}
                    disabled={bulkSetStatus.isPending}
                    className="flex items-center gap-1 text-xs px-2 py-1 h-auto"
                  >
                    <RotateCcw size={11} /> Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestBulkStatusChange(true)}
                    disabled={bulkSetStatus.isPending}
                    className="flex items-center gap-1 text-xs px-2 py-1 h-auto"
                    style={{ borderColor: "oklch(0.65 0.15 145)", color: "oklch(0.35 0.12 145)" }}
                  >
                    <MailCheck size={11} /> Mark Sent
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Pre-select default platform
                      const def = platforms.find((p) => p.isDefault);
                      setWooPlatformId(def?.id ?? platforms[0]?.id ?? null);
                      setSendConfirmOpen(true);
                    }}
                    disabled={bulkSend.isPending}
                    className="flex items-center gap-2 rr-bg-gold rr-text-navy"
                  >
                    <Send size={13} />
                    {bulkSend.isPending ? "Sending…" : `Send to ${selectedIds.size}`}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm"
                  style={{
                    border: selectedIds.has(customer.id)
                      ? "2px solid oklch(0.80 0.18 80)"
                      : "2px solid transparent",
                  }}
                >
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onCheckedChange={() => toggleOne(customer.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">
                        {customer.customerName}
                      </p>
                      {customer.optedOut ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: "oklch(0.95 0.04 25)", color: "oklch(0.50 0.18 25)" }}
                          title="This customer has unsubscribed from review request emails"
                        >
                          <UserX size={10} /> Unsubscribed
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {customer.customerEmail}
                    </p>
                    {customer.productName && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {customer.productName}
                      </p>
                    )}
                    {customer.lastStatusChangedAt && (
                      <p className="text-xs mt-1 rr-text-navy-muted">
                        Status changed {formatDate(customer.lastStatusChangedAt)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-gray-400">
                      {formatDate(customer.orderDate)}
                    </p>
                    <div className="flex items-center gap-1">
                      {customer.reviewRequestSentAt ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "oklch(0.92 0.06 145)", color: "oklch(0.35 0.12 145)" }}
                        >
                          <MailCheck size={10} /> Sent
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "oklch(0.93 0.06 80)", color: "oklch(0.45 0.12 80)" }}
                        >
                          Pending
                        </span>
                      )}
                      <button
                        title={customer.reviewRequestSentAt ? "Mark as Pending" : "Mark as Sent"}
                        disabled={setStatus.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          requestStatusChange(customer.id, !customer.reviewRequestSentAt);
                        }}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={11} />
                      </button>
                      <button
                        title="View send history"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryCustomer({ id: customer.id, name: customer.customerName, email: customer.customerEmail });
                          setHistoryOpen(true);
                        }}
                        className="p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Clock size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk send errors */}
            {bulkSend.data?.errors && bulkSend.data.errors.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-700 text-sm font-semibold mb-1">
                  <AlertCircle size={14} />
                  Some emails failed
                </div>
                {bulkSend.data.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* End left column */}
      </div>

      {/* Right column: sticky email preview (desktop only) */}
      <div className="hidden lg:block lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "oklch(0.22 0.09 260)" }}>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Email Preview</span>
            </div>
            {previewLoading ? (
              /* Skeleton loading state */
              <div className="p-4 space-y-3" style={{ height: "480px" }}>
                <div className="h-4 rounded-full bg-gray-100 animate-pulse w-3/4" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-1/2" />
                <div className="h-24 rounded-xl bg-gray-100 animate-pulse mt-4" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-full" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-5/6" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-4/6" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-full" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-3/4" />
                <div className="h-10 rounded-xl bg-gray-100 animate-pulse mt-4 w-1/2 mx-auto" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-full mt-4" />
                <div className="h-3 rounded-full bg-gray-100 animate-pulse w-2/3" />
              </div>
            ) : emailPreview ? (
              <iframe
                srcDoc={emailPreview.html}
                title="Email Preview"
                className="w-full border-0"
                style={{ height: "480px" }}
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Connect your email to see a preview
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Live preview of the review request email</p>
        </div>
      </div>
      {/* End two-column wrapper */}
      </div>

      {/* Send History Dialog */}
      <Dialog open={historyOpen} onOpenChange={(o) => { setHistoryOpen(o); if (!o) setHistoryCustomer(null); }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock size={16} className="rr-text-navy" />
              Send History
            </DialogTitle>
            {historyCustomer && (
              <p className="text-sm text-gray-500">{historyCustomer.name} · {historyCustomer.email}</p>
            )}
          </DialogHeader>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : sendHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <Mail size={28} className="opacity-40" />
                <p className="text-sm">No emails sent yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b">
                    <th className="text-left pb-2 font-semibold">Date</th>
                    <th className="text-left pb-2 font-semibold">Platform</th>
                    <th className="text-left pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sendHistory.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 text-gray-600 whitespace-nowrap">
                        {format(new Date(row.sentAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-2 text-gray-600">
                        {row.platformLabel ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2">
                        {row.respondedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.92 0.06 80)", color: "oklch(0.45 0.12 80)" }}>Reviewed</span>
                        ) : row.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.92 0.06 145)", color: "oklch(0.35 0.12 145)" }}>Sent</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}>{row.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setHistoryOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-transform active:scale-95 rr-bg-navy text-white"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
