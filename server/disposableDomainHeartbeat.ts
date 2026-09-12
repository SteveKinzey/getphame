import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import {
  DISPOSABLE_DOMAIN_CRON,
  getDisposableDomainScheduler,
  saveDisposableDomainSchedulerTaskUid,
} from "./disposableDomains";

export const DISPOSABLE_DOMAIN_HEARTBEAT_NAME =
  "get-phame-disposable-domains-v1";
export const DISPOSABLE_DOMAIN_CALLBACK_PATH =
  "/api/scheduled/disposable-domains";

const DESCRIPTION =
  "Synchronize approved disposable-email domains at 2:00 AM Pacific time.";

type Deps = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
  getScheduler: typeof getDisposableDomainScheduler;
  saveTaskUid: typeof saveDisposableDomainSchedulerTaskUid;
};

const defaultDeps: Deps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getScheduler: getDisposableDomainScheduler,
  saveTaskUid: saveDisposableDomainSchedulerTaskUid,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: DISPOSABLE_DOMAIN_CRON,
    path: DISPOSABLE_DOMAIN_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: DESCRIPTION,
    enable: true,
  };
}

function findOwnedJob(
  jobs: HeartbeatJobInfo[],
  taskUid: string | null | undefined
) {
  const persisted = taskUid
    ? jobs.find(
        job =>
          job.taskUid === taskUid &&
          job.name === DISPOSABLE_DOMAIN_HEARTBEAT_NAME
      )
    : undefined;
  return (
    persisted ??
    jobs.find(job => job.name === DISPOSABLE_DOMAIN_HEARTBEAT_NAME) ??
    null
  );
}

export async function reconcileDisposableDomainHeartbeat(options?: {
  enabled?: boolean;
  deps?: Deps;
}) {
  if (!(options?.enabled ?? ENV.isProduction))
    return { status: "skipped" as const };
  const deps = options?.deps ?? defaultDeps;
  const scheduler = await deps.getScheduler();
  const jobs = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedJob(jobs.jobs, scheduler?.scheduleCronTaskUid);
  if (existing) {
    await deps.update(existing.taskUid, desiredUpdate(), "");
    await deps.saveTaskUid(existing.taskUid);
    return { status: "reconciled" as const };
  }
  try {
    const created = await deps.create(
      {
        name: DISPOSABLE_DOMAIN_HEARTBEAT_NAME,
        cron: DISPOSABLE_DOMAIN_CRON,
        path: DISPOSABLE_DOMAIN_CALLBACK_PATH,
        method: "POST",
        payload: {},
        description: DESCRIPTION,
      },
      ""
    );
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const };
  } catch (error) {
    const retried = await deps.list("", { page: 1, pageSize: 100 });
    const raced = findOwnedJob(retried.jobs, scheduler?.scheduleCronTaskUid);
    if (!raced) throw error;
    await deps.update(raced.taskUid, desiredUpdate(), "");
    await deps.saveTaskUid(raced.taskUid);
    return { status: "reconciled" as const };
  }
}
