import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { deliverReviewRequest } from "./reviewRequestDelivery";
import {
  claimDueSourceAutomationEvent,
  claimSourceAutomationSchedulerRun,
  completeSourceAutomationEvent,
  getSourceAutomationSchedulerByTaskUid,
  getSourceAutomationDeliveryContext,
  recordSourceAutomationSchedulerRun,
  retryOrFailSourceAutomationEvent,
} from "./sourceAutomation";

const MAX_EVENTS_PER_RUN = 25;
const RETRY_DEDUP_WINDOW_MS = 4 * 60_000;

export type SourceAutomationProcessorDeps = {
  claimDue: typeof claimDueSourceAutomationEvent;
  getContext: typeof getSourceAutomationDeliveryContext;
  complete: typeof completeSourceAutomationEvent;
  retryOrFail: typeof retryOrFailSourceAutomationEvent;
  deliver: typeof deliverReviewRequest;
};

const defaultDeps: SourceAutomationProcessorDeps = {
  claimDue: claimDueSourceAutomationEvent,
  getContext: getSourceAutomationDeliveryContext,
  complete: completeSourceAutomationEvent,
  retryOrFail: retryOrFailSourceAutomationEvent,
  deliver: deliverReviewRequest,
};

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("approved") && message.includes("template")) return "TEMPLATE_NOT_READY";
  if (message.includes("SMTP not configured")) return "SMTP_NOT_READY";
  if (message.includes("review destination")) return "PLATFORM_NOT_READY";
  return "DELIVERY_FAILED";
}

export async function processDueSourceAutomationEvents(
  now = Date.now(),
  deps: SourceAutomationProcessorDeps = defaultDeps,
) {
  const summary = { checked: 0, sent: 0, queued: 0, suppressed: 0, dryRun: 0, retried: 0, failed: 0 };
  for (let index = 0; index < MAX_EVENTS_PER_RUN; index += 1) {
    const event = await deps.claimDue(now);
    if (!event) break;
    summary.checked += 1;
    try {
      const context = await deps.getContext(event.id);
      if (!context) {
        await deps.complete({
          userId: event.userId,
          eventId: event.id,
          sourceConnectionId: event.sourceConnectionId,
          status: "failed",
          errorCode: "DELIVERY_CONTEXT_MISSING",
        });
        summary.failed += 1;
        continue;
      }
      const { contact, source } = context;
      if (!source.automationEnabled || source.automationMode !== "review_request" || source.pausedAt) {
        await deps.complete({
          userId: event.userId,
          eventId: event.id,
          sourceConnectionId: event.sourceConnectionId,
          status: "failed",
          contactId: contact.id,
          errorCode: source.pausedAt ? "AUTOMATION_PAUSED" : "AUTOMATION_DISABLED",
        });
        summary.failed += 1;
        continue;
      }
      if (contact.optedOut) {
        await deps.complete({
          userId: event.userId,
          eventId: event.id,
          sourceConnectionId: event.sourceConnectionId,
          status: "suppressed",
          contactId: contact.id,
          errorCode: "CONTACT_SUPPRESSED",
        });
        summary.suppressed += 1;
        continue;
      }
      if (source.dryRun) {
        await deps.complete({
          userId: event.userId,
          eventId: event.id,
          sourceConnectionId: event.sourceConnectionId,
          status: "dry_run",
          contactId: contact.id,
        });
        summary.dryRun += 1;
        continue;
      }

      const delivery = await deps.deliver({
        userId: event.userId,
        customerName: contact.name,
        customerEmail: contact.email,
        preferredLocale: event.preferredLocale as "en" | "es" | "fr" | "it" | "th" | "zh-CN" | "zh-TW",
        templateId: event.templateId,
        platformId: event.platformId,
        sourceConnectionId: event.sourceConnectionId,
        sourceEventId: event.sourceEventId,
        contactId: contact.id,
      });
      await deps.complete({
        userId: event.userId,
        eventId: event.id,
        sourceConnectionId: event.sourceConnectionId,
        status: delivery.delivery,
        contactId: contact.id,
        customerRequestId: delivery.requestId,
      });
      summary[delivery.delivery] += 1;
    } catch (error) {
      const result = await deps.retryOrFail({
        userId: event.userId,
        eventId: event.id,
        attemptCount: event.attemptCount,
        errorCode: errorCode(error),
        now,
      });
      summary[result.failed ? "failed" : "retried"] += 1;
    }
  }
  return summary;
}

export async function sourceAutomationHeartbeatHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const scheduler = await getSourceAutomationSchedulerByTaskUid(taskUid);
    if (!scheduler) return res.json({ ok: true, skipped: "orphan" });
    const claimed = await claimSourceAutomationSchedulerRun(taskUid, RETRY_DEDUP_WINDOW_MS);
    if (!claimed) return res.json({ ok: true, skipped: "recent-run-exists", checkedAt: scheduler.lastRunAt });
    const summary = await processDueSourceAutomationEvents();
    await recordSourceAutomationSchedulerRun({ taskUid, status: "ok" });
    return res.json({ ok: true, summary });
  } catch (error) {
    if (taskUid) {
      await recordSourceAutomationSchedulerRun({
        taskUid,
        status: "failed",
        errorCode: "SOURCE_AUTOMATION_PROCESSING_FAILED",
      }).catch(() => undefined);
    }
    console.error("[SourceAutomation] Scheduled processor failed:", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({
      error: "SOURCE_AUTOMATION_PROCESSING_FAILED",
      timestamp: new Date().toISOString(),
    });
  }
}
