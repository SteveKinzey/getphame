import { RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { APP_WORKER_CACHE_NAME } from "@/lib/appVersion";
import { useAppVersionUpdate } from "@/components/AppVersionUpdateController";

function shortVersion(version: string | null): string {
  return version ? version.slice(0, 8) : "—";
}

function workerPath(script: string | null): string {
  if (!script) return "—";
  try {
    return new URL(script).pathname;
  } catch {
    return "—";
  }
}

export default function ApplicationVersionDiagnosticsCard() {
  const { t } = useTranslation();
  const { availableVersion, checkForUpdate, diagnostics, requestUpdate, state } =
    useAppVersionUpdate();
  const canRequestReload = Boolean(availableVersion) && state !== "reloading";
  const lastChecked = diagnostics.lastSuccessfulCheckAt
    ? new Date(diagnostics.lastSuccessfulCheckAt).toLocaleString()
    : t("versionUpdate.notChecked", { defaultValue: "Not checked yet" });

  return (
    <section
      data-testid="application-version-diagnostics"
      className="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="application-version-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rr-bg-gold">
          <ShieldCheck size={18} className="rr-text-navy" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="application-version-heading" className="text-base font-black rr-text-navy">
            {t("versionUpdate.adminTitle", { defaultValue: "Application Version" })}
          </h2>
          <p className="mt-1 text-xs leading-5 rr-text-navy-muted">
            {t("versionUpdate.adminDescription", {
              defaultValue:
                "Current-tab diagnostics only. These controls never reload other customers’ tabs.",
            })}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        {[
          [
            t("versionUpdate.deployedVersion", { defaultValue: "Deployed version" }),
            shortVersion(diagnostics.detectedVersion),
          ],
          [
            t("versionUpdate.workerScript", { defaultValue: "Worker script" }),
            workerPath(diagnostics.activeWorkerScript),
          ],
          [
            t("versionUpdate.workerCache", { defaultValue: "Worker cache" }),
            APP_WORKER_CACHE_NAME,
          ],
          [
            t("versionUpdate.waitingWorker", { defaultValue: "Waiting worker" }),
            diagnostics.waitingWorker
              ? t("versionUpdate.yes", { defaultValue: "Yes" })
              : t("versionUpdate.no", { defaultValue: "No" }),
          ],
          [
            t("versionUpdate.lastChecked", { defaultValue: "Last successful check" }),
            lastChecked,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 rr-bg-white-card"
          >
            <dt className="text-xs font-bold rr-text-navy-mid">{label}</dt>
            <dd className="max-w-[60%] break-all text-right text-xs font-semibold rr-text-navy">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void checkForUpdate("manual")}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-[transform,opacity] duration-150 active:scale-[0.97] rr-bg-white-card rr-text-navy"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {t("versionUpdate.check", { defaultValue: "Check for update" })}
        </button>
        <button
          type="button"
          onClick={requestUpdate}
          disabled={!canRequestReload}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 rr-bg-navy rr-text-gold"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {t("versionUpdate.reloadTab", { defaultValue: "Reload this tab" })}
        </button>
      </div>
    </section>
  );
}
