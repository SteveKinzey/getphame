import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import {
  INTEGRATION_HEALTH_CRON,
  getIntegrationHealthScheduler,
  saveIntegrationHealthSchedulerTaskUid,
} from "./integrationHealthSchedule";

export const INTEGRATION_HEALTH_HEARTBEAT_NAME =
  "get-phame-integration-health-v1";
export const INTEGRATION_HEALTH_CALLBACK_PATH =
  "/api/scheduled/integration-health";

const DESCRIPTION =
  "Capture bounded Get Phame integration health latency history and deliver configured operational alerts.";

type IntegrationHealthHeartbeatDependencies = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
  getScheduler: typeof getIntegrationHealthScheduler;
  saveTaskUid: typeof saveIntegrationHealthSchedulerTaskUid;
};

const defaultDependencies: IntegrationHealthHeartbeatDependencies = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getScheduler: getIntegrationHealthScheduler,
  saveTaskUid: saveIntegrationHealthSchedulerTaskUid,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: INTEGRATION_HEALTH_CRON,
    path: INTEGRATION_HEALTH_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: DESCRIPTION,
    enable: true,
  };
}

function findOwnedJob(
  jobs: HeartbeatJobInfo[],
  persistedTaskUid: string | null | undefined
) {
  const persisted = persistedTaskUid
    ? jobs.find(
        job =>
          job.taskUid === persistedTaskUid &&
          job.name === INTEGRATION_HEALTH_HEARTBEAT_NAME
      )
    : undefined;
  return (
    persisted ??
    jobs.find(job => job.name === INTEGRATION_HEALTH_HEARTBEAT_NAME) ??
    null
  );
}

async function adoptAndRepair(
  job: HeartbeatJobInfo,
  deps: IntegrationHealthHeartbeatDependencies
) {
  await deps.update(job.taskUid, desiredUpdate(), "");
  await deps.saveTaskUid(job.taskUid);
  return { status: "reconciled" as const, taskUid: job.taskUid };
}

/**
 * Reconciles a project-owned five-minute heartbeat. It runs only after startup
 * readiness so scheduler registration cannot delay a Cloud Run cold start.
 */
export async function reconcileIntegrationHealthHeartbeat(options?: {
  enabled?: boolean;
  deps?: IntegrationHealthHeartbeatDependencies;
}) {
  if (!(options?.enabled ?? ENV.isProduction))
    return { status: "skipped" as const };

  const deps = options?.deps ?? defaultDependencies;
  const scheduler = await deps.getScheduler();
  const firstPage = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedJob(firstPage.jobs, scheduler?.scheduleCronTaskUid);
  if (existing) return adoptAndRepair(existing, deps);

  try {
    const created = await deps.create(
      {
        name: INTEGRATION_HEALTH_HEARTBEAT_NAME,
        cron: INTEGRATION_HEALTH_CRON,
        path: INTEGRATION_HEALTH_CALLBACK_PATH,
        method: "POST",
        payload: {},
        description: DESCRIPTION,
      },
      ""
    );
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const, taskUid: created.taskUid };
  } catch (error) {
    // Competing cold starts can create one job. Re-list and adopt its task UID.
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const racedJob = findOwnedJob(
      retryPage.jobs,
      scheduler?.scheduleCronTaskUid
    );
    if (!racedJob) throw error;
    return adoptAndRepair(racedJob, deps);
  }
}
