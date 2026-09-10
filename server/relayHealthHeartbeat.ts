import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";

export const RELAY_HEALTH_HEARTBEAT_NAME = "get-phame-email-relay-health-v1";
export const RELAY_HEALTH_CALLBACK_PATH = "/api/scheduled/relay-heartbeat";
export const RELAY_HEALTH_CRON = "0 */15 * * * *";

const DESCRIPTION =
  "Verify Get Phame operational email primary relay health and alert on SendGrid failover transitions.";

type RelayHeartbeatDeps = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
};

const defaultDeps: RelayHeartbeatDeps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: RELAY_HEALTH_CRON,
    path: RELAY_HEALTH_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: DESCRIPTION,
    enable: true,
  };
}

function findOwnedJob(jobs: HeartbeatJobInfo[]) {
  return jobs.find(job => job.name === RELAY_HEALTH_HEARTBEAT_NAME) ?? null;
}

/**
 * Reconcile the project-owned native heartbeat, avoiding a separate AI task per check.
 * The generated callback identity is verified by relayHeartbeatHandler before execution.
 */
export async function reconcileRelayHealthHeartbeat(options?: {
  enabled?: boolean;
  deps?: RelayHeartbeatDeps;
}) {
  if (!(options?.enabled ?? ENV.isProduction))
    return { status: "skipped" as const };

  const deps = options?.deps ?? defaultDeps;
  const firstPage = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedJob(firstPage.jobs);
  if (existing) {
    await deps.update(existing.taskUid, desiredUpdate(), "");
    return { status: "reconciled" as const, taskUid: existing.taskUid };
  }

  try {
    const created = await deps.create(
      {
        name: RELAY_HEALTH_HEARTBEAT_NAME,
        cron: RELAY_HEALTH_CRON,
        path: RELAY_HEALTH_CALLBACK_PATH,
        method: "POST",
        payload: {},
        description: DESCRIPTION,
      },
      ""
    );
    return { status: "created" as const, taskUid: created.taskUid };
  } catch (error) {
    // Two cold starts can observe no job at once. Re-list and adopt the winner.
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const racedJob = findOwnedJob(retryPage.jobs);
    if (!racedJob) throw error;
    await deps.update(racedJob.taskUid, desiredUpdate(), "");
    return { status: "reconciled" as const, taskUid: racedJob.taskUid };
  }
}
