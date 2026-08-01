import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Outcome = "all" | "allowed" | "verified" | "restricted" | "blocked";
type DisposableQueueStatus = "all" | "pending" | "dismissed" | "resolved";

const outcomeLabels: Record<Exclude<Outcome, "all">, string> = {
  allowed: "Allowed",
  verified: "Verified",
  restricted: "Restricted",
  blocked: "Blocked",
};

const disposableLabels: Record<Exclude<DisposableQueueStatus, "all">, string> = {
  pending: "Pending review",
  dismissed: "Dismissed",
  resolved: "Reviewed",
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-[#0F1B2D]">{value}</p>
  </article>;
}

export default function AdminSignupRisk() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [queueStatus, setQueueStatus] = useState<DisposableQueueStatus>("pending");
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);

  const input = useMemo(
    () => ({ limit: 50, ...(outcome === "all" ? {} : { outcome }) }),
    [outcome]
  );
  const queueInput = useMemo(
    () => ({ limit: 50, ...(queueStatus === "all" ? {} : { status: queueStatus }) }),
    [queueStatus]
  );
  const query = trpc.signupRiskReview.dashboard.useQuery(input, {
    enabled: user?.role === "admin",
  });
  const queueQuery = trpc.signupRiskReview.disposableDomainQueue.useQuery(queueInput, {
    enabled: user?.role === "admin",
  });
  const catalogSync = trpc.signupRiskReview.syncDisposableDomainCatalog.useMutation({
    onSuccess: result => {
      if (result.status === "ok") {
        setCatalogNotice(
          `Catalog synchronized: ${result.summary.normalizedDomains.toLocaleString()} normalized domains; ${result.summary.accountReviews.toLocaleString()} existing accounts placed in review.`
        );
        void utils.signupRiskReview.disposableDomainQueue.invalidate();
      } else if (result.status === "cooldown") {
        setCatalogNotice("A catalog synchronization ran recently. Please wait a few minutes before trying again.");
      } else {
        setCatalogNotice("The scheduled catalog is not ready yet. Try again after the service finishes starting.");
      }
    },
    onError: () => setCatalogNotice("Catalog synchronization could not complete. The existing catalog and account access were not changed."),
  });
  const resolveReview = trpc.signupRiskReview.resolveDisposableDomainReview.useMutation({
    onSuccess: () => void utils.signupRiskReview.disposableDomainQueue.invalidate(),
  });

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/", { replace: true });
  }, [loading, navigate, user?.role]);

  if (loading || user?.role !== "admin") {
    return <div className="min-h-[50vh] p-6 text-sm text-slate-500">Loading administrator review…</div>;
  }

  const data = query.data;
  const queue = queueQuery.data;

  return <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="rounded-3xl bg-[#0F1B2D] p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Administrator controls</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Signup risk review</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">This view contains operational status, domain-risk evidence, provider, and time only. It does not expose emails, IP addresses, devices, fingerprints, or challenge data.</p>
        </div>
        <ShieldCheck className="h-10 w-10 text-[#C9A84C]" aria-hidden="true" />
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {(["total", "allowed", "verified", "restricted", "blocked"] as const).map(key => (
        <SummaryCard key={key} label={key} value={data?.summary[key] ?? 0} />
      ))}
    </div>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9A84C]">Disposable-email catalog</p>
          <h2 className="mt-1 text-lg font-bold text-[#0F1B2D]">Initialize protected signups</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">The nightly Pacific-time job keeps the local catalog current. Use this once after release to load the first catalog; repeated requests are rate-limited. A sync never deletes or restricts an existing account.</p>
        </div>
        <button type="button" onClick={() => catalogSync.mutate()} disabled={catalogSync.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0F1B2D] px-4 text-sm font-bold text-white transition hover:bg-[#172945] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2">
          <RefreshCw className={`h-4 w-4 ${catalogSync.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {catalogSync.isPending ? "Synchronizing catalog…" : "Sync catalog now"}
        </button>
      </div>
      {catalogNotice && <p role="status" aria-live="polite" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{catalogNotice}</p>}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-[#0F1B2D]">Existing-account review queue</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">A high-confidence domain match opens a private review item only. Neither action below changes account access, billing, outreach, or customer data.</p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          <span className="sr-only">Filter disposable-domain review status</span>
          <select value={queueStatus} onChange={event => setQueueStatus(event.target.value as DisposableQueueStatus)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-[#C9A84C] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30">
            <option value="all">All review statuses</option>
            {Object.entries(disposableLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {(["total", "pending", "dismissed", "resolved"] as const).map(key => (
          <SummaryCard key={key} label={key === "resolved" ? "reviewed" : key} value={queue?.summary[key] ?? 0} />
        ))}
      </div>
      {queueQuery.isLoading ? <p className="py-10 text-center text-sm text-slate-500">Loading review queue…</p> : queueQuery.isError ? <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />Unable to load disposable-domain review data.</div> : queue?.reviews.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Domain</th><th className="px-3 py-3">Confidence</th><th className="px-3 py-3">Last detected</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"><span className="sr-only">Review action</span></th></tr></thead><tbody>{queue.reviews.map(review => <tr key={review.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold text-[#0F1B2D]">{review.domain}</td><td className="px-3 py-4 text-slate-700">{review.confidenceScore}/100</td><td className="px-3 py-4 text-slate-600">{new Date(review.lastDetectedAt).toLocaleString()}</td><td className="px-3 py-4 text-slate-700">{disposableLabels[review.status as Exclude<DisposableQueueStatus, "all">]}</td><td className="px-3 py-4"><div className="flex flex-wrap justify-end gap-2">{review.status === "pending" ? <><button type="button" disabled={resolveReview.isPending} onClick={() => resolveReview.mutate({ reviewId: review.id, status: "dismissed", adminNote: "Legitimate account; no action required." })} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Dismiss</button><button type="button" disabled={resolveReview.isPending} onClick={() => resolveReview.mutate({ reviewId: review.id, status: "resolved", adminNote: "Reviewed; account access unchanged." })} className="min-h-9 rounded-lg bg-[#0F1B2D] px-3 text-xs font-bold text-white transition hover:bg-[#172945] disabled:opacity-60">Mark reviewed</button></> : <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Review action completed" />}</div></td></tr>)}</tbody></table></div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" /><h3 className="mt-3 font-bold text-[#0F1B2D]">No matching accounts require review</h3><p className="mt-1 text-sm text-slate-500">The queue remains empty until a catalog sync identifies a high-confidence match.</p></div>}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-lg font-bold text-[#0F1B2D]">Recent safe status events</h2><p className="mt-1 text-sm text-slate-500">Filter by outcome. The feed is limited to the latest 50 records.</p></div>
        <label className="text-sm font-semibold text-slate-700"><span className="sr-only">Filter status</span><select value={outcome} onChange={event => setOutcome(event.target.value as Outcome)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-[#C9A84C] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30"><option value="all">All statuses</option>{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {query.isLoading ? <p className="py-10 text-center text-sm text-slate-500">Loading safe status events…</p> : query.isError ? <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />Unable to load signup-risk review data.</div> : data?.events.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Status</th><th className="px-3 py-3">Provider</th><th className="px-3 py-3">Recorded</th></tr></thead><tbody>{data.events.map(event => <tr key={event.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold text-[#0F1B2D]">{outcomeLabels[event.outcome]}</td><td className="px-3 py-4 capitalize text-slate-700">{event.provider}</td><td className="px-3 py-4 text-slate-600">{new Date(event.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" /><h3 className="mt-3 font-bold text-[#0F1B2D]">No matching status events</h3><p className="mt-1 text-sm text-slate-500">No protected evidence is shown when there are no matching aggregate events.</p></div>}
    </section>
  </section>;
}
