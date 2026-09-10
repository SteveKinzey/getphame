import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import {
  STRIPE_LIFECYCLE_CRON,
  getStripeLifecycleScheduler,
  saveStripeLifecycleSchedulerTaskUid,
} from "./stripeLifecycle";

export const STRIPE_LIFECYCLE_HEARTBEAT_NAME = "get-phame-stripe-lifecycle-v1";
export const STRIPE_LIFECYCLE_CALLBACK_PATH = "/api/scheduled/stripe-lifecycle";
export { STRIPE_LIFECYCLE_CRON } from "./stripeLifecycle";

type StripeLifecycleHeartbeatDeps = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
  getScheduler: typeof getStripeLifecycleScheduler;
  saveTaskUid: typeof saveStripeLifecycleSchedulerTaskUid;
};

const defaultDeps: StripeLifecycleHeartbeatDeps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getScheduler: getStripeLifecycleScheduler,
  saveTaskUid: saveStripeLifecycleSchedulerTaskUid,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: STRIPE_LIFECYCLE_CRON,
    path: STRIPE_LIFECYCLE_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: "Deliver bounded Get Phame Stripe lifecycle notices.",
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
          job.name === STRIPE_LIFECYCLE_HEARTBEAT_NAME
      )
    : undefined;
  return (
    persisted ??
    jobs.find(job => job.name === STRIPE_LIFECYCLE_HEARTBEAT_NAME) ??
    null
  );
}

async function adoptAndRepair(
  job: HeartbeatJobInfo,
  deps: StripeLifecycleHeartbeatDeps
) {
  await deps.update(job.taskUid, desiredUpdate(), "");
  await deps.saveTaskUid(job.taskUid);
  return { status: "reconciled" as const };
}

export async function reconcileStripeLifecycleHeartbeat(options?: {
  enabled?: boolean;
  deps?: StripeLifecycleHeartbeatDeps;
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
    const created = await deps.create(
      {
        name: STRIPE_LIFECYCLE_HEARTBEAT_NAME,
        cron: STRIPE_LIFECYCLE_CRON,
        path: STRIPE_LIFECYCLE_CALLBACK_PATH,
        method: "POST",
        payload: {},
        description: "Deliver bounded Get Phame Stripe lifecycle notices.",
      },
      ""
    );
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const };
  } catch (error) {
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const racedJob = findOwnedJob(
      retryPage.jobs,
      scheduler?.scheduleCronTaskUid
    );
    if (!racedJob) throw error;
    return adoptAndRepair(racedJob, deps);
  }
}
