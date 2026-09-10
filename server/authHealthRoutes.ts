import type { Request, Response } from "express";
import type { AuthHealthCheck, InsertAuthHealthCheck } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { listAuthHealthChecksByTaskUid } from "./db";
import {
  redactAuthDiagnosticDetail,
  runAuthHealthCheck,
} from "./authOperations";

const RETRY_DEDUP_WINDOW_MS = 5 * 60 * 1000;

type HealthSnapshot = Pick<
  AuthHealthCheck | InsertAuthHealthCheck,
  | "overallStatus"
  | "configStatus"
  | "databaseStatus"
  | "userSchemaStatus"
  | "magicLinkSchemaStatus"
  | "sessionStatus"
  | "emailProviderStatus"
  | "failureCode"
  | "durationMs"
  | "checkedAt"
>;

const componentLabels: Array<[keyof HealthSnapshot, string]> = [
  ["configStatus", "Configuration"],
  ["databaseStatus", "Database"],
  ["userSchemaStatus", "User schema"],
  ["magicLinkSchemaStatus", "Magic-link schema"],
  ["sessionStatus", "Session signing"],
  ["emailProviderStatus", "Email provider"],
];

export function getAuthHealthAlertTransition(
  current: HealthSnapshot,
  previous?: HealthSnapshot | null
) {
  if (current.overallStatus === "fail" && previous?.overallStatus !== "fail")
    return "failure" as const;
  if (current.overallStatus === "ok" && previous?.overallStatus === "fail")
    return "recovery" as const;
  return null;
}

async function deliverAuthHealthTransitionAlert(
  current: HealthSnapshot,
  previous?: HealthSnapshot | null
) {
  const transition = getAuthHealthAlertTransition(current, previous);
  if (!transition)
    return { attempted: false, delivered: true, transition: null } as const;

  const checkedAt = new Date(current.checkedAt).toISOString();
  const failedComponents = componentLabels
    .filter(([key]) => current[key] === "fail")
    .map(([, label]) => label);
  const delivered = await notifyOwner({
    title:
      transition === "failure"
        ? "GetPhame authentication health alert"
        : "GetPhame authentication health recovered",
    content:
      transition === "failure"
        ? [
            "A scheduled production authentication health check needs attention.",
            `Detected: ${checkedAt}`,
            `Failure code: ${current.failureCode ?? "unknown"}`,
            `Affected checks: ${failedComponents.join(", ") || "Unknown"}`,
            "Review: /admin/auth-diagnostics",
          ].join("\n")
        : [
            "Production authentication health has recovered.",
            `Confirmed: ${checkedAt}`,
            `Check duration: ${current.durationMs} ms`,
            "Review: /admin/auth-diagnostics",
          ].join("\n"),
  });

  return { attempted: true, delivered, transition } as const;
}

async function ensureTransitionAlertDelivered(
  current: HealthSnapshot,
  previous?: HealthSnapshot | null
) {
  const alert = await deliverAuthHealthTransitionAlert(current, previous);
  if (alert.attempted && !alert.delivered) {
    throw new Error("Owner auth health alert delivery failed");
  }
  return alert;
}

export async function authHealthHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;

    const history = await listAuthHealthChecksByTaskUid(taskUid, 2);
    const duplicate =
      history[0]?.checkedAt >= Date.now() - RETRY_DEDUP_WINDOW_MS
        ? history[0]
        : null;
    if (duplicate) {
      const alert = await ensureTransitionAlertDelivered(duplicate, history[1]);
      return res.json({
        ok: true,
        skipped: "recent-check-exists",
        status: duplicate.overallStatus,
        checkedAt: duplicate.checkedAt,
        alert: alert.transition,
      });
    }

    const result = await runAuthHealthCheck({
      triggerSource: "scheduled",
      scheduleCronTaskUid: taskUid,
    });
    const alert = await ensureTransitionAlertDelivered(result, history[0]);
    return res.json({
      ok: result.overallStatus === "ok",
      status: result.overallStatus,
      checkedAt: result.checkedAt,
      durationMs: result.durationMs,
      failureCode: result.failureCode,
      alert: alert.transition,
    });
  } catch (error) {
    const detail = redactAuthDiagnosticDetail(error);
    console.error("[AuthHealth] Scheduled callback failed:", detail);
    return res.status(500).json({
      error: detail,
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
