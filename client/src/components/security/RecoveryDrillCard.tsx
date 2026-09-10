import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const evidenceTypes = [
  "preflight",
  "revoked_session_denial",
  "revoked_credential_denial",
  "tenant_isolation",
  "replacement_enrollment",
  "step_up_verification",
  "audit_verification",
  "rollback",
  "stop_condition",
  "containment",
  "after_action",
] as const;
const evidenceOutcomes = ["passed", "failed", "contained"] as const;

function localDateTime(minutesFromNow = 15) {
  const date = new Date(Date.now() + minutesFromNow * 60_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function RecoveryDrillCard() {
  const { t, i18n } = useTranslation();
  const utils = trpc.useUtils();
  const snapshot = trpc.recoveryDrills.snapshot.useQuery(undefined, {
    retry: false,
  });
  const [title, setTitle] = useState(
    t("recoveryDrill.defaults.title", {
      defaultValue: "Owner account recovery drill",
    })
  );
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime());
  const [approverEmail, setApproverEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [evidenceType, setEvidenceType] =
    useState<(typeof evidenceTypes)[number]>("preflight");
  const [evidenceOutcome, setEvidenceOutcome] =
    useState<(typeof evidenceOutcomes)[number]>("passed");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [containmentReason, setContainmentReason] = useState("");
  const [abortReason, setAbortReason] = useState("");
  const refresh = () => utils.recoveryDrills.snapshot.invalidate();
  const success = (message: string) => {
    toast.success(message);
    void refresh();
  };
  const failure = (error: { message: string }) => toast.error(error.message);
  const prepare = trpc.recoveryDrills.prepare.useMutation({
    onSuccess: () =>
      success(
        t("recoveryDrill.toast.prepared", {
          defaultValue: "Staging recovery drill prepared.",
        })
      ),
    onError: failure,
  });
  const decide = trpc.recoveryDrills.decide.useMutation({
    onSuccess: data =>
      success(
        data.decision === "approved"
          ? t("recoveryDrill.toast.approved", {
              defaultValue: "Recovery drill approved.",
            })
          : t("recoveryDrill.toast.rejected", {
              defaultValue: "Recovery drill rejected and closed.",
            })
      ),
    onError: failure,
  });
  const start = trpc.recoveryDrills.start.useMutation({
    onSuccess: () =>
      success(
        t("recoveryDrill.toast.started", {
          defaultValue: "Recovery drill started.",
        })
      ),
    onError: failure,
  });
  const recordEvidence = trpc.recoveryDrills.recordEvidence.useMutation({
    onSuccess: () => {
      setEvidenceReference("");
      success(
        t("recoveryDrill.toast.evidence", {
          defaultValue: "Redacted evidence recorded.",
        })
      );
    },
    onError: failure,
  });
  const contain = trpc.recoveryDrills.contain.useMutation({
    onSuccess: () => {
      setContainmentReason("");
      success(
        t("recoveryDrill.toast.contained", {
          defaultValue: "Recovery drill contained.",
        })
      );
    },
    onError: failure,
  });
  const complete = trpc.recoveryDrills.complete.useMutation({
    onSuccess: () =>
      success(
        t("recoveryDrill.toast.completed", {
          defaultValue:
            "Recovery drill completed and temporary access revoked.",
        })
      ),
    onError: failure,
  });
  const abort = trpc.recoveryDrills.abort.useMutation({
    onSuccess: () => {
      setAbortReason("");
      success(
        t("recoveryDrill.toast.aborted", {
          defaultValue: "Recovery drill aborted and temporary access revoked.",
        })
      );
    },
    onError: failure,
  });
  const pending =
    prepare.isPending ||
    decide.isPending ||
    start.isPending ||
    recordEvidence.isPending ||
    contain.isPending ||
    complete.isPending ||
    abort.isPending;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [i18n.resolvedLanguage]
  );

  if (snapshot.isLoading)
    return (
      <section className="rounded-2xl bg-card p-5 text-card-foreground shadow-sm">
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {t("recoveryDrill.loading", {
            defaultValue: "Checking staging recovery access…",
          })}
        </div>
      </section>
    );
  if (snapshot.isError || !snapshot.data?.authorized) return null;

  const data = snapshot.data;
  const drill = data.drill;
  const statusLabel = drill
    ? t(`recoveryDrill.status.${drill.status}`, {
        defaultValue: drill.status.replaceAll("_", " "),
      })
    : t("recoveryDrill.status.notPrepared", { defaultValue: "Not prepared" });
  const roleLabel = t(`recoveryDrill.roles.${data.actorRole}`, {
    defaultValue: data.actorRole.replaceAll("_", " "),
  });

  return (
    <section
      className="rounded-2xl bg-card p-5 text-card-foreground shadow-sm"
      aria-labelledby="recovery-drill-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
          <ShieldAlert size={19} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="recovery-drill-title"
              className="text-base font-black text-foreground"
            >
              {t("recoveryDrill.title", {
                defaultValue: "Staging recovery drill",
              })}
            </h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-black uppercase tracking-wide text-amber-800">
              {t("recoveryDrill.stagingOnly", { defaultValue: "Staging only" })}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t("recoveryDrill.description", {
              defaultValue:
                "Practice owner-account recovery with separated duties, recent passkey verification, redacted evidence, and automatic revocation.",
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/70 p-3">
          <p className="text-xs font-bold text-muted-foreground">
            {t("recoveryDrill.environment", { defaultValue: "Environment" })}
          </p>
          <p className="mt-1 text-sm font-black text-foreground">
            {data.runtime.enabled
              ? t("recoveryDrill.available", {
                  defaultValue: "Allowed staging host",
                })
              : t("recoveryDrill.unavailable", {
                  defaultValue: "Unavailable on this host",
                })}
          </p>
        </div>
        <div className="rounded-xl bg-muted/70 p-3">
          <p className="text-xs font-bold text-muted-foreground">
            {t("recoveryDrill.yourRole", { defaultValue: "Your role" })}
          </p>
          <p className="mt-1 text-sm font-black capitalize text-foreground">
            {roleLabel}
          </p>
        </div>
        <div className="rounded-xl bg-muted/70 p-3">
          <p className="text-xs font-bold text-muted-foreground">
            {t("recoveryDrill.statusLabel", { defaultValue: "Status" })}
          </p>
          <p className="mt-1 text-sm font-black capitalize text-foreground">
            {statusLabel}
          </p>
        </div>
      </div>

      {!data.runtime.enabled && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-900">
          <LockKeyhole
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p>
            {t("recoveryDrill.hostGate", {
              defaultValue:
                "This control remains locked unless staging mode and an exact non-production host allowlist are configured.",
            })}
          </p>
        </div>
      )}
      {!data.recentPasskeyA2 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p>
            {t("recoveryDrill.passkeyRequired", {
              defaultValue:
                "Sensitive drill actions require a passkey-verified session from the last 15 minutes. Sign in with a passkey, then return here.",
            })}
          </p>
        </div>
      )}

      {data.actions.canPrepare && (
        <form
          className="mt-5 space-y-4 rounded-2xl bg-muted/70 p-4"
          onSubmit={event => {
            event.preventDefault();
            const when = new Date(scheduledAt).getTime();
            if (!Number.isFinite(when)) return;
            prepare.mutate({
              title: title.trim(),
              scheduledAt: when,
              approverEmail: approverEmail.trim(),
              notes: notes.trim() || undefined,
            });
          }}
        >
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <UserCheck size={17} aria-hidden="true" />
              {t("recoveryDrill.prepareTitle", {
                defaultValue: "Prepare separated-duty drill",
              })}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("recoveryDrill.prepareHelp", {
                defaultValue:
                  "Steve is the Recovery Custodian. Assign a different lead engineer who already has an active Get Phame account and passkey.",
              })}
            </p>
          </div>
          <div>
            <label
              htmlFor="recovery-title"
              className="text-xs font-bold text-foreground"
            >
              {t("recoveryDrill.drillTitle", { defaultValue: "Drill title" })}
            </label>
            <input
              id="recovery-title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={160}
              required
              className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="recovery-approver"
                className="text-xs font-bold text-foreground"
              >
                {t("recoveryDrill.approverEmail", {
                  defaultValue: "Lead engineer email",
                })}
              </label>
              <input
                id="recovery-approver"
                type="email"
                value={approverEmail}
                onChange={event => setApproverEmail(event.target.value)}
                autoComplete="off"
                required
                placeholder="lead@example.com"
                className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label
                htmlFor="recovery-schedule"
                className="text-xs font-bold text-foreground"
              >
                {t("recoveryDrill.scheduledAt", {
                  defaultValue: "Scheduled time",
                })}
              </label>
              <input
                id="recovery-schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={event => setScheduledAt(event.target.value)}
                required
                className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="recovery-notes"
              className="text-xs font-bold text-foreground"
            >
              {t("recoveryDrill.notes", {
                defaultValue: "Redacted operator notes (optional)",
              })}
            </label>
            <textarea
              id="recovery-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !approverEmail.trim() || !title.trim()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground active:scale-[0.97] disabled:opacity-50"
          >
            <ClipboardCheck size={17} aria-hidden="true" />
            {prepare.isPending
              ? t("recoveryDrill.preparing", { defaultValue: "Preparing…" })
              : t("recoveryDrill.prepare", {
                  defaultValue: "Prepare staging drill",
                })}
          </button>
        </form>
      )}

      {drill && (
        <div className="mt-5 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-foreground">
                {drill.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("recoveryDrill.scheduledFor", {
                  defaultValue: "Scheduled for {{date}}",
                  date: dateFormatter.format(new Date(drill.scheduledAt)),
                })}
              </p>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-black capitalize text-foreground">
              {statusLabel}
            </span>
          </div>
          {drill.notes && (
            <p className="mt-3 rounded-xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
              {drill.notes}
            </p>
          )}
          {data.approval && (
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-foreground">
              {data.approval.decision === "approved" ? (
                <CheckCircle2
                  size={17}
                  className="shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  size={17}
                  className="shrink-0 text-destructive"
                  aria-hidden="true"
                />
              )}
              {t(`recoveryDrill.decision.${data.approval.decision}`, {
                defaultValue: data.approval.decision,
              })}
              : {data.approval.note}
            </p>
          )}
        </div>
      )}

      {data.actions.canApprove && drill && (
        <div className="mt-4 space-y-3 rounded-2xl bg-muted/70 p-4">
          <h3 className="text-sm font-black text-foreground">
            {t("recoveryDrill.approvalTitle", {
              defaultValue: "Independent approval",
            })}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("recoveryDrill.approvalHelp", {
              defaultValue:
                "Review the staging scope and confirm that you are not the Recovery Custodian. Approval expires with your narrow temporary access.",
            })}
          </p>
          <label htmlFor="recovery-decision-note" className="sr-only">
            {t("recoveryDrill.decisionNote", { defaultValue: "Decision note" })}
          </label>
          <textarea
            id="recovery-decision-note"
            value={decisionNote}
            onChange={event => setDecisionNote(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t("recoveryDrill.decisionPlaceholder", {
              defaultValue: "Record a redacted approval rationale",
            })}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending || decisionNote.trim().length < 3}
              onClick={() =>
                decide.mutate({
                  drillId: drill.id,
                  decision: "approved",
                  note: decisionNote.trim(),
                })
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white disabled:opacity-50"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              {t("recoveryDrill.approve", { defaultValue: "Approve" })}
            </button>
            <button
              type="button"
              disabled={pending || decisionNote.trim().length < 3}
              onClick={() =>
                decide.mutate({
                  drillId: drill.id,
                  decision: "rejected",
                  note: decisionNote.trim(),
                })
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-destructive px-3 text-sm font-black text-white disabled:opacity-50"
            >
              <XCircle size={17} aria-hidden="true" />
              {t("recoveryDrill.reject", { defaultValue: "Reject" })}
            </button>
          </div>
        </div>
      )}

      {data.actions.canStart && drill && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start.mutate({ drillId: drill.id })}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          <Play size={17} aria-hidden="true" />
          {t("recoveryDrill.start", { defaultValue: "Start approved drill" })}
        </button>
      )}

      {data.actions.canRecordEvidence && drill && (
        <div className="mt-4 space-y-3 rounded-2xl bg-muted/70 p-4">
          <h3 className="text-sm font-black text-foreground">
            {t("recoveryDrill.evidenceTitle", {
              defaultValue: "Record redacted evidence",
            })}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("recoveryDrill.evidenceHelp", {
              defaultValue:
                "Use event IDs, ticket IDs, timestamps, or sanitized object references only. Never enter tokens, cookies, credentials, or customer data.",
            })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="recovery-evidence-type"
                className="text-xs font-bold text-foreground"
              >
                {t("recoveryDrill.evidenceType", {
                  defaultValue: "Evidence type",
                })}
              </label>
              <select
                id="recovery-evidence-type"
                value={evidenceType}
                onChange={event =>
                  setEvidenceType(event.target.value as typeof evidenceType)
                }
                className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
              >
                {evidenceTypes.map(type => (
                  <option key={type} value={type}>
                    {t(`recoveryDrill.evidence.${type}`, {
                      defaultValue: type.replaceAll("_", " "),
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="recovery-evidence-outcome"
                className="text-xs font-bold text-foreground"
              >
                {t("recoveryDrill.outcome", { defaultValue: "Outcome" })}
              </label>
              <select
                id="recovery-evidence-outcome"
                value={evidenceOutcome}
                onChange={event =>
                  setEvidenceOutcome(
                    event.target.value as typeof evidenceOutcome
                  )
                }
                className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
              >
                {evidenceOutcomes.map(outcome => (
                  <option key={outcome} value={outcome}>
                    {t(`recoveryDrill.outcomes.${outcome}`, {
                      defaultValue: outcome,
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor="recovery-evidence-reference"
              className="text-xs font-bold text-foreground"
            >
              {t("recoveryDrill.evidenceReference", {
                defaultValue: "Sanitized evidence reference",
              })}
            </label>
            <input
              id="recovery-evidence-reference"
              value={evidenceReference}
              onChange={event => setEvidenceReference(event.target.value)}
              maxLength={255}
              placeholder={t("recoveryDrill.evidencePlaceholder", {
                defaultValue: "Example: audit-event:evt_123 at 14:05 UTC",
              })}
              className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="button"
            disabled={pending || evidenceReference.trim().length < 3}
            onClick={() =>
              recordEvidence.mutate({
                drillId: drill.id,
                evidenceType,
                evidenceReference: evidenceReference.trim(),
                outcome: evidenceOutcome,
              })
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            <ClipboardCheck size={17} aria-hidden="true" />
            {t("recoveryDrill.recordEvidence", {
              defaultValue: "Record evidence",
            })}
          </button>
        </div>
      )}

      {data.evidence.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-black text-foreground">
            {t("recoveryDrill.evidenceLog", { defaultValue: "Evidence log" })}
          </h3>
          <ul className="mt-2 divide-y divide-border">
            {data.evidence.map(item => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black capitalize text-foreground">
                      {t(`recoveryDrill.evidence.${item.evidenceType}`, {
                        defaultValue: item.evidenceType.replaceAll("_", " "),
                      })}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {item.evidenceReference}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-bold capitalize text-foreground">
                    {t(`recoveryDrill.outcomes.${item.outcome}`, {
                      defaultValue: item.outcome,
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.actions.canContain && drill && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="recovery-containment-reason" className="sr-only">
            {t("recoveryDrill.containmentReason", {
              defaultValue: "Containment reason",
            })}
          </label>
          <input
            id="recovery-containment-reason"
            value={containmentReason}
            onChange={event => setContainmentReason(event.target.value)}
            maxLength={255}
            placeholder={t("recoveryDrill.containmentPlaceholder", {
              defaultValue: "Stop condition or containment reason",
            })}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="button"
            disabled={pending || containmentReason.trim().length < 3}
            onClick={() =>
              contain.mutate({
                drillId: drill.id,
                reason: containmentReason.trim(),
              })
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <Pause size={17} aria-hidden="true" />
            {t("recoveryDrill.contain", { defaultValue: "Contain drill" })}
          </button>
        </div>
      )}

      {data.actions.canComplete && drill && (
        <button
          type="button"
          disabled={pending}
          onClick={() => complete.mutate({ drillId: drill.id })}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white disabled:opacity-50"
        >
          <CheckCircle2 size={17} aria-hidden="true" />
          {t("recoveryDrill.complete", {
            defaultValue: "Complete and revoke access",
          })}
        </button>
      )}

      {data.actions.canAbort && drill && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="recovery-abort-reason" className="sr-only">
            {t("recoveryDrill.abortReason", { defaultValue: "Abort reason" })}
          </label>
          <input
            id="recovery-abort-reason"
            value={abortReason}
            onChange={event => setAbortReason(event.target.value)}
            maxLength={255}
            placeholder={t("recoveryDrill.abortPlaceholder", {
              defaultValue: "Sanitized abort reason",
            })}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-destructive/30 bg-background px-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-destructive/30"
          />
          <button
            type="button"
            disabled={pending || abortReason.trim().length < 3}
            onClick={() =>
              abort.mutate({ drillId: drill.id, reason: abortReason.trim() })
            }
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <XCircle size={17} aria-hidden="true" />
            {t("recoveryDrill.abort", { defaultValue: "Abort drill" })}
          </button>
        </div>
      )}
    </section>
  );
}
