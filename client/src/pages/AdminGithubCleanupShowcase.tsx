import BrandLockup from "@/components/BrandLockup";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  GitBranch,
  GitMerge,
  Loader2,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLocation } from "wouter";

const metricDimensions = ["isolation", "compatibility", "evidence", "dependencies", "valueRisk"] as const;
const readinessLabels = ["portable", "specification", "stale", "blocked", "superseded"] as const;

const workstreamTone = {
  mailjet: "border-emerald-300 bg-emerald-50 text-emerald-950",
  helpAssistant: "border-sky-300 bg-sky-50 text-sky-950",
  sourcesWoo: "border-orange-300 bg-orange-50 text-orange-950",
  wooEntitlement: "border-rose-300 bg-rose-50 text-rose-950",
} as const;

export default function AdminGithubCleanupShowcase() {
  const { t } = useTranslation("translation");
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin";
  const showcase = trpc.githubCleanupShowcase.dashboard.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!authLoading && user && !isAdmin) navigate("/");
  }, [authLoading, isAdmin, navigate, user]);

  if (authLoading || (isAdmin && showcase.isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rr-bg-offwhite" data-testid="github-cleanup-showcase-loading">
        <Loader2 className="animate-spin rr-text-navy" size={34} aria-label={t("adminGithubCleanup.loading", { defaultValue: "Loading cleanup showcase" })} />
      </div>
    );
  }

  if (!isAdmin) return null;

  if (showcase.error || !showcase.data) {
    return (
      <div className="min-h-[70vh] rr-bg-offwhite px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm" role="alert">
          <AlertTriangle className="mx-auto text-rose-600" size={30} />
          <h1 className="mt-3 text-xl font-bold rr-text-navy">{t("adminGithubCleanup.errorTitle", { defaultValue: "Showcase unavailable" })}</h1>
          <p className="mt-2 text-sm rr-text-navy-muted">{t("adminGithubCleanup.errorBody", { defaultValue: "The administrator-only repository evidence could not be loaded." })}</p>
          <button type="button" onClick={() => navigate("/admin")} className="mt-5 min-h-11 rounded-xl rr-bg-navy px-5 text-sm font-bold text-white active:scale-[0.97]">
            {t("adminGithubCleanup.backToAdmin", { defaultValue: "Back to Administration" })}
          </button>
        </div>
      </div>
    );
  }

  const data = showcase.data;
  const copyScript = async () => {
    const text = data.script.scenes.map((scene, index) => `${index + 1}. ${scene.title}\n${scene.narration}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("adminGithubCleanup.scriptCopied", { defaultValue: "Presentation script copied." }));
    } catch {
      toast.error(t("adminGithubCleanup.scriptCopyError", { defaultValue: "The script could not be copied." }));
    }
  };

  return (
    <div className="min-h-screen rr-bg-offwhite" data-testid="admin-github-cleanup-showcase">
      <header className="rr-bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/admin")} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition active:scale-[0.97]">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("adminGithubCleanup.backToAdmin", { defaultValue: "Back to Administration" })}
          </button>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <BrandLockup iconClassName="h-9 w-9" textClassName="text-lg" />
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4A017]/50 bg-[#D4A017]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
                <LockKeyhole size={14} aria-hidden="true" />
                {t("adminGithubCleanup.adminOnly", { defaultValue: "Administrator only" })}
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                {t("adminGithubCleanup.title", { defaultValue: "GitHub repository cleanup skill" })}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                {t("adminGithubCleanup.subtitle", { defaultValue: "Audit branch ancestry, preserve unique work, verify the release tree, and remove only branches proven safe to delete." })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-xl">
              {[
                [t("adminGithubCleanup.stats.main", { defaultValue: "Main" }), data.snapshot.mainShortSha],
                [t("adminGithubCleanup.stats.tree", { defaultValue: "Release tree" }), t("adminGithubCleanup.stats.exact", { defaultValue: "Exact match" })],
                [t("adminGithubCleanup.stats.branches", { defaultValue: "Branches" }), String(data.snapshot.namedBranches)],
                [t("adminGithubCleanup.stats.openPrs", { defaultValue: "Open PRs" }), String(data.snapshot.openPullRequests)],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-[#D4A017]/60 pt-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{label}</p>
                  <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section aria-labelledby="evidence-title">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 rr-text-gold" size={24} aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] rr-text-gold">{t("adminGithubCleanup.evidence.eyebrow", { defaultValue: "Verified repository evidence" })}</p>
              <h2 id="evidence-title" className="mt-1 font-display text-2xl font-extrabold rr-text-navy sm:text-3xl">{t("adminGithubCleanup.evidence.title", { defaultValue: "Current release and preservation state" })}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 rr-text-navy-muted">{t("adminGithubCleanup.evidence.body", { defaultValue: "The protected main tree exactly matches the validated managed release. Push-safe remains isolated because it contains unique but outdated work that must be extracted selectively." })}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl bg-[#061a3a] shadow-sm" aria-labelledby="branch-ancestry-caption">
              <div className="p-5 sm:p-6">
                <p className="sr-only">{t("adminGithubCleanup.visuals.ancestryAlt", { defaultValue: "Branch ancestry and preservation map showing protected main, exact release-tree parity, push-safe divergence, and where deleted branch tips remain preserved." })}</p>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] sm:items-center">
                  <div className="border border-white/15 bg-white/[0.06] p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#F3C549]">
                      <ShieldCheck size={15} aria-hidden="true" />
                      {t("adminGithubCleanup.stats.main", { defaultValue: "Main" })}
                    </div>
                    <code className="mt-3 block text-xl font-extrabold text-white">{data.snapshot.mainShortSha}</code>
                    <p className="mt-2 text-xs leading-5 text-white/60">{data.snapshot.requiredCheck}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#F3C549]">{t("adminGithubCleanup.stats.exact", { defaultValue: "Exact match" })}</span>
                    <span className="w-full border-t-2 border-dashed border-[#D4A017]" aria-hidden="true" />
                    <code className="text-[11px] text-white/55">{data.snapshot.treeSha.slice(0, 7)}</code>
                  </div>
                  <div className="border border-[#D4A017]/50 bg-[#D4A017]/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#F3C549]">
                      <GitMerge size={15} aria-hidden="true" />
                      {t("adminGithubCleanup.stats.tree", { defaultValue: "Release tree" })}
                    </div>
                    <code className="mt-3 block text-xl font-extrabold text-white">{data.snapshot.treeSha.slice(0, 7)}</code>
                    <p className="mt-2 text-xs leading-5 text-white/60">{t("adminGithubCleanup.stats.exact", { defaultValue: "Exact match" })}</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <GitBranch size={17} className="text-[#F3C549]" aria-hidden="true" />
                      <code>consolidation/push-safe</code>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <span className="border border-white/10 px-2 py-1.5 text-xs font-black text-emerald-300">+{data.divergence.commitsAhead}</span>
                      <span className="border border-white/10 px-2 py-1.5 text-xs font-black text-rose-300">−{data.divergence.commitsBehindMain}</span>
                      <span className="border border-white/10 px-2 py-1.5 text-xs font-black text-sky-300">{data.divergence.finalTreeFilesDiffer} Δ</span>
                      <span className="border border-white/10 px-2 py-1.5 text-xs font-black text-amber-200">{data.divergence.branchOnlyFiles} ⊕</span>
                    </div>
                  </div>
                </div>
              </div>
              <figcaption id="branch-ancestry-caption" className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-white/75">{t("adminGithubCleanup.visuals.ancestryCaption", { defaultValue: "Solid relationships show verified ancestry; dashed relationships show exact Git-tree parity rather than shared commit history." })}</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-2xl bg-[#061a3a] shadow-sm" aria-labelledby="unique-work-caption">
              <div className="p-5 sm:p-6">
                <p className="sr-only">{t("adminGithubCleanup.visuals.uniqueAlt", { defaultValue: "Unique push-safe work ordered by extraction priority, with readiness and the next safe action for Mailjet, Help Assistant, Sources and WooCommerce, and paid entitlement." })}</p>
                <ol className="space-y-3">
                  {data.workstreams.map((workstream) => (
                    <li key={workstream.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border border-white/10 bg-white/[0.05] p-3">
                      <span className="flex h-10 w-10 items-center justify-center border border-[#D4A017]/60 bg-[#D4A017]/10 text-sm font-black text-[#F3C549]">{workstream.priority}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold leading-5 text-white">{t(`adminGithubCleanup.workstreams.${workstream.id}.title`)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="border border-white/10 px-2 py-1 text-[11px] font-bold text-white/70">{t(`adminGithubCleanup.metrics.readiness.labels.${workstream.readiness}.title`)}</span>
                          <span className="text-[11px] leading-5 text-white/55">{t(`adminGithubCleanup.workstreams.${workstream.id}.action`)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <figcaption id="unique-work-caption" className="border-t border-white/10 px-5 py-4 text-sm leading-6 text-white/75">{t("adminGithubCleanup.visuals.uniqueCaption", { defaultValue: "Priority is action order; readiness describes the evidence-supported treatment at the audit date." })}</figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="metrics-title" className="border-y border-[#0b2a52]/10 py-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] rr-text-gold">{t("adminGithubCleanup.metrics.eyebrow", { defaultValue: "Metric definitions" })}</p>
          <h2 id="metrics-title" className="mt-1 font-display text-2xl font-extrabold rr-text-navy sm:text-3xl">{t("adminGithubCleanup.metrics.title", { defaultValue: "Extraction priority and readiness answer different questions" })}</h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <GitMerge className="rr-text-gold" size={24} aria-hidden="true" />
                <h3 className="text-xl font-extrabold rr-text-navy">{t("adminGithubCleanup.metrics.extraction.title", { defaultValue: "Extraction priority" })}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 rr-text-navy-muted">{t("adminGithubCleanup.metrics.extraction.body", { defaultValue: "An ordinal action order. Priority 1 means evaluate or extract first. It is not urgency, revenue impact, story points, probability of success, or percent complete." })}</p>
              <dl className="mt-5 divide-y divide-[#0b2a52]/10 border-y border-[#0b2a52]/10">
                {metricDimensions.map((dimension) => (
                  <div key={dimension} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="text-sm font-extrabold rr-text-navy">{t(`adminGithubCleanup.metrics.dimensions.${dimension}.title`)}</dt>
                    <dd className="text-sm leading-6 rr-text-navy-muted">{t(`adminGithubCleanup.metrics.dimensions.${dimension}.body`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="rr-text-gold" size={24} aria-hidden="true" />
                <h3 className="text-xl font-extrabold rr-text-navy">{t("adminGithubCleanup.metrics.readiness.title", { defaultValue: "Readiness" })}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 rr-text-navy-muted">{t("adminGithubCleanup.metrics.readiness.body", { defaultValue: "A categorical description of the evidence available at the audit date. It identifies the next safe treatment; it is not a numerical maturity score." })}</p>
              <div className="mt-5 space-y-3">
                {readinessLabels.map((label) => (
                  <div key={label} className="border-l-2 border-[#D4A017] pl-4">
                    <h4 className="text-sm font-extrabold rr-text-navy">{t(`adminGithubCleanup.metrics.readiness.labels.${label}.title`)}</h4>
                    <p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t(`adminGithubCleanup.metrics.readiness.labels.${label}.body`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="workstreams-title">
          <div className="flex items-center gap-3">
            <GitBranch className="rr-text-gold" size={24} aria-hidden="true" />
            <h2 id="workstreams-title" className="font-display text-2xl font-extrabold rr-text-navy sm:text-3xl">{t("adminGithubCleanup.workstreams.title", { defaultValue: "Unique work decision queue" })}</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.workstreams.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-5 shadow-sm ${workstreamTone[item.id]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em]">{t("adminGithubCleanup.workstreams.priority", { defaultValue: "Extraction priority {{priority}}", priority: item.priority })}</p>
                    <h3 className="mt-2 text-xl font-extrabold">{t(`adminGithubCleanup.workstreams.${item.id}.title`)}</h3>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black">{t(`adminGithubCleanup.metrics.readiness.labels.${item.readiness}.title`)}</span>
                </div>
                <p className="mt-4 text-sm leading-6 opacity-80">{t(`adminGithubCleanup.workstreams.${item.id}.body`)}</p>
                <p className="mt-4 text-sm font-extrabold">{t(`adminGithubCleanup.workstreams.${item.id}.action`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="safety-title" className="rounded-2xl rr-bg-navy p-6 text-white sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 rr-text-gold" size={25} aria-hidden="true" />
            <div>
              <h2 id="safety-title" className="font-display text-2xl font-extrabold text-white">{t("adminGithubCleanup.safety.title", { defaultValue: "Deletion safety sequence" })}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">{t("adminGithubCleanup.safety.body", { defaultValue: "Classification never deletes a branch. The live repository is revalidated immediately before mutation, and any changed fact stops the operation." })}</p>
            </div>
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {data.safetyGates.map((gate, index) => (
              <li key={gate} className="border-t border-[#D4A017]/60 pt-3">
                <span className="text-xs font-black rr-text-gold">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-sm font-bold text-white">{t(`adminGithubCleanup.safety.gates.${gate}`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="script-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <PlayCircle className="rr-text-gold" size={24} aria-hidden="true" />
                <h2 id="script-title" className="font-display text-2xl font-extrabold rr-text-navy sm:text-3xl">{t("adminGithubCleanup.script.title", { defaultValue: "Presentation script" })}</h2>
              </div>
              <p className="mt-2 text-sm rr-text-navy-muted">{t("adminGithubCleanup.script.subtitle", { defaultValue: "Eight-scene English master · approximately {{runtime}}", runtime: data.script.estimatedRuntime })}</p>
            </div>
            <button type="button" onClick={copyScript} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-5 text-sm font-bold text-white transition active:scale-[0.97]">
              <ClipboardCopy size={16} aria-hidden="true" />
              {t("adminGithubCleanup.script.copy", { defaultValue: "Copy full script" })}
            </button>
          </div>
          <div className="mt-5 divide-y divide-[#0b2a52]/10 border-y border-[#0b2a52]/10">
            {data.script.scenes.map((scene, index) => (
              <details key={scene.id} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]">
                  <span>
                    <span className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">{t("adminGithubCleanup.script.scene", { defaultValue: "Scene {{number}} · {{time}}", number: index + 1, time: scene.time })}</span>
                    <span className="mt-1 block text-base font-extrabold rr-text-navy">{scene.title}</span>
                  </span>
                  <span className="text-2xl font-light rr-text-navy-muted group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-4 max-w-4xl border-l-2 border-[#D4A017] pl-4 text-sm leading-7 rr-text-navy-muted">{scene.narration}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="border-t border-[#0b2a52]/10 pt-6 text-sm leading-6 rr-text-navy-muted">
          <p>{t("adminGithubCleanup.footer", { defaultValue: "Snapshot verified {{date}}. Repository evidence and presentation content are available only through this administrator-authorized route.", date: data.snapshot.verifiedAt })}</p>
        </footer>
      </main>
    </div>
  );
}
