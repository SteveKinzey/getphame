import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  BadgePercent,
  Ban,
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  Gift,
  Infinity,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLocation } from "wouter";

type StripePlan = "monthly" | "annual" | "lifetime";
type GrantDurationUnit = "day" | "month" | "year";
type GrantStatus = "all" | "active" | "expired" | "revoked";

const planOptions: StripePlan[] = ["monthly", "annual", "lifetime"];
const grantDurationMaximums: Record<GrantDurationUnit, number> = {
  day: 365,
  month: 24,
  year: 5,
};
const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[oklch(0.66_0.16_80)] focus:ring-2 focus:ring-[oklch(0.75_0.18_80/0.18)] disabled:cursor-not-allowed disabled:bg-slate-100";

function formatDate(value: number | null | undefined, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function promotionStatusStyle(
  status: "active" | "inactive" | "expired" | "redeemed"
) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "redeemed") return "bg-amber-100 text-amber-900";
  if (status === "expired") return "bg-rose-100 text-rose-800";
  return "bg-slate-200 text-slate-700";
}

function grantStatusStyle(status: "active" | "expired" | "revoked") {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "expired") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-800";
}

export default function AdminRevenueControlsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [promotionCode, setPromotionCode] = useState("");
  const [percentOff, setPercentOff] = useState("20");
  const [selectedPlans, setSelectedPlans] = useState<StripePlan[]>([
    "monthly",
    "annual",
    "lifetime",
  ]);
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [promotionExpiry, setPromotionExpiry] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");

  const [grantEmail, setGrantEmail] = useState("");
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<GrantDurationUnit>("month");
  const [grantNote, setGrantNote] = useState("");
  const [grantStatus, setGrantStatus] = useState<GrantStatus>("all");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupTarget, setLookupTarget] = useState<string | null>(null);

  const promotionQuery = trpc.stripe.promotionMonitor.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: false,
  });
  const grantQuery = trpc.admin.complimentaryAccess.useQuery(
    { status: grantStatus },
    {
      enabled: user?.role === "admin",
      refetchOnWindowFocus: false,
    }
  );
  const lookupQuery = trpc.admin.complimentaryAccessLookup.useQuery(
    { email: lookupTarget ?? "" },
    {
      enabled: user?.role === "admin" && Boolean(lookupTarget),
      refetchOnWindowFocus: false,
    }
  );

  const createPromotion = trpc.stripe.createPromotionCode.useMutation({
    onSuccess: promotion => {
      toast.success(
        t("adminRevenueControls.promotion.created", {
          defaultValue: "Promotion code {{code}} was created in Stripe.",
          code: promotion.code,
        })
      );
      setPromotionCode("");
      setPromotionExpiry("");
      setMaxRedemptions("");
      utils.stripe.promotionMonitor.invalidate();
    },
    onError: error =>
      toast.error(
        error.message ||
          t("adminRevenueControls.promotion.createError", {
            defaultValue: "Promotion code could not be created.",
          })
      ),
  });

  const createGrant = trpc.admin.grantComplimentaryAccess.useMutation({
    onSuccess: () => {
      toast.success(
        t("adminRevenueControls.grants.created", {
          defaultValue: "Complimentary access was granted.",
        })
      );
      setGrantEmail("");
      setGrantNote("");
      utils.admin.complimentaryAccess.invalidate();
      utils.admin.complimentaryAccessLookup.invalidate();
    },
    onError: error =>
      toast.error(
        error.message ||
          t("adminRevenueControls.grants.createError", {
            defaultValue: "Complimentary access could not be granted.",
          })
      ),
  });

  const revokeGrant = trpc.admin.revokeComplimentaryAccess.useMutation({
    onSuccess: () => {
      toast.success(
        t("adminRevenueControls.grants.revoked", {
          defaultValue: "Complimentary access was revoked.",
        })
      );
      utils.admin.complimentaryAccess.invalidate();
      utils.admin.complimentaryAccessLookup.invalidate();
    },
    onError: error =>
      toast.error(
        error.message ||
          t("adminRevenueControls.grants.revokeError", {
            defaultValue: "Complimentary access could not be revoked.",
          })
      ),
  });

  const activePromotionCount = useMemo(
    () =>
      (promotionQuery.data?.promotions ?? []).filter(
        promotion => promotion.status === "active"
      ).length,
    [promotionQuery.data?.promotions]
  );
  const activeGrantCount = useMemo(
    () =>
      (grantQuery.data ?? []).filter(grant => grant.status === "active").length,
    [grantQuery.data]
  );

  const togglePlan = (plan: StripePlan) => {
    setSelectedPlans(current =>
      current.includes(plan)
        ? current.filter(candidate => candidate !== plan)
        : [...current, plan]
    );
  };

  const submitPromotion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPercent = Number(percentOff);
    const parsedMaximum = maxRedemptions.trim() ? Number(maxRedemptions) : null;
    const parsedExpiry = promotionExpiry ? Date.parse(promotionExpiry) : null;
    if (
      !promotionCode.trim() ||
      !Number.isFinite(parsedPercent) ||
      selectedPlans.length === 0
    )
      return;
    createPromotion.mutate({
      code: promotionCode.trim(),
      percentOff: parsedPercent,
      applicablePlans: selectedPlans,
      firstTimeTransaction: firstTimeOnly,
      expiresAt: parsedExpiry,
      maxRedemptions: parsedMaximum,
    });
  };

  const submitGrant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDuration = Number(durationValue);
    if (!grantEmail.trim() || !Number.isInteger(parsedDuration)) return;
    createGrant.mutate({
      email: grantEmail.trim(),
      durationValue: parsedDuration,
      durationUnit,
      note: grantNote.trim() || null,
    });
  };

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lookupEmail.trim()) return;
    setLookupTarget(lookupEmail.trim());
  };

  const copyPromotionCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(
        t("adminRevenueControls.promotion.copied", {
          defaultValue: "Promotion code copied.",
        })
      );
    } catch {
      toast.error(
        t("adminRevenueControls.promotion.copyError", {
          defaultValue: "Promotion code could not be copied.",
        })
      );
    }
  };

  const confirmRevoke = (grantId: number) => {
    if (
      window.confirm(
        t("adminRevenueControls.grants.confirmRevoke", {
          defaultValue:
            "Revoke this complimentary-access grant now? This immediately removes paid-feature and quota access.",
        })
      )
    ) {
      revokeGrant.mutate({ grantId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen rr-bg-navy flex items-center justify-center">
        <Loader2 size={32} className="animate-spin rr-text-gold" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen rr-bg-navy flex flex-col items-center justify-center px-6 text-center">
        <ShieldCheck size={30} className="rr-text-gold" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-black text-white">
          {t("adminRevenueControls.accessRequired", {
            defaultValue: "Administrator access required",
          })}
        </h1>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-5 min-h-11 rounded-xl px-5 font-bold rr-bg-gold rr-text-navy"
        >
          {t("adminRevenueControls.goHome", { defaultValue: "Go home" })}
        </button>
      </div>
    );
  }

  const promotions = promotionQuery.data?.promotions ?? [];
  const grants = grantQuery.data ?? [];
  const lookupResults = lookupQuery.data ?? [];

  return (
    <div
      className="min-h-screen pb-40 rr-bg-cream-warm"
      data-testid="admin-revenue-controls-page"
    >
      <header className="rr-bg-navy px-5 pb-7 pt-12 text-white sm:px-7">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.18_80)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("adminRevenueControls.back", {
            defaultValue: "Back to administration",
          })}
        </button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 rr-text-gold">
              <BadgePercent size={18} aria-hidden="true" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                {t("adminRevenueControls.eyebrow", {
                  defaultValue: "Revenue operations",
                })}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {t("adminRevenueControls.title", {
                defaultValue: "Revenue controls",
              })}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              {t("adminRevenueControls.description", {
                defaultValue:
                  "Create scoped Stripe promotion codes and grant temporary complimentary access without changing billing plans.",
              })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-64">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold text-white/60">
                {t("adminRevenueControls.summary.activePromotions", {
                  defaultValue: "Active promotions",
                })}
              </p>
              <p className="mt-1 text-2xl font-black rr-text-gold">
                {activePromotionCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold text-white/60">
                {t("adminRevenueControls.summary.activeGrants", {
                  defaultValue: "Active grants",
                })}
              </p>
              <p className="mt-1 text-2xl font-black rr-text-gold">
                {activeGrantCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section
          aria-labelledby="promotion-controls-title"
          className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 rr-text-navy">
                <TicketPercent size={20} aria-hidden="true" />
                <h2
                  id="promotion-controls-title"
                  className="text-xl font-semibold"
                >
                  {t("adminRevenueControls.promotion.title", {
                    defaultValue: "Stripe promotion codes",
                  })}
                </h2>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 rr-text-navy-muted">
                {t("adminRevenueControls.promotion.description", {
                  defaultValue:
                    "Each code applies to one checkout invoice or transaction. Select the eligible plans and optional redemption limits.",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => promotionQuery.refetch()}
              disabled={promotionQuery.isFetching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold rr-text-navy transition active:scale-[0.97] disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={promotionQuery.isFetching ? "animate-spin" : ""}
                aria-hidden="true"
              />
              {t("adminRevenueControls.refresh", { defaultValue: "Refresh" })}
            </button>
          </div>

          <form
            onSubmit={submitPromotion}
            className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-12"
            data-testid="promotion-code-form"
          >
            <label className="lg:col-span-4">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.code", {
                  defaultValue: "Code",
                })}
              </span>
              <input
                value={promotionCode}
                onChange={event =>
                  setPromotionCode(
                    event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                  )
                }
                className={inputClass}
                minLength={3}
                maxLength={64}
                placeholder="LAUNCH20"
                autoComplete="off"
                required
                name="rr-pages-admin-revenue-controls-promotion-code-255"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.percentOff", {
                  defaultValue: "Percentage off",
                })}
              </span>
              <input
                type="number"
                value={percentOff}
                onChange={event => setPercentOff(event.target.value)}
                className={inputClass}
                min={0.01}
                max={100}
                step={0.01}
                required
                name="rr-pages-admin-revenue-controls-percent-off-259"
              />
            </label>
            <label className="lg:col-span-3">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.maxRedemptions", {
                  defaultValue: "Maximum redemptions",
                })}
              </span>
              <input
                type="number"
                value={maxRedemptions}
                onChange={event => setMaxRedemptions(event.target.value)}
                className={inputClass}
                min={1}
                max={100000}
                placeholder={t("adminRevenueControls.unlimited", {
                  defaultValue: "Unlimited",
                })}
                name="rr-pages-admin-revenue-controls-max-redemptions-263"
              />
            </label>
            <label className="lg:col-span-3">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.expiresAt", {
                  defaultValue: "Expires at",
                })}
              </span>
              <input
                type="datetime-local"
                value={promotionExpiry}
                onChange={event => setPromotionExpiry(event.target.value)}
                className={inputClass}
                name="rr-pages-admin-revenue-controls-promotion-expiry-267"
              />
            </label>

            <fieldset className="lg:col-span-8">
              <legend className="mb-2 text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.eligiblePlans", {
                  defaultValue: "Eligible plans",
                })}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {planOptions.map(plan => {
                  const selected = selectedPlans.includes(plan);
                  return (
                    <button
                      key={plan}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePlan(plan)}
                      className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-bold capitalize transition active:scale-[0.98] ${selected ? "border-[oklch(0.66_0.16_80)] bg-[oklch(0.95_0.05_80)] rr-text-navy" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      {t(`adminRevenueControls.plans.${plan}`, {
                        defaultValue: plan,
                      })}
                      {selected && <Check size={15} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 lg:col-span-4">
              <input
                type="checkbox"
                checked={firstTimeOnly}
                onChange={event => setFirstTimeOnly(event.target.checked)}
                className="size-4 accent-[oklch(0.65_0.16_80)]"
                name="rr-pages-admin-revenue-controls-first-time-only-285"
              />
              <span className="text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.firstTimeOnly", {
                  defaultValue: "First transaction only",
                })}
              </span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
              <p className="text-xs leading-5 text-slate-500">
                {t("adminRevenueControls.promotion.oneTimeNote", {
                  defaultValue:
                    "The discount duration is fixed to one invoice or transaction. Stripe remains the source of truth.",
                })}
              </p>
              <button
                type="submit"
                disabled={
                  createPromotion.isPending || selectedPlans.length === 0
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black rr-bg-gold rr-text-navy transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createPromotion.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {createPromotion.isPending
                  ? t("adminRevenueControls.promotion.creating", {
                      defaultValue: "Creating…",
                    })
                  : t("adminRevenueControls.promotion.create", {
                      defaultValue: "Create promotion",
                    })}
              </button>
            </div>
          </form>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <h3 className="font-bold rr-text-navy">
                {t("adminRevenueControls.promotion.liveCodes", {
                  defaultValue: "Live Stripe codes",
                })}
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {promotions.length}
              </span>
            </div>
            {promotionQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin rr-text-navy" />
              </div>
            ) : promotionQuery.error ? (
              <div className="flex gap-3 p-4 text-sm text-rose-800">
                <CircleAlert size={18} className="shrink-0" />
                <p>{promotionQuery.error.message}</p>
              </div>
            ) : promotions.length === 0 ? (
              <p className="p-5 text-center text-sm text-slate-500">
                {t("adminRevenueControls.promotion.empty", {
                  defaultValue: "No Stripe promotion codes yet.",
                })}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {promotions.map(promotion => (
                  <article
                    key={promotion.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black tracking-wider rr-text-navy">
                          {promotion.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPromotionCode(promotion.code)}
                          aria-label={t(
                            "adminRevenueControls.promotion.copyCode",
                            { defaultValue: "Copy promotion code" }
                          )}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <Copy size={14} />
                        </button>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${promotionStatusStyle(promotion.status)}`}
                        >
                          {t(
                            `adminRevenueControls.promotion.status.${promotion.status}`,
                            { defaultValue: promotion.status }
                          )}
                        </span>
                      </div>
                      <p className="mt-1 font-black rr-text-gold">
                        {promotion.discountLabel}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {promotion.applicablePlans
                          .map(plan =>
                            t(`adminRevenueControls.plans.${plan}`, {
                              defaultValue: plan,
                            })
                          )
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-semibold">
                        {t("adminRevenueControls.promotion.redemptions", {
                          defaultValue: "Redemptions",
                        })}
                        : {promotion.timesRedeemed} /{" "}
                        {promotion.maxRedemptions ?? (
                          <Infinity size={13} className="inline" />
                        )}
                      </p>
                      <p className="mt-1 text-xs">
                        {formatDate(
                          promotion.expiresAt,
                          t("adminRevenueControls.noExpiry", {
                            defaultValue: "No expiry",
                          })
                        )}
                      </p>
                    </div>
                    {promotion.firstTimeTransaction && (
                      <span className="w-fit rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">
                        {t("adminRevenueControls.promotion.firstTimeBadge", {
                          defaultValue: "First transaction",
                        })}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="grant-controls-title"
          className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
              <Gift size={20} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="grant-controls-title"
                className="text-xl font-semibold rr-text-navy"
              >
                {t("adminRevenueControls.grants.title", {
                  defaultValue: "Complimentary access",
                })}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 rr-text-navy-muted">
                {t("adminRevenueControls.grants.description", {
                  defaultValue:
                    "Grant temporary paid-feature and request-quota access by email. Access starts immediately, expires automatically, and never renews.",
                })}
              </p>
            </div>
          </div>

          <form
            onSubmit={submitGrant}
            className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 lg:grid-cols-12"
            data-testid="complimentary-access-form"
          >
            <label className="lg:col-span-5">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.grants.email", {
                  defaultValue: "Customer email",
                })}
              </span>
              <input
                type="email"
                value={grantEmail}
                onChange={event => setGrantEmail(event.target.value)}
                className={inputClass}
                maxLength={320}
                autoComplete="off"
                required
                name="rr-pages-admin-revenue-controls-grant-email-327"
              />
              <span className="mt-1.5 block text-xs text-slate-500">
                {t("adminRevenueControls.grants.privacy", {
                  defaultValue:
                    "Stored as a one-way fingerprint plus a masked display value.",
                })}
              </span>
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.grants.duration", {
                  defaultValue: "Duration",
                })}
              </span>
              <input
                type="number"
                value={durationValue}
                onChange={event => setDurationValue(event.target.value)}
                className={inputClass}
                min={1}
                max={grantDurationMaximums[durationUnit]}
                required
                name="rr-pages-admin-revenue-controls-duration-value-328"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.grants.unit", {
                  defaultValue: "Unit",
                })}
              </span>
              <select
                value={durationUnit}
                onChange={event =>
                  setDurationUnit(event.target.value as GrantDurationUnit)
                }
                className={inputClass}
                name="rr-pages-admin-revenue-controls-duration-unit-329"
              >
                <option value="day">
                  {t("adminRevenueControls.grants.units.day", {
                    defaultValue: "Day(s)",
                  })}
                </option>
                <option value="month">
                  {t("adminRevenueControls.grants.units.month", {
                    defaultValue: "Month(s)",
                  })}
                </option>
                <option value="year">
                  {t("adminRevenueControls.grants.units.year", {
                    defaultValue: "Year(s)",
                  })}
                </option>
              </select>
            </label>
            <label className="lg:col-span-3">
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.grants.note", {
                  defaultValue: "Internal note",
                })}
              </span>
              <input
                value={grantNote}
                onChange={event => setGrantNote(event.target.value)}
                className={inputClass}
                maxLength={500}
                placeholder={t("adminRevenueControls.grants.notePlaceholder", {
                  defaultValue: "Partner, support, or launch reason",
                })}
                name="rr-pages-admin-revenue-controls-grant-note-330"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CalendarClock size={15} className="rr-text-gold" />
                {t("adminRevenueControls.grants.expiryNote", {
                  defaultValue:
                    "No renewal or background job: access ends at the stored UTC expiry.",
                })}
              </p>
              <button
                type="submit"
                disabled={createGrant.isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black rr-bg-gold rr-text-navy transition active:scale-[0.97] disabled:opacity-60"
              >
                {createGrant.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Gift size={16} />
                )}
                {createGrant.isPending
                  ? t("adminRevenueControls.grants.granting", {
                      defaultValue: "Granting…",
                    })
                  : t("adminRevenueControls.grants.grant", {
                      defaultValue: "Grant access",
                    })}
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <form onSubmit={submitLookup}>
              <label>
                <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                  {t("adminRevenueControls.grants.lookup", {
                    defaultValue: "Exact-email lookup",
                  })}
                </span>
                <span className="flex gap-2">
                  <input
                    type="email"
                    value={lookupEmail}
                    onChange={event => setLookupEmail(event.target.value)}
                    className={inputClass}
                    maxLength={320}
                    autoComplete="off"
                    placeholder={t(
                      "adminRevenueControls.grants.lookupPlaceholder",
                      { defaultValue: "customer@example.com" }
                    )}
                    name="rr-pages-admin-revenue-controls-lookup-email-335"
                  />
                  <button
                    type="submit"
                    disabled={lookupQuery.isFetching}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {lookupQuery.isFetching ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                    {t("adminRevenueControls.grants.search", {
                      defaultValue: "Search",
                    })}
                  </button>
                </span>
              </label>
            </form>
            <label>
              <span className="mb-1.5 block text-sm font-bold rr-text-navy">
                {t("adminRevenueControls.grants.filter", {
                  defaultValue: "Status filter",
                })}
              </span>
              <select
                value={grantStatus}
                onChange={event =>
                  setGrantStatus(event.target.value as GrantStatus)
                }
                className={`${inputClass} lg:min-w-44`}
                name="rr-pages-admin-revenue-controls-grant-status-336"
              >
                <option value="all">
                  {t("adminRevenueControls.grants.status.all", {
                    defaultValue: "All grants",
                  })}
                </option>
                <option value="active">
                  {t("adminRevenueControls.grants.status.active", {
                    defaultValue: "Active",
                  })}
                </option>
                <option value="expired">
                  {t("adminRevenueControls.grants.status.expired", {
                    defaultValue: "Expired",
                  })}
                </option>
                <option value="revoked">
                  {t("adminRevenueControls.grants.status.revoked", {
                    defaultValue: "Revoked",
                  })}
                </option>
              </select>
            </label>
          </div>

          {lookupTarget && (
            <div
              className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-indigo-950">
                  {t("adminRevenueControls.grants.lookupResults", {
                    defaultValue: "Lookup results",
                  })}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setLookupTarget(null);
                    setLookupEmail("");
                  }}
                  className="text-xs font-bold text-indigo-700"
                >
                  {t("adminRevenueControls.clear", { defaultValue: "Clear" })}
                </button>
              </div>
              {lookupQuery.error ? (
                <p className="mt-2 text-sm text-rose-800">
                  {lookupQuery.error.message}
                </p>
              ) : lookupQuery.isFetching ? (
                <Loader2
                  size={18}
                  className="mt-3 animate-spin text-indigo-800"
                />
              ) : lookupResults.length === 0 ? (
                <p className="mt-2 text-sm text-indigo-800">
                  {t("adminRevenueControls.grants.noLookupResults", {
                    defaultValue:
                      "No complimentary-access history was found for that exact email.",
                  })}
                </p>
              ) : (
                <p className="mt-2 text-sm text-indigo-800">
                  {t("adminRevenueControls.grants.lookupCount", {
                    defaultValue: "{{count}} matching grant record(s).",
                    count: lookupResults.length,
                  })}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <h3 className="font-bold rr-text-navy">
                {t("adminRevenueControls.grants.history", {
                  defaultValue: "Grant history",
                })}
              </h3>
              <button
                type="button"
                onClick={() => grantQuery.refetch()}
                disabled={grantQuery.isFetching}
                aria-label={t("adminRevenueControls.refresh", {
                  defaultValue: "Refresh",
                })}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={grantQuery.isFetching ? "animate-spin" : ""}
                />
              </button>
            </div>
            {grantQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin rr-text-navy" />
              </div>
            ) : grantQuery.error ? (
              <div className="flex gap-3 p-4 text-sm text-rose-800">
                <CircleAlert size={18} className="shrink-0" />
                <p>{grantQuery.error.message}</p>
              </div>
            ) : grants.length === 0 ? (
              <p className="p-5 text-center text-sm text-slate-500">
                {t("adminRevenueControls.grants.empty", {
                  defaultValue: "No grants match this filter.",
                })}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {grants.map(grant => (
                  <article
                    key={grant.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black rr-text-navy">
                          {grant.emailMasked}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${grantStatusStyle(grant.status)}`}
                        >
                          {t(
                            `adminRevenueControls.grants.status.${grant.status}`,
                            { defaultValue: grant.status }
                          )}
                        </span>
                        {grant.accountLinked && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-800">
                            {t("adminRevenueControls.grants.accountLinked", {
                              defaultValue: "Account linked",
                            })}
                          </span>
                        )}
                      </div>
                      {grant.note && (
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {grant.note}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {grant.durationValue}{" "}
                        {t(
                          `adminRevenueControls.grants.units.${grant.durationUnit}`,
                          { defaultValue: grant.durationUnit }
                        )}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-semibold">
                        {t("adminRevenueControls.grants.expires", {
                          defaultValue: "Expires",
                        })}
                      </p>
                      <p className="mt-1 text-xs">
                        {formatDate(grant.expiresAt, "—")}
                      </p>
                    </div>
                    {grant.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => confirmRevoke(grant.id)}
                        disabled={revokeGrant.isPending}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-800 transition active:scale-[0.97] disabled:opacity-60"
                      >
                        <Ban size={14} />
                        {t("adminRevenueControls.grants.revoke", {
                          defaultValue: "Revoke",
                        })}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        {grant.status === "revoked"
                          ? t("adminRevenueControls.grants.revoked", {
                              defaultValue: "Revoked",
                            })
                          : t("adminRevenueControls.grants.ended", {
                              defaultValue: "Ended",
                            })}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
