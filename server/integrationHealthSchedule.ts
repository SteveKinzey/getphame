import { and, eq, isNull, lte, or } from "drizzle-orm";
import { integrationHealthSchedulers } from "../drizzle/schema";
import { getDb } from "./db";

export const INTEGRATION_HEALTH_SCHEDULE_KEY = "integration_health";
export const INTEGRATION_HEALTH_CRON = "0 */5 * * * *";

export async function getIntegrationHealthSchedulerByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(integrationHealthSchedulers)
    .where(eq(integrationHealthSchedulers.scheduleCronTaskUid, taskUid))
    .limit(1);
  return row ?? null;
}

export async function getIntegrationHealthScheduler() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(integrationHealthSchedulers)
    .where(
      eq(
        integrationHealthSchedulers.scheduleKey,
        INTEGRATION_HEALTH_SCHEDULE_KEY
      )
    )
    .limit(1);
  return row ?? null;
}

/** Atomically prevents platform retries or overlapping cold starts from sampling twice. */
export async function claimIntegrationHealthSchedulerRun(
  taskUid: string,
  dedupWindowMs: number,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(integrationHealthSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: "running",
      lastRunErrorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(integrationHealthSchedulers.scheduleCronTaskUid, taskUid),
        or(
          isNull(integrationHealthSchedulers.lastRunAt),
          lte(integrationHealthSchedulers.lastRunAt, now - dedupWindowMs)
        )
      )
    );
  const affectedRows = Number(
    (result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0
  );
  return affectedRows === 1;
}

export async function saveIntegrationHealthSchedulerTaskUid(
  taskUid: string,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(integrationHealthSchedulers)
    .values({
      scheduleKey: INTEGRATION_HEALTH_SCHEDULE_KEY,
      scheduleCronTaskUid: taskUid,
      cronExpression: INTEGRATION_HEALTH_CRON,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: taskUid,
        cronExpression: INTEGRATION_HEALTH_CRON,
        updatedAt: now,
      },
    });
}

export async function recordIntegrationHealthSchedulerRun(input: {
  taskUid: string;
  status: "ok" | "failed";
  errorCode?: "INTEGRATION_HEALTH_RUN_FAILED";
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = input.now ?? Date.now();
  await db
    .update(integrationHealthSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: input.status,
      lastRunErrorCode: input.errorCode ?? null,
      updatedAt: now,
    })
    .where(eq(integrationHealthSchedulers.scheduleCronTaskUid, input.taskUid));
}
