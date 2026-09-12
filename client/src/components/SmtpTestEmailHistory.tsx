import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export type SmtpDiagnosticAttempt = {
  id: number;
  recipientMasked: string;
  outcome: string;
  errorSummary: string | null;
  attemptedAt: number;
};

type Translate = (key: string, options?: { defaultValue?: string }) => string;

export default function SmtpTestEmailHistory({
  attempts,
  isLoading,
  translate,
  onRetryFailedAttempt,
}: {
  attempts: SmtpDiagnosticAttempt[] | undefined;
  isLoading: boolean;
  translate: Translate;
  onRetryFailedAttempt?: () => void;
}) {
  return (
    <section
      data-testid="smtp-test-email-history"
      className="rounded-xl border p-3"
      style={{
        borderColor: "oklch(0.90 0.02 260)",
        background: "oklch(0.99 0.005 260)",
      }}
    >
      <div className="flex items-start gap-2">
        <Clock3
          size={16}
          className="mt-0.5 rr-text-navy-muted"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-black rr-text-navy">
            {translate("smtp.testEmailHistoryTitle", {
              defaultValue: "Test email history",
            })}
          </h3>
          <p className="text-xs rr-text-navy-muted">
            {translate("smtp.testEmailHistoryPrivacy", {
              defaultValue:
                "Recipients are masked. Only your 12 newest diagnostic attempts are shown.",
            })}
          </p>
        </div>
      </div>
      {isLoading ? (
        <p className="mt-3 text-xs rr-text-navy-muted">
          {translate("common.loading", { defaultValue: "Loading…" })}
        </p>
      ) : !attempts?.length ? (
        <p className="mt-3 text-xs rr-text-navy-muted">
          {translate("smtp.testEmailHistoryEmpty", {
            defaultValue: "No diagnostic test emails have been sent yet.",
          })}
        </p>
      ) : (
        <ul
          className="mt-3 space-y-2"
          aria-label={translate("smtp.testEmailHistoryTitle", {
            defaultValue: "Test email history",
          })}
        >
          {attempts.map(attempt => {
            const sent = attempt.outcome === "ok";
            return (
              <li
                key={attempt.id}
                className="flex gap-2 border-t pt-2 first:border-t-0 first:pt-0"
                style={{ borderColor: "oklch(0.92 0.01 260)" }}
              >
                {sent ? (
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 rr-text-green"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    size={15}
                    className="mt-0.5 text-destructive"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold rr-text-navy">
                    {attempt.recipientMasked} ·{" "}
                    {sent
                      ? translate("smtp.testEmailHistorySent", {
                          defaultValue: "Sent",
                        })
                      : translate("smtp.testEmailHistoryFailed", {
                          defaultValue: "Failed",
                        })}
                  </p>
                  <p className="rr-text-navy-muted">
                    {new Date(attempt.attemptedAt).toLocaleString()}
                  </p>
                  {!sent && attempt.errorSummary ? (
                    <p className="mt-0.5 text-destructive">
                      {attempt.errorSummary}
                    </p>
                  ) : null}
                  {!sent && onRetryFailedAttempt ? (
                    <button
                      type="button"
                      onClick={onRetryFailedAttempt}
                      className="mt-2 min-h-8 rounded-md px-2 text-xs font-bold rr-bg-navy text-white"
                    >
                      {translate("smtp.retryTestEmail", {
                        defaultValue: "Retry",
                      })}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
