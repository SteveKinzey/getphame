import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { assertSystemMailConfigured, sendSystemEmailOnce } from "./sendgrid";
import {
  claimDueLifecycleEmail,
  claimStripeLifecycleSchedulerRun,
  finishLifecycleEmail,
  getLifecycleEmailContext,
  getStripeLifecycleSchedulerByTaskUid,
  recordStripeLifecycleSchedulerRun,
} from "./stripeLifecycle";
import {
  renderSubscriptionLifecycleEmail,
  type SubscriptionLifecycleEmailKind,
} from "./subscriptionLifecycleEmail";

export const STRIPE_LIFECYCLE_BATCH_LIMIT = 25;
const RUN_DEDUP_WINDOW_MS = 4 * 60_000;

export type StripeLifecycleProcessorDeps = {
  assertConfigured: typeof assertSystemMailConfigured;
  claimDue: typeof claimDueLifecycleEmail;
  getContext: typeof getLifecycleEmailContext;
  finish: typeof finishLifecycleEmail;
  send: typeof sendSystemEmailOnce;
};

const defaultDeps: StripeLifecycleProcessorDeps = {
  assertConfigured: assertSystemMailConfigured,
  claimDue: claimDueLifecycleEmail,
  getContext: getLifecycleEmailContext,
  finish: finishLifecycleEmail,
  send: sendSystemEmailOnce,
};

function deliveryErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "SYSTEM_MAIL_NOT_CONFIGURED") return message;
  return "LIFECYCLE_DELIVERY_FAILED";
}

export async function processStripeLifecycleEmails(
  now = Date.now(),
  deps: StripeLifecycleProcessorDeps = defaultDeps
) {
  deps.assertConfigured();
  const summary = { checked: 0, sent: 0, failed: 0 };
  for (let index = 0; index < STRIPE_LIFECYCLE_BATCH_LIMIT; index += 1) {
    const outbox = await deps.claimDue(now);
    if (!outbox) break;
    summary.checked += 1;
    try {
      const context = await deps.getContext(outbox.id);
      if (!context?.email) {
        await deps.finish({
          outboxId: outbox.id,
          state: "failed",
          errorCode: "RECIPIENT_UNAVAILABLE",
          now,
        });
        summary.failed += 1;
        continue;
      }
      const rendered = renderSubscriptionLifecycleEmail({
        kind: outbox.kind as SubscriptionLifecycleEmailKind,
        locale: outbox.locale,
        accountName: context.accountName ?? context.businessName,
      });
      const delivery = await deps.send({
        to: context.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await deps.finish({
        outboxId: outbox.id,
        state: "sent",
        provider: delivery.provider,
        providerMessageId: delivery.messageId,
        now,
      });
      summary.sent += 1;
    } catch (error) {
      await deps.finish({
        outboxId: outbox.id,
        state: "failed",
        errorCode: deliveryErrorCode(error),
        now,
      });
      summary.failed += 1;
    }
  }
  return summary;
}

export async function stripeLifecycleHeartbeatHandler(
  req: Request,
  res: Response
) {
  let auth: { isCron?: boolean; taskUid?: string };
  try {
    auth = await sdk.authenticateRequest(req);
  } catch {
    return res.status(403).json({ error: "cron-only" });
  }
  if (!auth.isCron || !auth.taskUid) {
    return res.status(403).json({ error: "cron-only" });
  }
  const taskUid = auth.taskUid;
  try {
    const scheduler = await getStripeLifecycleSchedulerByTaskUid(taskUid);
    if (!scheduler) return res.json({ ok: true, skipped: "orphan" });
    const claimed = await claimStripeLifecycleSchedulerRun(
      taskUid,
      RUN_DEDUP_WINDOW_MS
    );
    if (!claimed) {
      return res.json({
        ok: true,
        skipped: "recent-run-exists",
        checkedAt: scheduler.lastRunAt,
      });
    }
    const summary = await processStripeLifecycleEmails();
    await recordStripeLifecycleSchedulerRun({ taskUid, status: "ok" });
    return res.json({ ok: true, summary });
  } catch (error) {
    await recordStripeLifecycleSchedulerRun({
      taskUid,
      status: "failed",
      errorCode: "STRIPE_LIFECYCLE_PROCESSING_FAILED",
    }).catch(() => undefined);
    console.error("[StripeLifecycle] Scheduled processor failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).json({
      error: "STRIPE_LIFECYCLE_PROCESSING_FAILED",
      timestamp: new Date().toISOString(),
    });
  }
}
