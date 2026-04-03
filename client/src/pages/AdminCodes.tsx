// ReviewLink — Admin: Access Code Management
// Only accessible to users with role === "admin"

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Ticket,
  Plus,
  Copy,
  Ban,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Infinity,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminCodesPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [customCode, setCustomCode] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("");

  const { data: codes, isLoading: codesLoading, refetch } = trpc.accessCodes.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const { data: preview, refetch: refreshPreview } = trpc.accessCodes.generatePreview.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const utils = trpc.useUtils();

  const createCode = trpc.accessCodes.create.useMutation({
    onSuccess: ({ code }) => {
      toast.success(`Code created: ${code}`);
      setNote("");
      setMaxUses("");
      setCustomCode("");
      setExpiryDays("");
      utils.accessCodes.list.invalidate();
      refreshPreview();
    },
    onError: (err) => toast.error(err.message || "Failed to create code."),
  });

  const revokeCode = trpc.accessCodes.revoke.useMutation({
    onSuccess: () => {
      toast.success("Code revoked.");
      utils.accessCodes.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to revoke code."),
  });

  const activateCode = trpc.accessCodes.activate.useMutation({
    onSuccess: () => {
      toast.success("Code re-activated.");
      utils.accessCodes.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to activate code."),
  });

  function handleCreate() {
    const parsedMaxUses = maxUses.trim() ? parseInt(maxUses, 10) : null;
    const parsedExpiry = expiryDays.trim()
      ? Date.now() + parseInt(expiryDays, 10) * 24 * 60 * 60 * 1000
      : null;
    createCode.mutate({
      code: customCode.trim() || undefined,
      note: note.trim() || undefined,
      maxUses: parsedMaxUses,
      expiresAt: parsedExpiry,
    });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.22 0.09 260)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "oklch(0.80 0.18 80)" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <p className="text-white text-lg font-bold mb-4">Admin access required.</p>
        <button onClick={() => navigate("/")} className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.22 0.09 260)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Ticket size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            Admin
          </span>
        </div>
        <h1
          className="text-2xl font-black"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
        >
          Access Codes
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Create and manage beta / promo codes that grant free Pro access.
        </p>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Create Code Card */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.30 0.08 260)" }}>
          <h2
            className="text-sm font-black mb-4"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
          >
            Create New Code
          </h2>

          {/* Auto-generated preview */}
          {preview && (
            <div className="flex items-center gap-2 mb-4">
              <span
                className="flex-1 px-3 py-2 rounded-xl text-sm font-mono tracking-wider text-center"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
              >
                {preview.code}
              </span>
              <button
                onClick={() => refreshPreview()}
                className="p-2 rounded-xl"
                style={{ background: "oklch(0.22 0.09 260)", color: "rgba(255,255,255,0.5)" }}
                title="Generate new random code"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Custom code override */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "rgba(255,255,255,0.6)" }}>
                Custom code (optional — leave blank to use the one above)
              </label>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH2026"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono tracking-wider outline-none"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Internal note */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "rgba(255,255,255,0.6)" }}>
                Internal note (shown in success message)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Beta cohort — Jan 2026"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            <div className="flex gap-3">
              {/* Max uses */}
              <div className="flex-1">
                <label className="text-xs font-semibold mb-1 block" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Max uses (blank = unlimited)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="∞"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "oklch(0.22 0.09 260)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>

              {/* Expiry days */}
              <div className="flex-1">
                <label className="text-xs font-semibold mb-1 block" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Expires in days (blank = never)
                </label>
                <input
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="never"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "oklch(0.22 0.09 260)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={createCode.isPending}
              className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
              style={{
                background: "oklch(0.80 0.18 80)",
                color: "oklch(0.22 0.09 260)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {createCode.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {createCode.isPending ? "Creating..." : "Create Code"}
            </button>
          </div>
        </div>

        {/* Existing Codes List */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.30 0.08 260)" }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <h2
              className="text-sm font-black"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
            >
              All Codes ({codes?.length ?? 0})
            </h2>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {codesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          ) : !codes || codes.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                No codes yet. Create one above.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {codes.map((c) => {
                const isExpired = c.expiresAt ? c.expiresAt < Date.now() : false;
                const isFull = c.maxUses !== null && c.usedCount >= c.maxUses;
                const isActive = c.active === 1 && !isExpired && !isFull;

                return (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Code + copy */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-mono text-sm font-bold tracking-wider"
                            style={{ color: isActive ? "oklch(0.80 0.18 80)" : "rgba(255,255,255,0.3)" }}
                          >
                            {c.code}
                          </span>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="p-1 rounded"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            <Copy size={12} />
                          </button>
                          {/* Status badge */}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: isActive
                                ? "oklch(0.35 0.12 145)"
                                : "oklch(0.35 0.08 20)",
                              color: isActive ? "oklch(0.80 0.22 145)" : "oklch(0.75 0.12 20)",
                            }}
                          >
                            {isExpired ? "Expired" : isFull ? "Used up" : c.active ? "Active" : "Revoked"}
                          </span>
                        </div>

                        {/* Note */}
                        {c.note && (
                          <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {c.note}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          <span>
                            {c.usedCount} used
                            {c.maxUses !== null ? ` / ${c.maxUses}` : " / "}
                            {c.maxUses === null && <Infinity size={10} className="inline ml-0.5" />}
                          </span>
                          {c.expiresAt && (
                            <span>
                              Expires {new Date(c.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="shrink-0">
                        {c.active === 1 ? (
                          <button
                            onClick={() => revokeCode.mutate({ id: c.id })}
                            disabled={revokeCode.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "oklch(0.35 0.08 20)", color: "oklch(0.75 0.12 20)" }}
                          >
                            <Ban size={12} />
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => activateCode.mutate({ id: c.id })}
                            disabled={activateCode.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "oklch(0.35 0.12 145)", color: "oklch(0.80 0.22 145)" }}
                          >
                            <CheckCircle2 size={12} />
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
