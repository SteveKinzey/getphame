import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import {
  SOURCE_HEALTH_CRON,
  getSourceHealthScheduler,
  saveSourceHealthSchedulerTaskUid,
} from "./sourceConnections";

export const SOURCE_HEALTH_HEARTBEAT_NAME = "get-phame-source-health-v1";
export const SOURCE_HEALTH_CALLBACK_PATH = "/api/scheduled/source-health";

const SOURCE_HEALTH_HEARTBEAT_DESCRIPTION =
  "Evaluate attributed import flow for managed Get Phame source connections.";

type SourceHealthHeartbeatDeps = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
  getScheduler: typeof getSourceHealthScheduler;
  saveTaskUid: typeof saveSourceHealthSchedulerTaskUid;
};

const defaultDeps: SourceHealthHeartbeatDeps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getScheduler: getSourceHealthScheduler,
  saveTaskUid: saveSourceHealthSchedulerTaskUid,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: SOURCE_HEALTH_CRON,
    path: SOURCE_HEALTH_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: SOURCE_HEALTH_HEARTBEAT_DESCRIPTION,
    enable: true,
  };
}

function findOwnedJob(jobs: HeartbeatJobInfo[], persistedTaskUid: string | null | undefined) {
  const persisted = persistedTaskUid
    ? jobs.find(job => job.taskUid === persistedTaskUid && job.name === SOURCE_HEALTH_HEARTBEAT_NAME)
    : undefined;
  return persisted ?? jobs.find(job => job.name === SOURCE_HEALTH_HEARTBEAT_NAME) ?? null;
}

async function adoptAndRepair(job: HeartbeatJobInfo, deps: SourceHealthHeartbeatDeps) {
  await deps.update(job.taskUid, desiredUpdate(), "");
  await deps.saveTaskUid(job.taskUid);
  return { status: "reconciled" as const };
}

/**
 * Reconcile one project-owner Heartbeat job. The empty user session intentionally
 * resolves to the project owner, so the callback remains project-owned rather than
 * tied to whichever end user happens to start a container instance.
 */
export async function reconcileSourceHealthHeartbeat(options?: {
  enabled?: boolean;
  deps?: SourceHealthHeartbeatDeps;
}) {
  if (!(options?.enabled ?? ENV.isProduction)) {
    return { status: "skipped" as const };
  }

  const deps = options?.deps ?? defaultDeps;
  const scheduler = await deps.getScheduler();
  const firstPage = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedJob(firstPage.jobs, scheduler?.scheduleCronTaskUid);
  if (existing) return adoptAndRepair(existing, deps);

  try {
    const created = await deps.create({
      name: SOURCE_HEALTH_HEARTBEAT_NAME,
      cron: SOURCE_HEALTH_CRON,
      path: SOURCE_HEALTH_CALLBACK_PATH,
      method: "POST",
      payload: {},
      description: SOURCE_HEALTH_HEARTBEAT_DESCRIPTION,
    }, "");
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const };
  } catch (error) {
    // Concurrent cold starts may race after both list an empty job set. If the
    // provider rejects the duplicate name, adopt the now-visible owned job.
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const racedJob = findOwnedJob(retryPage.jobs, scheduler?.scheduleCronTaskUid);
    if (!racedJob) throw error;
    return adoptAndRepair(racedJob, deps);
  }
}
