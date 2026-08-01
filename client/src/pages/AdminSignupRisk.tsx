import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Outcome = "all" | "allowed" | "verified" | "restricted" | "blocked";
const labels: Record<Exclude<Outcome, "all">, string> = { allowed: "Allowed", verified: "Verified", restricted: "Restricted", blocked: "Blocked" };

export default function AdminSignupRisk() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [outcome, setOutcome] = useState<Outcome>("all");
  const input = useMemo(() => ({ limit: 50, ...(outcome === "all" ? {} : { outcome }) }), [outcome]);
  const query = trpc.signupRiskReview.dashboard.useQuery(input, { enabled: user?.role === "admin" });

  useEffect(() => { if (!loading && user?.role !== "admin") navigate("/", { replace: true }); }, [loading, navigate, user?.role]);
  if (loading || user?.role !== "admin") return <div className="min-h-[50vh] p-6 text-sm text-slate-500">Loading administrator review…</div>;
  const data = query.data;

  return <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="rounded-3xl bg-[#0F1B2D] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Administrator controls</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Signup risk review</h1><p className="mt-3 text-sm leading-relaxed text-white/70">This view intentionally contains only operational status, provider, and time. It does not expose emails, IP addresses, devices, fingerprints, or challenge data.</p></div><ShieldCheck className="h-10 w-10 text-[#C9A84C]" aria-hidden="true" /></div></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{(["total", "allowed", "verified", "restricted", "blocked"] as const).map((key) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{key}</p><p className="mt-1 text-2xl font-black text-[#0F1B2D]">{data?.summary[key] ?? 0}</p></article>)}</div>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-[#0F1B2D]">Recent safe status events</h2><p className="mt-1 text-sm text-slate-500">Filter by outcome. The feed is limited to the latest 50 records.</p></div><label className="text-sm font-semibold text-slate-700"><span className="sr-only">Filter status</span><select value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-[#C9A84C] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30"><option value="all">All statuses</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{query.isLoading ? <p className="py-10 text-center text-sm text-slate-500">Loading safe status events…</p> : query.isError ? <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />Unable to load signup-risk review data.</div> : data?.events.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Status</th><th className="px-3 py-3">Provider</th><th className="px-3 py-3">Recorded</th></tr></thead><tbody>{data.events.map((event) => <tr key={event.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold text-[#0F1B2D]">{labels[event.outcome]}</td><td className="px-3 py-4 capitalize text-slate-700">{event.provider}</td><td className="px-3 py-4 text-slate-600">{new Date(event.occurredAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" /><h3 className="mt-3 font-bold text-[#0F1B2D]">No matching status events</h3><p className="mt-1 text-sm text-slate-500">No protected evidence is shown when there are no matching aggregate events.</p></div>}</section>
  </section>;
}
