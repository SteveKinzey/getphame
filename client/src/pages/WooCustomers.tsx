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
import { toast } from "sonner";
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
} from "lucide-react";
import { useLocation } from "wouter";

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

  const utils = trpc.useUtils();

  const { data: creds } = trpc.woo.getCredentials.useQuery();
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery();
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
      if (result.errors.length > 0) {
        toast.warning(
          `Sent ${result.sent} — ${result.errors.length} failed. Check your email connection.`
        );
      } else {
        toast.success(
          `Sent ${result.sent} review request${result.sent !== 1 ? "s" : ""} successfully.`
        );
      }
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
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
      <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div
          className="px-5 pt-14 pb-6"
          style={{ background: "oklch(0.22 0.09 260)" }}
        >
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1 text-sm mb-4"
            style={{ color: "oklch(0.80 0.18 80)" }}
          >
            <ArrowLeft size={14} /> Settings
          </button>
          <h1
            className="text-2xl font-black"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
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
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
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
          </AlertDialogHeader>

          {/* Platform picker */}
          {platforms.length > 0 && (
            <div className="py-2">
              <label className="block text-xs font-bold mb-1.5" style={{ color: "oklch(0.40 0.04 260)" }}>
                Review Platform
              </label>
              <select
                value={wooPlatformId ?? ""}
                onChange={(e) => setWooPlatformId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: "2px solid oklch(0.90 0.02 260)", background: "white" }}
              >
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
            <p className="text-xs py-2" style={{ color: "oklch(0.55 0.15 27)" }}>
              No review platforms configured. Add one in Settings → Review Platforms.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkSend.mutate({ customerIds: Array.from(selectedIds), platformId: wooPlatformId ?? undefined })}
              disabled={bulkSend.isPending}
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
        className="px-5 pt-14 pb-6"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ArrowLeft size={14} /> Home
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-black"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
            >
              WooCommerce
            </h1>
            <p className="text-sm mt-1" style={{ color: "oklch(0.70 0.05 260)" }}>
              {creds.storeUrl}
            </p>
          </div>
          <ShoppingBag size={28} style={{ color: "oklch(0.80 0.18 80)" }} />
        </div>

        {creds.lastSyncedAt && (
          <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "oklch(0.65 0.05 260)" }}>
            <Clock size={11} />
            Last synced {formatDate(creds.lastSyncedAt)}
          </p>
        )}
      </div>

      {/* Pending / All toggle */}
      <div className="px-5 pt-4 pb-0 flex gap-2">
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
          />
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
          className="flex items-center gap-2"
          style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
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
                    className="flex items-center gap-2"
                    style={{
                      background: "oklch(0.80 0.18 80)",
                      color: "oklch(0.22 0.09 260)",
                    }}
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
                    <p className="font-semibold text-gray-900 truncate">
                      {customer.customerName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {customer.customerEmail}
                    </p>
                    {customer.productName && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {customer.productName}
                      </p>
                    )}
                    {customer.lastStatusChangedAt && (
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.05 260)" }}>
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
    </div>
  );
}
