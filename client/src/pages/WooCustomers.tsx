/**
 * WooCustomers — Import & send review requests to WooCommerce customers.
 *
 * Shows customers from completed orders who have NOT yet received a review
 * request. Users can select individuals or all, then bulk-send in one click.
 */

import { useState } from "react";
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

  const utils = trpc.useUtils();

  const { data: creds } = trpc.woo.getCredentials.useQuery();
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

  const bulkSend = trpc.woo.bulkSend.useMutation({
    onSuccess: (result) => {
      if (result.errors.length > 0) {
        toast.warning(
          `Sent ${result.sent} — ${result.errors.length} failed. Check your Gmail connection.`
        );
      } else {
        toast.success(
          `Sent ${result.sent} review request${result.sent !== 1 ? "s" : ""} successfully.`
        );
      }
      utils.woo.listPending.invalidate();
      utils.woo.listAll.invalidate();
      setSelectedIds(new Set());
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
      <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
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
            style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
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
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
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
              style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
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
                <Button
                  size="sm"
                  onClick={() =>
                    bulkSend.mutate({ customerIds: Array.from(selectedIds) })
                  }
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
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-gray-400">
                      {formatDate(customer.orderDate)}
                    </p>
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
