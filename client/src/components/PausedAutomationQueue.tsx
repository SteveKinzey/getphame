import { AlertTriangle, Clock3 } from "lucide-react";

type Translate = (
  key: string,
  options?: { defaultValue?: string; count?: number }
) => string;

export type PausedAutomationQueueData = {
  paused: boolean;
  total: number;
  items: Array<{
    id: string;
    type: "review_request" | "follow_up";
    label: string;
    scheduledAt: number;
  }>;
};

export function PausedAutomationBanner({
  queue,
  translate,
}: {
  queue: PausedAutomationQueueData | undefined;
  translate: Translate;
}) {
  if (!queue?.paused || queue.total < 1) return null;
  return (
    <section
      data-testid="paused-automation-banner"
      className="mt-4 rounded-xl border-2 px-4 py-3"
      style={{
        borderColor: "oklch(0.78 0.16 27)",
        background: "oklch(0.98 0.03 27)",
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className="mt-0.5 shrink-0"
          style={{ color: "oklch(0.48 0.16 27)" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black rr-text-navy">
            {translate("automationPaused.bannerTitle", {
              defaultValue: "Automated review requests are paused",
            })}
          </h2>
          <p className="mt-1 text-xs leading-relaxed rr-text-navy-mid">
            {translate("automationPaused.bannerDescription", {
              defaultValue:
                "{{count}} pending automated request(s) are waiting for you to reconnect a verified mail server.",
              count: queue.total,
            })}
          </p>
          <a
            href="/settings?focus=paused-automation#paused-automation-queue"
            className="mt-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-bold text-white rr-bg-navy"
          >
            {translate("automationPaused.viewQueue", {
              defaultValue: "View paused requests",
            })}
          </a>
        </div>
      </div>
    </section>
  );
}

export default function PausedAutomationQueue({
  queue,
  translate,
}: {
  queue: PausedAutomationQueueData | undefined;
  translate: Translate;
}) {
  if (!queue?.paused || queue.total < 1) return null;
  return (
    <section
      id="paused-automation-queue"
      data-testid="paused-automation-queue"
      className="mt-4 rounded-xl border p-4"
      style={{
        borderColor: "oklch(0.88 0.08 27)",
        background: "oklch(0.99 0.01 27)",
      }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={18}
          className="mt-0.5"
          style={{ color: "oklch(0.48 0.16 27)" }}
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-black rr-text-navy">
            {translate("automationPaused.queueTitle", {
              defaultValue: "Paused automated requests",
            })}
          </h3>
          <p className="text-xs rr-text-navy-muted">
            {translate("automationPaused.queueDescription", {
              defaultValue:
                "These requests will stay pending until you connect and select a verified mail server.",
            })}
          </p>
        </div>
      </div>
      <ul
        className="mt-3 space-y-2"
        aria-label={translate("automationPaused.queueTitle", {
          defaultValue: "Paused automated requests",
        })}
      >
        {queue.items.map(item => (
          <li
            key={item.id}
            className="flex items-start gap-2 border-t pt-2 text-xs"
            style={{ borderColor: "oklch(0.92 0.02 27)" }}
          >
            <Clock3
              size={14}
              className="mt-0.5 shrink-0 rr-text-navy-muted"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold rr-text-navy">{item.label}</p>
              <p className="rr-text-navy-muted">
                {item.type === "follow_up"
                  ? translate("automationPaused.followUp", {
                      defaultValue: "Follow-up",
                    })
                  : translate("automationPaused.reviewRequest", {
                      defaultValue: "Review request",
                    })}{" "}
                · {new Date(item.scheduledAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {queue.total > queue.items.length ? (
        <p className="mt-3 text-xs rr-text-navy-muted">
          {translate("automationPaused.morePending", {
            defaultValue: "{{count}} more request(s) are pending.",
            count: queue.total - queue.items.length,
          })}
        </p>
      ) : null}
    </section>
  );
}
