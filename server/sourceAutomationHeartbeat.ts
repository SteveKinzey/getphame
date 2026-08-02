import {
  createHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
  type HeartbeatJobUpdate,
} from "./_core/heartbeat";
import { ENV } from "./_core/env";
import {
  SOURCE_AUTOMATION_CRON,
  getSourceAutomationScheduler,
  saveSourceAutomationSchedulerTaskUid,
} from "./sourceAutomation";

export const SOURCE_AUTOMATION_HEARTBEAT_NAME = "get-phame-source-automation-v1";
export const SOURCE_AUTOMATION_CALLBACK_PATH = "/api/scheduled/source-automation";
export { SOURCE_AUTOMATION_CRON } from "./sourceAutomation";

type SourceAutomationHeartbeatDeps = {
  list: typeof listHeartbeatJobs;
  create: typeof createHeartbeatJob;
  update: typeof updateHeartbeatJob;
  getScheduler: typeof getSourceAutomationScheduler;
  saveTaskUid: typeof saveSourceAutomationSchedulerTaskUid;
};

const defaultDeps: SourceAutomationHeartbeatDeps = {
  list: listHeartbeatJobs,
  create: createHeartbeatJob,
  update: updateHeartbeatJob,
  getScheduler: getSourceAutomationScheduler,
  saveTaskUid: saveSourceAutomationSchedulerTaskUid,
};

function desiredUpdate(): HeartbeatJobUpdate {
  return {
    cron: SOURCE_AUTOMATION_CRON,
    path: SOURCE_AUTOMATION_CALLBACK_PATH,
    method: "POST",
    payload: {},
    description: "Process due Get Phame source-bound review-request automation events.",
    enable: true,
  };
}

function findOwnedJob(jobs: HeartbeatJobInfo[], persistedTaskUid: string | null | undefined) {
  const persisted = persistedTaskUid
    ? jobs.find(job => job.taskUid === persistedTaskUid && job.name === SOURCE_AUTOMATION_HEARTBEAT_NAME)
    : undefined;
  return persisted ?? jobs.find(job => job.name === SOURCE_AUTOMATION_HEARTBEAT_NAME) ?? null;
}

async function adoptAndRepair(job: HeartbeatJobInfo, deps: SourceAutomationHeartbeatDeps) {
  await deps.update(job.taskUid, desiredUpdate(), "");
  await deps.saveTaskUid(job.taskUid);
  return { status: "reconciled" as const };
}

export async function reconcileSourceAutomationHeartbeat(options?: {
  enabled?: boolean;
  deps?: SourceAutomationHeartbeatDeps;
}) {
  if (!(options?.enabled ?? ENV.isProduction)) return { status: "skipped" as const };
  const deps = options?.deps ?? defaultDeps;
  const scheduler = await deps.getScheduler();
  const firstPage = await deps.list("", { page: 1, pageSize: 100 });
  const existing = findOwnedJob(firstPage.jobs, scheduler?.scheduleCronTaskUid);
  if (existing) return adoptAndRepair(existing, deps);
  try {
    const created = await deps.create({
      name: SOURCE_AUTOMATION_HEARTBEAT_NAME,
      cron: SOURCE_AUTOMATION_CRON,
      path: SOURCE_AUTOMATION_CALLBACK_PATH,
      method: "POST",
      payload: {},
      description: "Process due Get Phame source-bound review-request automation events.",
    }, "");
    await deps.saveTaskUid(created.taskUid);
    return { status: "created" as const };
  } catch (error) {
    const retryPage = await deps.list("", { page: 1, pageSize: 100 });
    const racedJob = findOwnedJob(retryPage.jobs, scheduler?.scheduleCronTaskUid);
    if (!racedJob) throw error;
    return adoptAndRepair(racedJob, deps);
  }
}
