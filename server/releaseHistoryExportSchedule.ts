import { and, desc, eq, ne, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import {
  createHeartbeatJob,
  deleteHeartbeatJob,
  updateHeartbeatJob,
} from "./_core/heartbeat";
import { getDb } from "./db";
import {
  releaseHistoryExportRuns,
  releaseHistoryExportSchedules,
  releaseParityRecords,
} from "../drizzle/schema";
import {
  buildReleaseHistoryCsvExport,
  RELEASE_HISTORY_EXPORT_COLUMN_KEYS,
  RELEASE_HISTORY_EXPORT_LIMIT,
  type ReleaseHistoryExportColumnKey,
} from "./releaseParityExport";

export const RELEASE_HISTORY_EXPORT_SCHEDULE_KEY = "global";
export const RELEASE_HISTORY_EXPORT_HEARTBEAT_NAME =
  "get-phame-release-history-export-v1";
export const RELEASE_HISTORY_EXPORT_CALLBACK_PATH =
  "/api/scheduled/release-history-export";
export const RELEASE_HISTORY_EXPORT_DEFAULT_CRON = "0 0 9 * * 1";
const SCHEDULED_EXPORT_DEDUP_MS = 55_000;

export type ReleaseHistoryExportScheduleInput = {
  enabled: boolean;
  cronExpression: string;
  statusFilter: "all" | "matched" | "needs_review";
  sortBy: "recordedAt" | "checkpointId";
  sortDirection: "asc" | "desc";
  selectedColumns: ReleaseHistoryExportColumnKey[];
};

function decodeSelectedColumns(raw: string): ReleaseHistoryExportColumnKey[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const allowed = new Set<string>(RELEASE_HISTORY_EXPORT_COLUMN_KEYS);
      const columns = parsed.filter(
        (value): value is ReleaseHistoryExportColumnKey =>
          typeof value === "string" && allowed.has(value)
      );
      if (columns.length) return columns;
    }
  } catch {
    // Fall through to the reviewed safe default.
  }
  return [...RELEASE_HISTORY_EXPORT_COLUMN_KEYS];
}

function isCronExpression(value: string) {
  return value.trim().split(/\s+/).length === 6 && value.trim().length <= 64;
}

export async function getReleaseHistoryExportSchedule() {
  const db = await getDb();
  if (!db) throw new Error("Release history schedule storage is unavailable.");
  const [schedule] = await db
    .select()
    .from(releaseHistoryExportSchedules)
    .where(
      eq(
        releaseHistoryExportSchedules.scheduleKey,
        RELEASE_HISTORY_EXPORT_SCHEDULE_KEY
      )
    )
    .limit(1);
  if (!schedule) {
    return {
      id: null,
      enabled: false,
      cronExpression: RELEASE_HISTORY_EXPORT_DEFAULT_CRON,
      statusFilter: "all" as const,
      sortBy: "recordedAt" as const,
      sortDirection: "desc" as const,
      selectedColumns: [...RELEASE_HISTORY_EXPORT_COLUMN_KEYS],
      lastRunAt: null,
      lastRunStatus: null,
      lastRunErrorCode: null,
      lastRunRowCount: null,
    };
  }
  return {
    id: schedule.id,
    enabled: schedule.enabled,
    cronExpression: schedule.cronExpression,
    statusFilter:
      schedule.statusFilter as ReleaseHistoryExportScheduleInput["statusFilter"],
    sortBy: schedule.sortBy as ReleaseHistoryExportScheduleInput["sortBy"],
    sortDirection:
      schedule.sortDirection as ReleaseHistoryExportScheduleInput["sortDirection"],
    selectedColumns: decodeSelectedColumns(schedule.selectedColumns),
    lastRunAt: schedule.lastRunAt,
    lastRunStatus: schedule.lastRunStatus,
    lastRunErrorCode: schedule.lastRunErrorCode,
    lastRunRowCount: schedule.lastRunRowCount,
  };
}

async function reconcileHeartbeat(schedule: {
  id: number;
  scheduleCronTaskUid: string | null;
  enabled: boolean;
  cronExpression: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Release history schedule storage is unavailable.");
  if (!schedule.enabled) {
    if (schedule.scheduleCronTaskUid) {
      await updateHeartbeatJob(
        schedule.scheduleCronTaskUid,
        { enable: false },
        ""
      );
    }
    return;
  }
  const patch = {
    cron: schedule.cronExpression,
    path: RELEASE_HISTORY_EXPORT_CALLBACK_PATH,
    method: "POST" as const,
    payload: {},
    description:
      "Create a bounded sanitized Get Phame release-history report snapshot.",
    enable: true,
  };
  if (schedule.scheduleCronTaskUid) {
    await updateHeartbeatJob(schedule.scheduleCronTaskUid, patch, "");
    return;
  }
  const created = await createHeartbeatJob(
    { name: RELEASE_HISTORY_EXPORT_HEARTBEAT_NAME, ...patch },
    ""
  );
  await db
    .update(releaseHistoryExportSchedules)
    .set({ scheduleCronTaskUid: created.taskUid, updatedAt: Date.now() })
    .where(eq(releaseHistoryExportSchedules.id, schedule.id));
}

export async function saveReleaseHistoryExportSchedule(
  input: ReleaseHistoryExportScheduleInput
) {
  if (!isCronExpression(input.cronExpression))
    throw new Error("Use a six-field UTC schedule expression.");
  if (
    !input.selectedColumns.length ||
    input.selectedColumns.length > RELEASE_HISTORY_EXPORT_COLUMN_KEYS.length
  ) {
    throw new Error("Choose at least one allowed export column.");
  }
  const db = await getDb();
  if (!db) throw new Error("Release history schedule storage is unavailable.");
  const now = Date.now();
  const [existing] = await db
    .select()
    .from(releaseHistoryExportSchedules)
    .where(
      eq(
        releaseHistoryExportSchedules.scheduleKey,
        RELEASE_HISTORY_EXPORT_SCHEDULE_KEY
      )
    )
    .limit(1);
  if (existing) {
    await db
      .update(releaseHistoryExportSchedules)
      .set({
        enabled: input.enabled,
        cronExpression: input.cronExpression.trim(),
        statusFilter: input.statusFilter,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
        selectedColumns: JSON.stringify(input.selectedColumns),
        updatedAt: now,
      })
      .where(eq(releaseHistoryExportSchedules.id, existing.id));
  } else {
    await db.insert(releaseHistoryExportSchedules).values({
      scheduleKey: RELEASE_HISTORY_EXPORT_SCHEDULE_KEY,
      enabled: input.enabled,
      cronExpression: input.cronExpression.trim(),
      statusFilter: input.statusFilter,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
      selectedColumns: JSON.stringify(input.selectedColumns),
      createdAt: now,
      updatedAt: now,
    });
  }
  const [saved] = await db
    .select()
    .from(releaseHistoryExportSchedules)
    .where(
      eq(
        releaseHistoryExportSchedules.scheduleKey,
        RELEASE_HISTORY_EXPORT_SCHEDULE_KEY
      )
    )
    .limit(1);
  if (!saved) throw new Error("Release history schedule could not be saved.");
  await reconcileHeartbeat(saved);
  return getReleaseHistoryExportSchedule();
}

export async function deleteReleaseHistoryExportSchedule() {
  const db = await getDb();
  if (!db) throw new Error("Release history schedule storage is unavailable.");
  const [schedule] = await db
    .select()
    .from(releaseHistoryExportSchedules)
    .where(
      eq(
        releaseHistoryExportSchedules.scheduleKey,
        RELEASE_HISTORY_EXPORT_SCHEDULE_KEY
      )
    )
    .limit(1);
  if (!schedule) return;
  if (schedule.scheduleCronTaskUid)
    await deleteHeartbeatJob(schedule.scheduleCronTaskUid, "");
  await db
    .delete(releaseHistoryExportSchedules)
    .where(eq(releaseHistoryExportSchedules.id, schedule.id));
}

export async function runReleaseHistoryExportSchedule(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Release history schedule storage is unavailable.");
  const [schedule] = await db
    .select()
    .from(releaseHistoryExportSchedules)
    .where(
      and(
        eq(releaseHistoryExportSchedules.scheduleCronTaskUid, taskUid),
        eq(releaseHistoryExportSchedules.enabled, true)
      )
    )
    .limit(1);
  if (!schedule) return { ok: true, skipped: "orphan_or_disabled" as const };
  const now = Date.now();
  if (
    schedule.lastRunAt &&
    now - schedule.lastRunAt < SCHEDULED_EXPORT_DEDUP_MS
  ) {
    return { ok: true, skipped: "recent_run_exists" as const };
  }
  try {
    const where =
      schedule.statusFilter === "matched"
        ? eq(releaseParityRecords.parityStatus, "matched")
        : schedule.statusFilter === "needs_review"
          ? ne(releaseParityRecords.parityStatus, "matched")
          : undefined;
    const rows = await db
      .select()
      .from(releaseParityRecords)
      .where(where)
      .orderBy(
        desc(releaseParityRecords.recordedAt),
        desc(releaseParityRecords.id)
      )
      .limit(RELEASE_HISTORY_EXPORT_LIMIT);
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(releaseParityRecords)
      .where(where);
    const total = Number(totalRow?.total ?? 0);
    const snapshot = buildReleaseHistoryCsvExport({
      rows,
      total,
      truncated: total > rows.length,
      status: schedule.statusFilter as "all" | "matched" | "needs_review",
      sortBy: schedule.sortBy as "recordedAt" | "checkpointId",
      sortDirection: schedule.sortDirection as "asc" | "desc",
      selectedColumns: decodeSelectedColumns(schedule.selectedColumns),
      snapshotToMs: now,
    });
    await db.insert(releaseHistoryExportRuns).values({
      scheduleId: schedule.id,
      scheduleCronTaskUid: taskUid,
      status: "ok",
      rowCount: snapshot.rowCount,
      truncated: snapshot.truncated,
      filename: snapshot.filename,
      csv: snapshot.csv,
      generatedAt: now,
    });
    await db
      .update(releaseHistoryExportSchedules)
      .set({
        lastRunAt: now,
        lastRunStatus: "ok",
        lastRunErrorCode: null,
        lastRunRowCount: snapshot.rowCount,
        updatedAt: now,
      })
      .where(eq(releaseHistoryExportSchedules.id, schedule.id));
    await notifyOwner({
      title: "Scheduled release-history report ready",
      content: `${snapshot.rowCount} sanitized release-history rows were prepared. Open GET PHAME Admin > Audit history to review or download the latest scheduled report.`,
    });
    return {
      ok: true,
      rowCount: snapshot.rowCount,
      truncated: snapshot.truncated,
    };
  } catch (error) {
    await db.insert(releaseHistoryExportRuns).values({
      scheduleId: schedule.id,
      scheduleCronTaskUid: taskUid,
      status: "failed",
      rowCount: 0,
      truncated: false,
      generatedAt: now,
      errorCode: "RELEASE_HISTORY_EXPORT_FAILED",
    });
    await db
      .update(releaseHistoryExportSchedules)
      .set({
        lastRunAt: now,
        lastRunStatus: "failed",
        lastRunErrorCode: "RELEASE_HISTORY_EXPORT_FAILED",
        lastRunRowCount: 0,
        updatedAt: now,
      })
      .where(eq(releaseHistoryExportSchedules.id, schedule.id));
    throw error;
  }
}
