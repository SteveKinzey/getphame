import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import {
  authHealthChecks,
  monthlyDiagnosticExportDeliveries,
  monthlyDiagnosticExportRuns,
  monthlyDiagnosticExportSchedules,
  savedContacts,
  users,
  type MonthlyDiagnosticExportDelivery,
  type MonthlyDiagnosticExportRun,
} from "../drizzle/schema";
import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import {
  buildMonthlyDiagnosticsExport,
  deriveCompletedPreviousUtcMonth,
  getUtcMonthBounds,
  MONTHLY_DIAGNOSTICS_AUTH_ROW_LIMIT,
  type MonthlyDiagnosticsAuthRow,
  type MonthlyDiagnosticsConsentAggregate,
} from "./monthlyDiagnosticsExport";
import { sendMonthlyDiagnosticReportEmail } from "./monthlyDiagnosticsReportEmail";

export const MONTHLY_DIAGNOSTICS_SCHEDULE_KEY = "global";
export const MONTHLY_DIAGNOSTICS_CRON = "0 10 8 1 * *";
export const MONTHLY_DIAGNOSTICS_HEARTBEAT_NAME =
  "get-phame-monthly-diagnostic-export-v1";
export const MONTHLY_DIAGNOSTICS_CALLBACK_PATH =
  "/api/scheduled/monthly-diagnostic-export";
/** Future administrator UI controls this persisted flag; no UI is exposed in this pass. */
export const MONTHLY_DIAGNOSTICS_ADMIN_CONTROLLABLE = true;

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    return Number(
      (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
    );
  }
  return Number(
    (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
}

function isValidRecipientEmail(
  value: string | null | undefined
): value is string {
  if (!value || value.length > 320 || /[\r\n]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function deliveryErrorCode(error: unknown) {
  return error instanceof Error &&
    error.message === "SYSTEM_MAIL_NOT_CONFIGURED"
    ? "system_mail_not_configured"
    : "delivery_failed";
}

export async function getMonthlyDiagnosticsSchedule() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(monthlyDiagnosticExportSchedules)
    .where(
      eq(
        monthlyDiagnosticExportSchedules.scheduleKey,
        MONTHLY_DIAGNOSTICS_SCHEDULE_KEY
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getEnabledMonthlyDiagnosticsScheduleByTaskUid(
  taskUid: string
) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(monthlyDiagnosticExportSchedules)
    .where(
      and(
        eq(monthlyDiagnosticExportSchedules.scheduleCronTaskUid, taskUid),
        eq(monthlyDiagnosticExportSchedules.enabled, true)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function saveMonthlyDiagnosticsScheduleTaskUid(
  taskUid: string,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db
    .insert(monthlyDiagnosticExportSchedules)
    .values({
      scheduleKey: MONTHLY_DIAGNOSTICS_SCHEDULE_KEY,
      scheduleCronTaskUid: taskUid,
      enabled: true,
      cronExpression: MONTHLY_DIAGNOSTICS_CRON,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: taskUid,
        cronExpression: MONTHLY_DIAGNOSTICS_CRON,
        updatedAt: now,
      },
    });
}

async function snapshotMonthlyRun(
  scheduleId: number,
  reportMonthKey: string,
  snapshotGeneratedAtMs: number
): Promise<{ run: MonthlyDiagnosticExportRun; created: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  try {
    return await db.transaction(async tx => {
      const [existing] = await tx
        .select()
        .from(monthlyDiagnosticExportRuns)
        .where(
          and(
            eq(monthlyDiagnosticExportRuns.scheduleId, scheduleId),
            eq(monthlyDiagnosticExportRuns.reportMonthKey, reportMonthKey)
          )
        )
        .limit(1);
      if (existing) return { run: existing, created: false };

      const insertResult = await tx.insert(monthlyDiagnosticExportRuns).values({
        scheduleId,
        reportMonthKey,
        snapshotGeneratedAt: snapshotGeneratedAtMs,
        status: "preparing",
        createdAt: snapshotGeneratedAtMs,
      });
      const runId = Number(insertResult[0].insertId);
      const eligibleAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "admin"),
            sql`${users.email} is not null`,
            sql`trim(${users.email}) <> ''`,
            or(
              isNull(users.suspendedUntil),
              lt(users.suspendedUntil, snapshotGeneratedAtMs)
            )
          )
        );
      if (eligibleAdmins.length > 0) {
        await tx
          .insert(monthlyDiagnosticExportDeliveries)
          .values(
            eligibleAdmins.map(admin => ({
              runId,
              recipientUserId: admin.id,
              state: "pending",
              createdAt: snapshotGeneratedAtMs,
              updatedAt: snapshotGeneratedAtMs,
            }))
          )
          .onDuplicateKeyUpdate({
            set: { updatedAt: snapshotGeneratedAtMs },
          });
      }
      const [run] = await tx
        .select()
        .from(monthlyDiagnosticExportRuns)
        .where(eq(monthlyDiagnosticExportRuns.id, runId))
        .limit(1);
      if (!run) throw new Error("RUN_SNAPSHOT_FAILED");
      return { run, created: true };
    });
  } catch (error) {
    const [existing] = await db
      .select()
      .from(monthlyDiagnosticExportRuns)
      .where(
        and(
          eq(monthlyDiagnosticExportRuns.scheduleId, scheduleId),
          eq(monthlyDiagnosticExportRuns.reportMonthKey, reportMonthKey)
        )
      )
      .limit(1);
    if (existing) return { run: existing, created: false };
    throw error;
  }
}

export async function loadMonthlyDiagnosticsSource(
  reportMonthKey: string
): Promise<{
  consent: MonthlyDiagnosticsConsentAggregate;
  authRows: MonthlyDiagnosticsAuthRow[];
  authTotalMatching: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const { periodStartMs, periodEndExclusiveMs } =
    getUtcMonthBounds(reportMonthKey);
  const authWhere = and(
    eq(authHealthChecks.triggerSource, "scheduled"),
    gte(authHealthChecks.checkedAt, periodStartMs),
    lt(authHealthChecks.checkedAt, periodEndExclusiveMs)
  );
  const [consentRow, authTotalRow, authRows] = await Promise.all([
    db
      .select({
        savedContactsTotal: sql<number>`count(*)`,
        explicitConsentTotal: sql<number>`sum(case when ${savedContacts.consentBasis} = 'explicit' then 1 else 0 end)`,
        optedOutTotal: sql<number>`sum(case when ${savedContacts.optedOut} = 1 then 1 else 0 end)`,
      })
      .from(savedContacts)
      .then(rows => rows[0]),
    db
      .select({ value: sql<number>`count(*)` })
      .from(authHealthChecks)
      .where(authWhere)
      .then(rows => rows[0]),
    db
      .select({
        id: authHealthChecks.id,
        checkedAt: authHealthChecks.checkedAt,
        triggerSource: authHealthChecks.triggerSource,
        overallStatus: authHealthChecks.overallStatus,
        configStatus: authHealthChecks.configStatus,
        databaseStatus: authHealthChecks.databaseStatus,
        userSchemaStatus: authHealthChecks.userSchemaStatus,
        magicLinkSchemaStatus: authHealthChecks.magicLinkSchemaStatus,
        sessionStatus: authHealthChecks.sessionStatus,
        emailProviderStatus: authHealthChecks.emailProviderStatus,
        failureCode: authHealthChecks.failureCode,
        durationMs: authHealthChecks.durationMs,
      })
      .from(authHealthChecks)
      .where(authWhere)
      .orderBy(desc(authHealthChecks.checkedAt), desc(authHealthChecks.id))
      .limit(MONTHLY_DIAGNOSTICS_AUTH_ROW_LIMIT),
  ]);
  return {
    consent: {
      savedContactsTotal: Number(consentRow?.savedContactsTotal ?? 0),
      explicitConsentTotal: Number(consentRow?.explicitConsentTotal ?? 0),
      optedOutTotal: Number(consentRow?.optedOutTotal ?? 0),
    },
    authRows,
    authTotalMatching: Number(authTotalRow?.value ?? 0),
  };
}

export async function saveMonthlyDiagnosticsRunMetadata(input: {
  runId: number;
  status: "ready" | "completed" | "partial" | "failed";
  savedContactsTotal: number;
  explicitConsentTotal: number;
  withoutExplicitConsentTotal: number;
  optedOutTotal: number;
  authTotalMatching: number;
  authExportedRows: number;
  authTruncated: boolean;
  consentFilename: string;
  authFilename: string;
  completedAt?: number | null;
  errorCode?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db
    .update(monthlyDiagnosticExportRuns)
    .set({
      status: input.status,
      savedContactsTotal: input.savedContactsTotal,
      explicitConsentTotal: input.explicitConsentTotal,
      withoutExplicitConsentTotal: input.withoutExplicitConsentTotal,
      optedOutTotal: input.optedOutTotal,
      authTotalMatching: input.authTotalMatching,
      authExportedRows: input.authExportedRows,
      authTruncated: input.authTruncated,
      consentFilename: input.consentFilename,
      authFilename: input.authFilename,
      completedAt: input.completedAt ?? null,
      errorCode: input.errorCode?.slice(0, 64) ?? null,
    })
    .where(eq(monthlyDiagnosticExportRuns.id, input.runId));
}

export async function listPendingMonthlyDiagnosticsDeliveries(runId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db
    .select()
    .from(monthlyDiagnosticExportDeliveries)
    .where(
      and(
        eq(monthlyDiagnosticExportDeliveries.runId, runId),
        eq(monthlyDiagnosticExportDeliveries.state, "pending")
      )
    )
    .orderBy(monthlyDiagnosticExportDeliveries.id);
}

export async function claimMonthlyDiagnosticsDelivery(
  deliveryId: number,
  now = Date.now()
): Promise<MonthlyDiagnosticExportDelivery | null> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db
    .update(monthlyDiagnosticExportDeliveries)
    .set({
      state: "attempted",
      attemptCount: sql`${monthlyDiagnosticExportDeliveries.attemptCount} + 1`,
      attemptedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(monthlyDiagnosticExportDeliveries.id, deliveryId),
        eq(monthlyDiagnosticExportDeliveries.state, "pending")
      )
    );
  if (getAffectedRows(result) !== 1) return null;
  const [claimed] = await db
    .select()
    .from(monthlyDiagnosticExportDeliveries)
    .where(eq(monthlyDiagnosticExportDeliveries.id, deliveryId))
    .limit(1);
  return claimed ?? null;
}

export async function getCurrentEligibleAdminRecipient(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const now = Date.now();
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "admin"),
        or(isNull(users.suspendedUntil), lt(users.suspendedUntil, now))
      )
    )
    .limit(1);
  if (!row || !isValidRecipientEmail(row.email)) return null;
  return { id: row.id, email: row.email.trim() };
}

export async function finishMonthlyDiagnosticsDelivery(input: {
  deliveryId: number;
  state: "sent" | "failed" | "recipient_unavailable";
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const now = input.now ?? Date.now();
  await db
    .update(monthlyDiagnosticExportDeliveries)
    .set({
      state: input.state,
      sentAt: input.state === "sent" ? now : null,
      errorCode: input.errorCode?.slice(0, 64) ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(monthlyDiagnosticExportDeliveries.id, input.deliveryId),
        eq(monthlyDiagnosticExportDeliveries.state, "attempted")
      )
    );
}

export type MonthlyDiagnosticsProcessorDeps = {
  getScheduleByTaskUid: typeof getEnabledMonthlyDiagnosticsScheduleByTaskUid;
  snapshotRun: typeof snapshotMonthlyRun;
  loadSource: typeof loadMonthlyDiagnosticsSource;
  saveRun: typeof saveMonthlyDiagnosticsRunMetadata;
  listPending: typeof listPendingMonthlyDiagnosticsDeliveries;
  claimDelivery: typeof claimMonthlyDiagnosticsDelivery;
  resolveRecipient: typeof getCurrentEligibleAdminRecipient;
  finishDelivery: typeof finishMonthlyDiagnosticsDelivery;
  sendReport: typeof sendMonthlyDiagnosticReportEmail;
};

const defaultProcessorDeps: MonthlyDiagnosticsProcessorDeps = {
  getScheduleByTaskUid: getEnabledMonthlyDiagnosticsScheduleByTaskUid,
  snapshotRun: snapshotMonthlyRun,
  loadSource: loadMonthlyDiagnosticsSource,
  saveRun: saveMonthlyDiagnosticsRunMetadata,
  listPending: listPendingMonthlyDiagnosticsDeliveries,
  claimDelivery: claimMonthlyDiagnosticsDelivery,
  resolveRecipient: getCurrentEligibleAdminRecipient,
  finishDelivery: finishMonthlyDiagnosticsDelivery,
  sendReport: sendMonthlyDiagnosticReportEmail,
};

export async function processMonthlyDiagnosticsExport(
  taskUid: string,
  now = Date.now(),
  deps: MonthlyDiagnosticsProcessorDeps = defaultProcessorDeps
) {
  const schedule = await deps.getScheduleByTaskUid(taskUid);
  if (!schedule) return { ok: true, skipped: "orphan_or_disabled" as const };
  const requestedWindow = deriveCompletedPreviousUtcMonth(now);
  const runClaim = await deps.snapshotRun(
    schedule.id,
    requestedWindow.reportMonthKey,
    now
  );
  const run = runClaim.run;
  if (["completed", "partial", "failed"].includes(run.status)) {
    return {
      ok: true,
      skipped: "month_already_terminal" as const,
      reportMonthKey: run.reportMonthKey,
    };
  }

  const source = await deps.loadSource(run.reportMonthKey);
  const report = buildMonthlyDiagnosticsExport({
    snapshotGeneratedAtMs: run.snapshotGeneratedAt,
    consent: source.consent,
    authRows: source.authRows,
    authTotalMatching: source.authTotalMatching,
  });
  await deps.saveRun({
    runId: run.id,
    status: "ready",
    ...report.metadata.consent,
    authTotalMatching: report.metadata.auth.totalMatching,
    authExportedRows: report.metadata.auth.exportedRows,
    authTruncated: report.metadata.auth.truncated,
    consentFilename: report.attachments[0].filename,
    authFilename: report.attachments[1].filename,
  });

  const deliveries = await deps.listPending(run.id);
  const summary = { attempted: 0, sent: 0, failed: 0, unavailable: 0 };
  for (const delivery of deliveries) {
    const claimed = await deps.claimDelivery(delivery.id, now);
    if (!claimed) continue;
    summary.attempted += 1;
    const recipient = await deps.resolveRecipient(claimed.recipientUserId);
    if (!recipient) {
      await deps.finishDelivery({
        deliveryId: claimed.id,
        state: "recipient_unavailable",
        errorCode: "recipient_unavailable",
        now,
      });
      summary.unavailable += 1;
      continue;
    }
    try {
      await deps.sendReport({
        recipient: recipient.email,
        reportMonthKey: run.reportMonthKey,
        snapshotGeneratedAtMs: run.snapshotGeneratedAt,
        attachments: report.attachments,
        metadata: report.metadata,
      });
      await deps.finishDelivery({
        deliveryId: claimed.id,
        state: "sent",
        now,
      });
      summary.sent += 1;
    } catch (error) {
      await deps.finishDelivery({
        deliveryId: claimed.id,
        state: "failed",
        errorCode: deliveryErrorCode(error),
        now,
      });
      summary.failed += 1;
    }
  }

  const status = summary.failed > 0 ? "partial" : "completed";
  await deps.saveRun({
    runId: run.id,
    status,
    ...report.metadata.consent,
    authTotalMatching: report.metadata.auth.totalMatching,
    authExportedRows: report.metadata.auth.exportedRows,
    authTruncated: report.metadata.auth.truncated,
    consentFilename: report.attachments[0].filename,
    authFilename: report.attachments[1].filename,
    completedAt: now,
    errorCode: summary.failed > 0 ? "delivery_failed" : null,
  });
  return {
    ok: true,
    reportMonthKey: run.reportMonthKey,
    authTotalMatching: report.metadata.auth.totalMatching,
    authExportedRows: report.metadata.auth.exportedRows,
    authTruncated: report.metadata.auth.truncated,
    summary,
  };
}

const heartbeatDeps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getSchedule: getMonthlyDiagnosticsSchedule,
  saveTaskUid: saveMonthlyDiagnosticsScheduleTaskUid,
};

type MonthlyDiagnosticsHeartbeatDeps = typeof heartbeatDeps;

function desiredHeartbeatUpdate(enabled: boolean): HeartbeatJobUpdate {
  return {
    cron: MONTHLY_DIAGNOSTICS_CRON,
    path: MONTHLY_DIAGNOSTICS_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description:
      "Deliver bounded monthly consent posture and authentication diagnostics to active administrators.",
    enable: enabled,
  };
}

function findOwnedHeartbeat(
  jobs: HeartbeatJobInfo[],
  persistedTaskUid: string | null | undefined
) {
  const persisted = persistedTaskUid
    ? jobs.find(
        job =>
          job.taskUid === persistedTaskUid &&
          job.name === MONTHLY_DIAGNOSTICS_HEARTBEAT_NAME
      )
    : undefined;
  return (
    persisted ??
    jobs.find(job => job.name === MONTHLY_DIAGNOSTICS_HEARTBEAT_NAME) ??
    null
  );
}

export async function reconcileMonthlyDiagnosticsHeartbeat(options?: {
  production?: boolean;
  deps?: MonthlyDiagnosticsHeartbeatDeps;
}) {
  if (!(options?.production ?? ENV.isProduction)) {
    return { status: "skipped" as const };
  }
  const deps = options?.deps ?? heartbeatDeps;
  const schedule = await deps.getSchedule();
  const enabled = schedule?.enabled ?? true;
  const firstPage = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedHeartbeat(
    firstPage.jobs,
    schedule?.scheduleCronTaskUid
  );
  if (existing) {
    await deps.update(existing.taskUid, desiredHeartbeatUpdate(enabled), "");
    await deps.saveTaskUid(existing.taskUid);
    return { status: enabled ? ("reconciled" as const) : ("paused" as const) };
  }
  if (!enabled) return { status: "paused" as const };
  try {
    const created = await deps.create(
      {
        name: MONTHLY_DIAGNOSTICS_HEARTBEAT_NAME,
        cron: MONTHLY_DIAGNOSTICS_CRON,
        path: MONTHLY_DIAGNOSTICS_CALLBACK_PATH,
        method: "POST",
        payload: {},
        description:
          "Deliver bounded monthly consent posture and authentication diagnostics to active administrators.",
      },
      ""
    );
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const };
  } catch (error) {
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const raced = findOwnedHeartbeat(
      retryPage.jobs,
      schedule?.scheduleCronTaskUid
    );
    if (!raced) throw error;
    await deps.update(raced.taskUid, desiredHeartbeatUpdate(true), "");
    await deps.saveTaskUid(raced.taskUid);
    return { status: "reconciled" as const };
  }
}

export const monthlyDiagnosticsScheduleSourceContract = {
  persistsReportContent: false,
  persistsRecipientEmail: false,
  deliveryClaimTransition: "pending -> attempted",
  automaticRetryAfterAttempt: false,
} as const;

export { isValidRecipientEmail };
