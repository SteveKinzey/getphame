// Phame — Admin: Access Code Management
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
import { useTranslation } from "react-i18next";

type AccessCodeGrantUnit = "day" | "month" | "lifetime";

export default function AdminCodesPage() {
  const { t } = useTranslation("translation");
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [customCode, setCustomCode] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [grantDurationUnit, setGrantDurationUnit] = useState<AccessCodeGrantUnit>("month");
  const [grantDurationValue, setGrantDurationValue] = useState<string>("1");

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
      setGrantDurationUnit("month");
      setGrantDurationValue("1");
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
    const parsedGrantDuration = grantDurationUnit === "lifetime"
      ? null
      : parseInt(grantDurationValue, 10);
    const durationLimit = grantDurationUnit === "day" ? 365 : 24;
    if (grantDurationUnit !== "lifetime" && (!Number.isInteger(parsedGrantDuration) || parsedGrantDuration! < 1 || parsedGrantDuration! > durationLimit)) {
      toast.error(t("accessCode.durationError", {
        defaultValue: "Enter a duration between 1 and {{limit}}.",
        limit: durationLimit,
      }));
      return;
    }
    createCode.mutate({
      code: customCode.trim() || undefined,
      note: note.trim() || undefined,
      maxUses: parsedMaxUses,
      expiresAt: parsedExpiry,
      grantDurationValue: parsedGrantDuration,
      grantDurationUnit,
    });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center rr-bg-navy">
        <Loader2 size={32} className="animate-spin rr-text-gold" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 rr-bg-navy">
        <p className="text-white text-xl font-black mb-4">Admin access required.</p>
        <button onClick={() => navigate("/")} className="text-base font-bold" style={{ color: "white" }}>
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 rr-bg-navy">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: "var(--text-on-dark-secondary)" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Ticket size={16} className="rr-text-gold" />
          <span
            className="text-xs font-bold tracking-widest uppercase rr-text-gold"
          >
            Admin
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-black text-white"
            >
              Access Codes
            </h1>
            <p className="text-base font-bold mt-1 text-white/90">
              Create and manage beta / promo codes that grant free Pro access.
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-2 mt-1">
            <button
              onClick={() => navigate("/admin/revenue-controls")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold rr-text-gold" style={{ background: "oklch(0.30 0.07 260)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Revenue controls
            </button>
            <button
              onClick={() => navigate("/admin/smtp-stats")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold rr-text-gold" style={{ background: "oklch(0.30 0.07 260)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              SMTP Stats
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Create Code Card */}
        <div className="rounded-2xl p-5 rr-bg-navy-mid">
          <h2
            className="text-sm font-black mb-4 text-white"
          >
            Create New Code
          </h2>

          {/* Auto-generated preview */}
          {preview && (
            <div className="flex items-center gap-2 mb-4">
              <span
                className="flex-1 px-3 py-2 rounded-xl text-sm font-mono tracking-wider text-center rr-bg-navy rr-text-gold"
              >
                {preview.code}
              </span>
              <button
                onClick={() => refreshPreview()}
                className="p-2 rounded-xl"
                style={{ background: "oklch(0.22 0.09 260)", color: "var(--text-on-dark-secondary)" }}
                title="Generate new random code"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Custom code override */}
            <div>
              <label className="text-sm font-bold mb-1 block text-white/80">
                Custom code (optional — leave blank to use the one above)
              </label>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH2026"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono tracking-wider outline-none rr-bg-navy text-white" style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>

            {/* Internal note */}
            <div>
              <label className="text-sm font-bold mb-1 block text-white/80">
                Internal note (shown in success message)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Beta cohort — Jan 2026"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none rr-bg-navy text-white" style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>

            <div className="flex gap-3">
              {/* Max uses */}
              <div className="flex-1">
                <label className="text-sm font-bold mb-1 block text-white/80">
                  Max uses (blank = unlimited)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="∞"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none rr-bg-navy text-white" style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>

              {/* Expiry days */}
              <div className="flex-1">
                <label className="text-sm font-bold mb-1 block text-white/80">
                  Expires in days (blank = never)
                </label>
                <input
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="never"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none rr-bg-navy text-white" style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold mb-1 block text-white/80">
                {t("accessCode.grantDurationLabel", { defaultValue: "Access granted after redemption" })}
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={grantDurationUnit}
                  onChange={(event) => setGrantDurationUnit(event.target.value as AccessCodeGrantUnit)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none rr-bg-navy text-white"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                  aria-label={t("accessCode.grantUnitLabel", { defaultValue: "Grant duration unit" })}
                >
                  <option value="day">{t("accessCode.units.day", { defaultValue: "Days" })}</option>
                  <option value="month">{t("accessCode.units.month", { defaultValue: "Months" })}</option>
                  <option value="lifetime">{t("accessCode.units.lifetime", { defaultValue: "Lifetime" })}</option>
                </select>
                {grantDurationUnit !== "lifetime" && (
                  <input
                    type="number"
                    min={1}
                    max={grantDurationUnit === "day" ? 365 : 24}
                    value={grantDurationValue}
                    onChange={(event) => setGrantDurationValue(event.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none rr-bg-navy text-white"
                    style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                    aria-label={t("accessCode.grantValueLabel", { defaultValue: "Grant duration value" })}
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs font-semibold text-white/55">
                {grantDurationUnit === "lifetime"
                  ? t("accessCode.lifetimeHelper", { defaultValue: "The code grants permanent paid access." })
                  : t("accessCode.durationHelper", {
                      defaultValue: "The access period starts when the customer redeems the code.",
                    })}
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={createCode.isPending}
              className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60 rr-bg-gold rr-text-navy"
            >
              {createCode.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {createCode.isPending ? "Creating..." : "Create Code"}
            </button>
          </div>
        </div>

        {/* Existing Codes List */}
        <div className="rounded-2xl overflow-hidden rr-bg-navy-mid">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2
              className="text-sm font-black text-white"
            >
              All Codes ({codes?.length ?? 0})
            </h2>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--text-on-dark-muted)" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {codesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-on-dark-disabled)" }} />
            </div>
          ) : !codes || codes.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-base font-bold text-white/70">
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
                            style={{ color: isActive ? "oklch(0.80 0.18 80)" : "var(--text-on-dark-disabled)" }}
                          >
                            {c.code}
                          </span>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="p-1 rounded"
                            style={{ color: "var(--text-on-dark-disabled)" }}
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
                          <p className="text-sm font-bold mb-1 text-white/90">
                            {c.note}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-sm font-bold text-white/60">
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
                          <span className="rr-text-gold">
                            {c.grantDurationUnit === "lifetime"
                              ? t("accessCode.grantLifetime", { defaultValue: "Grants lifetime access" })
                              : c.grantDurationUnit && c.grantDurationValue
                                ? t("accessCode.grantDuration", {
                                    defaultValue: "Grants {{value}} {{unit}}",
                                    value: c.grantDurationValue,
                                    unit: t(`accessCode.units.${c.grantDurationUnit}`),
                                  })
                                : t("accessCode.grantLegacy", { defaultValue: "Legacy unlimited Pro access" })}
                          </span>
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
