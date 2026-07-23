import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { businessProfiles, securityActionApprovals, securityAuditEvents, securityPermissionOverrides, securityRoleGrants } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { SECURITY_POLICIES, SECURITY_ROLES, evaluateAuthorization, type AuthorizationDecision, type AuthorizationEvidence, type SecurityAssurance, type SecurityPermission, type SecurityRole, type SecurityScope } from "./policy";

export type SecurityRolloutMode = "disabled" | "observe" | "enforce";
export type AuthorizationRequestOptions = {
  organizationId?: number | null; targetUserId?: number | null; actionKey?: string; actionId?: string;
  customerConsent?: boolean; ticketGrantActive?: boolean; eventType?: string;
  auditMetadata?: Record<string, string | number | boolean | null>;
};
export type RequestAuthorizationResult = { decision: AuthorizationDecision; mode: SecurityRolloutMode; correlationId: string; evidence: AuthorizationEvidence };
const roleSet = new Set<string>(SECURITY_ROLES);
const scopeSet = new Set<SecurityScope>(["platform", "organization", "self", "ticket", "service"]);
const isSecurityRole = (value: string): value is SecurityRole => roleSet.has(value);
const isSecurityScope = (value: string): value is SecurityScope => scopeSet.has(value as SecurityScope);

export function getSecurityRolloutMode(): SecurityRolloutMode {
  const value = process.env.ZERO_TRUST_ROLLOUT_MODE?.trim().toLowerCase();
  return value === "disabled" || value === "enforce" ? value : "observe";
}
async function resolveDefaultOrganizationId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select({ id: businessProfiles.id }).from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  return profile?.id ?? null;
}
async function writeDecisionAudit(input: { actorUserId: number | null; targetUserId: number | null; organizationId: number | null; permission: string; eventType: string; decision: AuthorizationDecision; mode: SecurityRolloutMode; correlationId: string; metadata?: Record<string, string | number | boolean | null> }) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(securityAuditEvents).values({
      eventType: input.eventType, actorType: "human", actorUserId: input.actorUserId,
      organizationId: input.organizationId, permission: input.permission,
      decision: input.decision.allowed ? "allow" : "deny", reasonCode: input.decision.reasonCode,
      actionKey: input.eventType,
      metadataJson: JSON.stringify({ correlationId: input.correlationId, rolloutMode: input.mode, targetUserId: input.targetUserId, ...(input.metadata ?? {}) }),
      occurredAt: Date.now(),
    });
  } catch (error) {
    console.error("[SecurityAudit] Authorization decision persistence failed", { correlationId: input.correlationId, reason: error instanceof Error ? error.message : "unknown_error" });
  }
}

export async function authorizeRequest(ctx: TrpcContext, permission: SecurityPermission, options: AuthorizationRequestOptions = {}): Promise<RequestAuthorizationResult> {
  const now = Date.now();
  const mode = getSecurityRolloutMode();
  const correlationId = randomUUID();
  const actorUserId = ctx.user?.id ?? null;
  const policy = SECURITY_POLICIES[permission] as { scope: SecurityScope };
  const organizationId = options.organizationId ?? (actorUserId !== null && policy.scope === "organization" ? await resolveDefaultOrganizationId(actorUserId) : null);
  const targetUserId = options.targetUserId ?? (policy.scope === "self" ? actorUserId : null);
  const evidence: AuthorizationEvidence = {
    authenticated: actorUserId !== null, actorUserId, targetUserId, organizationId,
    assurance: (ctx.securitySession?.assurance ?? (actorUserId !== null ? "a1" : "a0")) as SecurityAssurance,
    recentAuthenticationAt: ctx.securitySession?.recentAuthenticationAt ?? null,
    roleGrants: [], permissionOverrides: [], independentApproverUserIds: [],
    customerConsent: options.customerConsent === true, ticketGrantActive: options.ticketGrantActive === true, now,
  };
  const db = await getDb();
  if (db && actorUserId !== null) {
    const [grants, overrides] = await Promise.all([
      db.select({ role: securityRoleGrants.role, scope: securityRoleGrants.scopeType, organizationId: securityRoleGrants.organizationId }).from(securityRoleGrants).where(and(eq(securityRoleGrants.userId, actorUserId), isNull(securityRoleGrants.revokedAt), or(isNull(securityRoleGrants.expiresAt), gt(securityRoleGrants.expiresAt, now)))),
      db.select({ permission: securityPermissionOverrides.permission, effect: securityPermissionOverrides.effect, scope: securityPermissionOverrides.scopeType, organizationId: securityPermissionOverrides.organizationId }).from(securityPermissionOverrides).where(and(eq(securityPermissionOverrides.userId, actorUserId), eq(securityPermissionOverrides.permission, permission), isNull(securityPermissionOverrides.revokedAt), or(isNull(securityPermissionOverrides.expiresAt), gt(securityPermissionOverrides.expiresAt, now)))),
    ]);
    evidence.roleGrants = grants.flatMap(grant => isSecurityRole(grant.role) && isSecurityScope(grant.scope) ? [{ role: grant.role, scope: grant.scope, organizationId: grant.organizationId }] : []);
    evidence.permissionOverrides = overrides.flatMap(override => isSecurityScope(override.scope) && (override.effect === "allow" || override.effect === "deny") ? [{ permission: override.permission, effect: override.effect, scope: override.scope, organizationId: override.organizationId }] : []);
    if (options.actionKey && options.actionId) {
      const approvals = await db.select({ approverUserId: securityActionApprovals.approverUserId }).from(securityActionApprovals).where(and(eq(securityActionApprovals.actionKey, options.actionKey), eq(securityActionApprovals.resourceId, options.actionId), eq(securityActionApprovals.status, "approved")));
      evidence.independentApproverUserIds = approvals.flatMap(row => row.approverUserId === null ? [] : [row.approverUserId]);
    }
  }
  const decision = evaluateAuthorization(permission, evidence);
  await writeDecisionAudit({ actorUserId, targetUserId, organizationId, permission, eventType: options.eventType ?? "authorization.decision", decision, mode, correlationId, metadata: options.auditMetadata });
  return { decision, mode, correlationId, evidence };
}
