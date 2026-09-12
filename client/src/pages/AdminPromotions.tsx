import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  Infinity,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";

const planLabel: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annual",
  lifetime: "Lifetime",
};

function formatDate(value: number | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusAppearance(
  status: "active" | "inactive" | "expired" | "redeemed"
) {
  if (status === "active") {
    return {
      label: "Active",
      background: "oklch(0.35 0.12 145)",
      color: "oklch(0.80 0.22 145)",
    };
  }
  if (status === "redeemed") {
    return {
      label: "Redeemed",
      background: "oklch(0.35 0.08 70)",
      color: "oklch(0.86 0.16 80)",
    };
  }
  if (status === "expired") {
    return {
      label: "Expired",
      background: "oklch(0.35 0.08 20)",
      color: "oklch(0.78 0.14 20)",
    };
  }
  return {
    label: "Inactive",
    background: "oklch(0.32 0.03 260)",
    color: "oklch(0.75 0.02 260)",
  };
}

export default function AdminPromotionsPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const query = trpc.stripe.promotionMonitor.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchOnWindowFocus: false,
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Could not copy the promotion code.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center rr-bg-navy">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 rr-bg-navy">
        <ShieldCheck size={28} className="rr-text-gold mb-3" />
        <p className="text-white text-xl font-black mb-4">
          Admin access required.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-base font-bold text-white"
        >
          Go home
        </button>
      </div>
    );
  }

  const promotions = query.data?.promotions ?? [];
  const activeCount = promotions.filter(
    promotion => promotion.status === "active"
  ).length;

  return (
    <div className="min-h-screen pb-36 rr-bg-navy">
      <header className="px-5 pt-14 pb-6">
        <button
          onClick={() => navigate("/admin/codes")}
          className="flex items-center gap-1 text-sm font-bold mb-4"
          style={{ color: "var(--text-on-dark-secondary)" }}
        >
          <ChevronLeft size={16} /> Back to access codes
        </button>
        <div className="flex items-center gap-2 mb-1">
          <TicketPercent size={17} className="rr-text-gold" />
          <span className="text-xs font-bold tracking-widest uppercase rr-text-gold">
            Stripe monitor
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Promotion codes</h1>
            <p className="mt-1 text-sm leading-6 text-white/85 max-w-xl">
              Live Stripe status, redemptions, expiry, and eligible Get Phame
              plans. This page is read-only.
            </p>
          </div>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold rr-text-gold disabled:opacity-60"
            style={{
              background: "oklch(0.30 0.07 260)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <RefreshCw
              size={14}
              className={query.isFetching ? "animate-spin" : ""}
            />{" "}
            Refresh
          </button>
        </div>
      </header>

      <main className="px-4 space-y-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 rr-bg-navy-mid">
            <p className="text-xs uppercase tracking-wider font-bold text-white/65">
              Active codes
            </p>
            <p className="mt-1 text-3xl font-black text-white">{activeCount}</p>
          </div>
          <div className="rounded-2xl p-4 rr-bg-navy-mid">
            <p className="text-xs uppercase tracking-wider font-bold text-white/65">
              All Stripe codes
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              {promotions.length}
            </p>
          </div>
        </section>

        {query.isLoading ? (
          <div className="rounded-2xl py-12 rr-bg-navy-mid flex justify-center">
            <Loader2 size={28} className="animate-spin rr-text-gold" />
          </div>
        ) : query.error ? (
          <section
            className="rounded-2xl p-5 rr-bg-navy-mid"
            style={{ border: "1px solid oklch(0.52 0.13 25 / 0.7)" }}
          >
            <div className="flex gap-3">
              <CircleAlert
                className="shrink-0"
                size={20}
                style={{ color: "oklch(0.78 0.14 20)" }}
              />
              <div>
                <h2 className="font-black text-white">
                  Stripe data is unavailable
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/80">
                  {query.error.message}
                </p>
                <button
                  onClick={() => query.refetch()}
                  className="mt-4 text-sm font-black rr-text-gold"
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        ) : promotions.length === 0 ? (
          <section className="rounded-2xl p-7 text-center rr-bg-navy-mid">
            <CreditCard size={24} className="mx-auto rr-text-gold" />
            <h2 className="mt-3 font-black text-white">
              No Stripe promotion codes yet
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Create codes in Stripe. They will appear here on the next refresh.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl rr-bg-navy-mid">
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h2 className="font-black text-white">Live Stripe codes</h2>
              <span className="text-xs font-bold text-white/60">
                Updated {formatDate(query.data?.refreshedAt ?? null)}
              </span>
            </div>
            <div
              className="divide-y"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              {promotions.map(promotion => {
                const badge = statusAppearance(promotion.status);
                return (
                  <article key={promotion.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black tracking-wider text-sm text-white">
                            {promotion.code}
                          </span>
                          <button
                            onClick={() => copyCode(promotion.code)}
                            className="p-1 text-white/55 hover:text-white"
                            aria-label={`Copy ${promotion.code}`}
                          >
                            <Copy size={13} />
                          </button>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background: badge.background,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-2 text-lg font-black rr-text-gold">
                          {promotion.discountLabel}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-white/55">Redemptions</p>
                        <p className="font-black text-white">
                          {promotion.timesRedeemed} /{" "}
                          {promotion.maxRedemptions ?? (
                            <Infinity size={14} className="inline -mt-0.5" />
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{ background: "oklch(0.22 0.09 260)" }}
                      >
                        <p className="text-xs font-bold text-white/55">
                          Eligible plans
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {promotion.applicablePlans
                            .map(plan => planLabel[plan])
                            .join(" · ") || "No matching plan"}
                        </p>
                      </div>
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{ background: "oklch(0.22 0.09 260)" }}
                      >
                        <p className="text-xs font-bold text-white/55">
                          Availability
                        </p>
                        <p className="mt-1 font-bold text-white flex items-center gap-1.5">
                          <Clock3 size={13} className="rr-text-gold" />{" "}
                          {formatDate(promotion.expiresAt)}
                        </p>
                      </div>
                    </div>
                    {promotion.firstTimeTransaction && (
                      <p className="mt-3 text-xs font-bold text-white/70">
                        First-time transaction only
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
