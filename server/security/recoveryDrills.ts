import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { and, desc, eq, gt, inArray, isNull, like, or } from "drizzle-orm";
import {
  recoveryDrillApprovals,
  recoveryDrillAssignments,
  recoveryDrillEvidence,
  recoveryDrillParticipants,
  recoveryDrills,
  securityActionApprovals,
  securityAuditEvents,
  securityPermissionOverrides,
  securityRoleGrants,
  users,
  webauthnCredentials,
  type RecoveryDrill,
} from "../../drizzle/schema";
import type { SecuritySessionContext } from "../_core/context";
import { getDb } from "../db";
import {
  RECOVERY_DRILL_ACTION_KEY,
  RECOVERY_DRILL_APPROVER_PERMISSIONS,
  RECOVERY_DRILL_OVERRIDE_MS,
  REQUIRED_COMPLETION_EVIDENCE,
  RecoveryDrillError,
  assertRecentPasskeyA2,
  assertRecoveryTransition,
  assertRedactedEvidenceText,
  assertSeparatedRecoveryRoles,
  evaluateRecoveryRuntime,
  hasRecentPasskeyA2,
  type RecoveryDrillActorRole,
  type RecoveryEvidenceOutcome,
  type RecoveryEvidenceType,
} from "./recoveryDrillPolicy";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type DbExecutor = Pick<Db, "update">;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db)
    throw new RecoveryDrillError("NOT_AVAILABLE", "Database is not available");
  return db;
}

function getRequestHost(req: Request): string | undefined {
  return req.get("x-forwarded-host") ?? req.get("host");
}

export function getRecoveryRuntime(req: Request) {
  return evaluateRecoveryRuntime({
    mode: process.env.RECOVERY_DRILL_MODE,
    allowedHosts: process.env.RECOVERY_DRILL_ALLOWED_HOSTS,
    requestHost: getRequestHost(req),
  });
}

function assertRecoveryRuntime(req: Request) {
  const runtime = getRecoveryRuntime(req);
  if (!runtime.enabled)
    throw new RecoveryDrillError(
      "NOT_AVAILABLE",
      `Staging recovery drill is unavailable (${runtime.reason})`
    );
  return runtime;
}

async function isPlatformOwner(
  userId: number,
  now = Date.now()
): Promise<boolean> {
  const db = await requireDb();
  const [grant] = await db
    .select({ id: securityRoleGrants.id })
    .from(securityRoleGrants)
    .where(
      and(
        eq(securityRoleGrants.userId, userId),
        eq(securityRoleGrants.role, "platform_owner"),
        eq(securityRoleGrants.scopeType, "platform"),
        isNull(securityRoleGrants.revokedAt),
        or(
          isNull(securityRoleGrants.expiresAt),
          gt(securityRoleGrants.expiresAt, now)
        )
      )
    )
    .limit(1);
  return Boolean(grant);
}

async function requirePlatformOwner(userId: number): Promise<void> {
  if (!(await isPlatformOwner(userId)))
    throw new RecoveryDrillError(
      "FORBIDDEN",
      "An active platform-owner grant is required"
    );
}

async function activePasskeyCount(userId: number): Promise<number> {
  const db = await requireDb();
  const rows = await db
    .select({ id: webauthnCredentials.id })
    .from(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.userId, userId),
        eq(webauthnCredentials.status, "active")
      )
    )
    .limit(2);
  return rows.length;
}

async function getDrill(drillId: string): Promise<RecoveryDrill> {
  const db = await requireDb();
  const [drill] = await db
    .select()
    .from(recoveryDrills)
    .where(eq(recoveryDrills.id, drillId))
    .limit(1);
  if (!drill || drill.environment !== "staging")
    throw new RecoveryDrillError(
      "NOT_FOUND",
      "Staging recovery drill was not found"
    );
  return drill;
}

async function requireDrillRole(
  drillId: string,
  actorUserId: number,
  roles: Array<"custodian" | "approver">
): Promise<void> {
  const allowedRoles = roles.map(role =>
    role === "custodian"
      ? ("recovery_custodian" as const)
      : ("independent_approver" as const)
  );
  const db = await requireDb();
  const [participant] = await db
    .select({ id: recoveryDrillParticipants.id })
    .from(recoveryDrillParticipants)
    .where(
      and(
        eq(recoveryDrillParticipants.drillId, drillId),
        eq(recoveryDrillParticipants.userId, actorUserId),
        inArray(recoveryDrillParticipants.role, allowedRoles)
      )
    )
    .limit(1);
  if (!participant)
    throw new RecoveryDrillError(
      "FORBIDDEN",
      "This recovery role cannot perform the requested action"
    );
}

async function revokeTemporaryAccess(
  executor: DbExecutor,
  actorUserId: number,
  now: number
): Promise<void> {
  await executor
    .update(securityPermissionOverrides)
    .set({ revokedAt: now, revokedByUserId: actorUserId })
    .where(
      and(
        inArray(securityPermissionOverrides.permission, [
          ...RECOVERY_DRILL_APPROVER_PERMISSIONS,
        ]),
        like(securityPermissionOverrides.reason, "staging_recovery_approver:%"),
        isNull(securityPermissionOverrides.revokedAt)
      )
    );
  await executor
    .update(recoveryDrillAssignments)
    .set({ revokedAt: now })
    .where(
      and(
        eq(recoveryDrillAssignments.environment, "staging"),
        isNull(recoveryDrillAssignments.revokedAt)
      )
    );
}

async function writeAudit(input: {
  actorUserId: number;
  eventType: string;
  reasonCode: string;
  drillId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const db = await requireDb();
  await db.insert(securityAuditEvents).values({
    eventType: input.eventType,
    actorType: "human",
    actorUserId: input.actorUserId,
    permission: input.eventType,
    decision: "allow",
    reasonCode: input.reasonCode,
    actionKey: input.eventType,
    resourceType: input.drillId ? "recovery_drill" : undefined,
    resourceId: input.drillId,
    metadataJson: JSON.stringify(input.metadata ?? {}),
    occurredAt: Date.now(),
  });
}

export async function getRecoverySnapshot(
  actorUserId: number,
  req: Request,
  session: SecuritySessionContext | null
) {
  const runtime = getRecoveryRuntime(req);
  const db = await requireDb();
  const platformOwner = await isPlatformOwner(actorUserId);
  const [drill] = await db
    .select()
    .from(recoveryDrills)
    .where(eq(recoveryDrills.environment, "staging"))
    .orderBy(desc(recoveryDrills.createdAt))
    .limit(1);
  const [participant] = drill
    ? await db
        .select({ role: recoveryDrillParticipants.role })
        .from(recoveryDrillParticipants)
        .where(
          and(
            eq(recoveryDrillParticipants.drillId, drill.id),
            eq(recoveryDrillParticipants.userId, actorUserId)
          )
        )
        .limit(1)
    : [];
  let actorRole: RecoveryDrillActorRole = platformOwner
    ? "platform_owner"
    : "none";
  if (
    participant?.role === "recovery_custodian" ||
    participant?.role === "independent_approver" ||
    participant?.role === "observer"
  ) {
    actorRole = participant.role;
  }
  const recentPasskeyA2 = hasRecentPasskeyA2(session);
  if (!platformOwner && actorRole === "none") {
    return {
      runtime,
      authorized: false,
      actorRole,
      recentPasskeyA2,
      drill: null,
      approval: null,
      evidence: [],
      actions: {
        canPrepare: false,
        canApprove: false,
        canStart: false,
        canRecordEvidence: false,
        canContain: false,
        canComplete: false,
        canAbort: false,
      },
    };
  }
  const [approvalRows, evidence] = drill
    ? await Promise.all([
        db
          .select({
            decision: recoveryDrillApprovals.decision,
            note: recoveryDrillApprovals.note,
            createdAt: recoveryDrillApprovals.createdAt,
          })
          .from(recoveryDrillApprovals)
          .where(eq(recoveryDrillApprovals.drillId, drill.id))
          .orderBy(desc(recoveryDrillApprovals.createdAt))
          .limit(1),
        db
          .select({
            id: recoveryDrillEvidence.id,
            evidenceType: recoveryDrillEvidence.evidenceType,
            evidenceReference: recoveryDrillEvidence.evidenceReference,
            outcome: recoveryDrillEvidence.outcome,
            createdAt: recoveryDrillEvidence.createdAt,
          })
          .from(recoveryDrillEvidence)
          .where(eq(recoveryDrillEvidence.drillId, drill.id))
          .orderBy(desc(recoveryDrillEvidence.createdAt)),
      ])
    : [[], []];
  const approval = approvalRows[0] ?? null;
  const terminal = drill
    ? drill.status === "completed" || drill.status === "aborted"
    : true;
  return {
    runtime,
    authorized: true,
    actorRole,
    recentPasskeyA2,
    drill: drill
      ? {
          id: drill.id,
          status: drill.status,
          title: drill.title,
          scheduledAt: drill.scheduledAt,
          notes: drill.notes,
          createdAt: drill.createdAt,
          startedAt: drill.startedAt,
          completedAt: drill.completedAt,
        }
      : null,
    approval,
    evidence,
    actions: {
      canPrepare:
        runtime.enabled && platformOwner && terminal && recentPasskeyA2,
      canApprove:
        runtime.enabled &&
        actorRole === "independent_approver" &&
        drill?.status === "ready" &&
        !approval &&
        recentPasskeyA2,
      canStart:
        runtime.enabled &&
        actorRole === "recovery_custodian" &&
        drill?.status === "ready" &&
        approval?.decision === "approved" &&
        recentPasskeyA2,
      canRecordEvidence:
        runtime.enabled &&
        actorRole === "recovery_custodian" &&
        (drill?.status === "in_progress" || drill?.status === "paused") &&
        recentPasskeyA2,
      canContain:
        runtime.enabled &&
        actorRole === "recovery_custodian" &&
        drill?.status === "in_progress" &&
        recentPasskeyA2,
      canComplete:
        runtime.enabled &&
        actorRole === "recovery_custodian" &&
        drill?.status === "in_progress" &&
        recentPasskeyA2,
      canAbort:
        runtime.enabled &&
        (actorRole === "recovery_custodian" ||
          actorRole === "independent_approver") &&
        Boolean(drill && !terminal) &&
        recentPasskeyA2,
    },
  };
}

export async function prepareRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  title: string;
  scheduledAt: number;
  approverEmail: string;
  notes?: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  await requirePlatformOwner(input.actorUserId);
  const now = Date.now();
  if (
    input.scheduledAt < now + 5 * 60 * 1000 ||
    input.scheduledAt > now + 3 * 60 * 60 * 1000
  )
    throw new RecoveryDrillError(
      "INVALID_INPUT",
      "Schedule the staging drill between 5 minutes and 3 hours from now"
    );
  const title = assertRedactedEvidenceText(input.title, "Title");
  const notes = input.notes
    ? assertRedactedEvidenceText(input.notes, "Notes")
    : undefined;
  const db = await requireDb();
  const [approver] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, input.approverEmail.trim().toLowerCase()))
    .limit(1);
  if (!approver)
    throw new RecoveryDrillError(
      "NOT_FOUND",
      "The independent approver must sign in to Get Phame before assignment"
    );
  assertSeparatedRecoveryRoles(input.actorUserId, approver.id);
  const [custodianPasskeys, approverPasskeys] = await Promise.all([
    activePasskeyCount(input.actorUserId),
    activePasskeyCount(approver.id),
  ]);
  if (custodianPasskeys < 2)
    throw new RecoveryDrillError(
      "INVALID_STATE",
      "The Recovery Custodian must enroll two active passkeys before preparation"
    );
  if (approverPasskeys < 1)
    throw new RecoveryDrillError(
      "INVALID_STATE",
      "The Independent Approver must enroll an active passkey before assignment"
    );
  const [existing] = await db
    .select({ id: recoveryDrills.id })
    .from(recoveryDrills)
    .where(
      and(
        eq(recoveryDrills.environment, "staging"),
        inArray(recoveryDrills.status, [
          "draft",
          "ready",
          "in_progress",
          "paused",
        ])
      )
    )
    .limit(1);
  if (existing)
    throw new RecoveryDrillError(
      "CONFLICT",
      "Close or abort the current staging drill before preparing another"
    );
  const drillId = randomUUID();
  const expiresAt = now + RECOVERY_DRILL_OVERRIDE_MS;
  await db.transaction(async tx => {
    await revokeTemporaryAccess(tx, input.actorUserId, now);
    await tx.insert(recoveryDrillAssignments).values([
      {
        environment: "staging",
        role: "recovery_custodian",
        userId: input.actorUserId,
        displayLabel: "Steve — Recovery Custodian",
        assignedByUserId: input.actorUserId,
        assignedAt: now,
      },
      {
        environment: "staging",
        role: "independent_approver",
        userId: approver.id,
        displayLabel:
          approver.name?.trim() || "Lead Engineer — Independent Approver",
        assignedByUserId: input.actorUserId,
        assignedAt: now,
      },
    ]);
    await tx.insert(recoveryDrills).values({
      id: drillId,
      environment: "staging",
      status: "ready",
      title,
      scheduledAt: input.scheduledAt,
      recoveryCustodianUserId: input.actorUserId,
      independentApproverUserId: approver.id,
      notes,
      createdByUserId: input.actorUserId,
      createdAt: now,
    });
    await tx.insert(recoveryDrillParticipants).values([
      {
        drillId,
        role: "recovery_custodian",
        userId: input.actorUserId,
        assignedByUserId: input.actorUserId,
        assignedAt: now,
      },
      {
        drillId,
        role: "independent_approver",
        userId: approver.id,
        assignedByUserId: input.actorUserId,
        assignedAt: now,
      },
    ]);
    await tx.insert(securityPermissionOverrides).values(
      RECOVERY_DRILL_APPROVER_PERMISSIONS.map(permission => ({
        userId: approver.id,
        permission,
        effect: "allow" as const,
        scopeType: "platform" as const,
        reason: `staging_recovery_approver:${drillId}`,
        grantedByUserId: input.actorUserId,
        grantedAt: now,
        expiresAt,
      }))
    );
    await tx.insert(securityActionApprovals).values({
      id: randomUUID(),
      actionKey: RECOVERY_DRILL_ACTION_KEY,
      requesterUserId: input.actorUserId,
      resourceType: "recovery_drill",
      resourceId: drillId,
      status: "pending",
      requestedAt: now,
      expiresAt,
    });
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.prepared",
    reasonCode: "staging_ready",
    drillId,
    metadata: { expiresAt },
  });
  return {
    drillId,
    status: "ready" as const,
    approverLabel:
      approver.name?.trim() || "Lead Engineer — Independent Approver",
    expiresAt,
  };
}

export async function decideRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
  decision: "approved" | "rejected";
  note: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  if (drill.status !== "ready")
    throw new RecoveryDrillError(
      "INVALID_STATE",
      "Only a ready drill can be approved or rejected"
    );
  await requireDrillRole(drill.id, input.actorUserId, ["approver"]);
  assertSeparatedRecoveryRoles(
    drill.recoveryCustodianUserId,
    input.actorUserId
  );
  const note = assertRedactedEvidenceText(input.note, "Approval note");
  const db = await requireDb();
  const now = Date.now();
  const [override] = await db
    .select({ id: securityPermissionOverrides.id })
    .from(securityPermissionOverrides)
    .where(
      and(
        eq(securityPermissionOverrides.userId, input.actorUserId),
        eq(securityPermissionOverrides.permission, "recovery.drill.approve"),
        eq(securityPermissionOverrides.effect, "allow"),
        eq(securityPermissionOverrides.scopeType, "platform"),
        eq(
          securityPermissionOverrides.reason,
          `staging_recovery_approver:${drill.id}`
        ),
        isNull(securityPermissionOverrides.revokedAt),
        gt(securityPermissionOverrides.expiresAt, now)
      )
    )
    .limit(1);
  if (!override)
    throw new RecoveryDrillError(
      "FORBIDDEN",
      "The narrow approver permission is missing or expired"
    );
  const [prior] = await db
    .select({ id: recoveryDrillApprovals.id })
    .from(recoveryDrillApprovals)
    .where(eq(recoveryDrillApprovals.drillId, drill.id))
    .limit(1);
  if (prior)
    throw new RecoveryDrillError(
      "CONFLICT",
      "This recovery drill already has an independent decision"
    );
  await db.transaction(async tx => {
    await tx.insert(recoveryDrillApprovals).values({
      drillId: drill.id,
      approverUserId: input.actorUserId,
      decision: input.decision,
      note,
      createdAt: now,
    });
    await tx
      .update(securityActionApprovals)
      .set({
        approverUserId: input.actorUserId,
        status: input.decision,
        evidenceReference: `recovery_drill_approval:${drill.id}`,
        decidedAt: now,
      })
      .where(
        and(
          eq(securityActionApprovals.actionKey, RECOVERY_DRILL_ACTION_KEY),
          eq(securityActionApprovals.resourceId, drill.id),
          eq(securityActionApprovals.status, "pending")
        )
      );
    if (input.decision === "rejected") {
      await tx
        .update(recoveryDrills)
        .set({ status: "aborted", completedAt: now })
        .where(eq(recoveryDrills.id, drill.id));
      await revokeTemporaryAccess(tx, input.actorUserId, now);
    }
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: `recovery.drill.${input.decision}`,
    reasonCode: "independent_decision",
    drillId: drill.id,
  });
  return { drillId: drill.id, decision: input.decision };
}

export async function startRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  await requireDrillRole(drill.id, input.actorUserId, ["custodian"]);
  assertRecoveryTransition(drill.status, "in_progress");
  const db = await requireDb();
  const [approval] = await db
    .select({ decision: recoveryDrillApprovals.decision })
    .from(recoveryDrillApprovals)
    .where(
      and(
        eq(recoveryDrillApprovals.drillId, drill.id),
        eq(recoveryDrillApprovals.decision, "approved")
      )
    )
    .limit(1);
  if (!approval)
    throw new RecoveryDrillError(
      "INVALID_STATE",
      "Independent approval is required before starting"
    );
  const now = Date.now();
  await db.transaction(async tx => {
    await tx
      .update(recoveryDrills)
      .set({ status: "in_progress", startedAt: now })
      .where(
        and(eq(recoveryDrills.id, drill.id), eq(recoveryDrills.status, "ready"))
      );
    await tx
      .update(securityActionApprovals)
      .set({ status: "executed", executedAt: now })
      .where(
        and(
          eq(securityActionApprovals.actionKey, RECOVERY_DRILL_ACTION_KEY),
          eq(securityActionApprovals.resourceId, drill.id),
          eq(securityActionApprovals.status, "approved")
        )
      );
    await tx.insert(recoveryDrillEvidence).values({
      drillId: drill.id,
      evidenceType: "preflight",
      evidenceReference: `event:${randomUUID()}`,
      outcome: "passed",
      recordedByUserId: input.actorUserId,
      createdAt: now,
    });
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.started",
    reasonCode: "dual_control_satisfied",
    drillId: drill.id,
  });
  return { drillId: drill.id, status: "in_progress" as const };
}

export async function recordRecoveryEvidence(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
  evidenceType: RecoveryEvidenceType;
  evidenceReference: string;
  outcome: RecoveryEvidenceOutcome;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  await requireDrillRole(drill.id, input.actorUserId, ["custodian"]);
  if (drill.status !== "in_progress" && drill.status !== "paused")
    throw new RecoveryDrillError(
      "INVALID_STATE",
      "Evidence can be recorded only during an active or contained drill"
    );
  const evidenceReference = assertRedactedEvidenceText(
    input.evidenceReference,
    "Evidence reference"
  );
  const db = await requireDb();
  const now = Date.now();
  const [record] = await db
    .insert(recoveryDrillEvidence)
    .values({
      drillId: drill.id,
      evidenceType: input.evidenceType,
      evidenceReference,
      outcome: input.outcome,
      recordedByUserId: input.actorUserId,
      createdAt: now,
    })
    .$returningId();
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.evidence_recorded",
    reasonCode: input.outcome,
    drillId: drill.id,
    metadata: { evidenceType: input.evidenceType },
  });
  return { id: record?.id, createdAt: now };
}

export async function containRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
  reason: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  await requireDrillRole(drill.id, input.actorUserId, ["custodian"]);
  assertRecoveryTransition(drill.status, "paused");
  const reason = assertRedactedEvidenceText(input.reason, "Containment reason");
  const db = await requireDb();
  const now = Date.now();
  await db.transaction(async tx => {
    await tx
      .update(recoveryDrills)
      .set({ status: "paused" })
      .where(eq(recoveryDrills.id, drill.id));
    await tx.insert(recoveryDrillEvidence).values({
      drillId: drill.id,
      evidenceType: "containment",
      evidenceReference: reason,
      outcome: "contained",
      recordedByUserId: input.actorUserId,
      createdAt: now,
    });
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.contained",
    reasonCode: "stop_condition",
    drillId: drill.id,
  });
  return { drillId: drill.id, status: "paused" as const };
}

export async function completeRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  await requireDrillRole(drill.id, input.actorUserId, ["custodian"]);
  assertRecoveryTransition(drill.status, "completed");
  const db = await requireDb();
  const evidence = await db
    .select({
      evidenceType: recoveryDrillEvidence.evidenceType,
      outcome: recoveryDrillEvidence.outcome,
    })
    .from(recoveryDrillEvidence)
    .where(eq(recoveryDrillEvidence.drillId, drill.id));
  const passingTypes = new Set(
    evidence
      .filter(row => row.outcome === "passed" || row.outcome === "contained")
      .map(row => row.evidenceType)
  );
  const missing = REQUIRED_COMPLETION_EVIDENCE.filter(
    type => !passingTypes.has(type)
  );
  if (missing.length > 0)
    throw new RecoveryDrillError(
      "INVALID_STATE",
      `Required passing evidence is missing: ${missing.join(", ")}`
    );
  const now = Date.now();
  await db.transaction(async tx => {
    await tx
      .update(recoveryDrills)
      .set({ status: "completed", completedAt: now })
      .where(eq(recoveryDrills.id, drill.id));
    await revokeTemporaryAccess(tx, input.actorUserId, now);
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.completed",
    reasonCode: "required_evidence_satisfied",
    drillId: drill.id,
  });
  return { drillId: drill.id, status: "completed" as const };
}

export async function abortRecoveryDrill(input: {
  actorUserId: number;
  session: SecuritySessionContext | null;
  req: Request;
  drillId: string;
  reason: string;
}) {
  assertRecoveryRuntime(input.req);
  assertRecentPasskeyA2(input.session);
  const drill = await getDrill(input.drillId);
  await requireDrillRole(drill.id, input.actorUserId, [
    "custodian",
    "approver",
  ]);
  assertRecoveryTransition(drill.status, "aborted");
  const reason = assertRedactedEvidenceText(input.reason, "Abort reason");
  const db = await requireDb();
  const now = Date.now();
  await db.transaction(async tx => {
    await tx
      .update(recoveryDrills)
      .set({ status: "aborted", completedAt: now })
      .where(eq(recoveryDrills.id, drill.id));
    await tx.insert(recoveryDrillEvidence).values({
      drillId: drill.id,
      evidenceType: "stop_condition",
      evidenceReference: reason,
      outcome: "contained",
      recordedByUserId: input.actorUserId,
      createdAt: now,
    });
    await revokeTemporaryAccess(tx, input.actorUserId, now);
  });
  await writeAudit({
    actorUserId: input.actorUserId,
    eventType: "recovery.drill.aborted",
    reasonCode: "stop_condition",
    drillId: drill.id,
  });
  return { drillId: drill.id, status: "aborted" as const };
}
