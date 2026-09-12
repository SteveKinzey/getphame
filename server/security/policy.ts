export const SECURITY_ROLES = [
  "platform_owner",
  "security_administrator",
  "platform_operations_administrator",
  "billing_administrator",
  "support_manager",
  "support_agent",
  "organization_owner",
  "organization_administrator",
  "campaign_operator",
] as const;

export type SecurityRole = (typeof SECURITY_ROLES)[number];
export type SecurityScope =
  | "platform"
  | "organization"
  | "self"
  | "ticket"
  | "service";
export type SecurityAssurance = "a0" | "a1" | "a2";
export type SecurityPolicy = {
  scope: SecurityScope;
  assurance: SecurityAssurance;
  recentWithinMs?: number;
  approvals?: number;
  requiresCustomerConsent?: boolean;
  requiresTicketGrant?: boolean;
};

export const RECENT_STEP_UP_MS = 5 * 60 * 1000;
const a1 = (scope: SecurityScope): SecurityPolicy => ({
  scope,
  assurance: "a1",
});
const recent = (scope: SecurityScope, approvals = 0): SecurityPolicy => ({
  scope,
  assurance: "a2",
  recentWithinMs: RECENT_STEP_UP_MS,
  ...(approvals > 0 ? { approvals } : {}),
});

/** Server-owned catalog. Unknown permissions are always denied. */
export const SECURITY_POLICIES = {
  "profile.self.view": a1("self"),
  "profile.self.edit": a1("self"),
  "org.profile.view": a1("organization"),
  "org.profile.edit": a1("organization"),
  "org.members.view": a1("organization"),
  "org.members.operator.invite": recent("organization"),
  "org.members.operator.remove": recent("organization"),
  "org.roles.admin.manage": recent("organization"),
  "org.owner.transfer": recent("organization", 1),
  "org.delete": recent("organization", 1),
  "contacts.view": a1("organization"),
  "contacts.write": a1("organization"),
  "contacts.delete": recent("organization"),
  "contacts.import": recent("organization"),
  "contacts.export": recent("organization", 1),
  "contacts.bulk_delete": recent("organization", 1),
  "templates.manage": a1("organization"),
  "campaign.send_single": a1("organization"),
  "campaign.start_bulk": recent("organization"),
  "campaign.restart": recent("organization"),
  "campaign.cancel": a1("organization"),
  "reminders.view": a1("organization"),
  "reminders.send_now": recent("organization"),
  "reminders.cancel": a1("organization"),
  "integrations.view": a1("organization"),
  "integrations.manage": recent("organization"),
  "integrations.disconnect": recent("organization"),
  "integrations.secret.rotate": recent("organization"),
  "integrations.webhook.manage": recent("organization", 1),
  "billing.plan.view": a1("organization"),
  "billing.portal.open": recent("organization"),
  "billing.entitlement.correct": recent("platform", 1),
  "billing.refund": recent("platform", 1),
  "billing.subscription.cancel": recent("platform", 1),
  "billing.catalog.manage": recent("platform", 1),
  "support.queue.view": a1("platform"),
  "support.ticket.assign": a1("platform"),
  "support.note.add": a1("ticket"),
  "support.reply.send": a1("ticket"),
  "support.grant.approve": recent("ticket"),
  "support.grant.use": {
    ...recent("ticket"),
    requiresCustomerConsent: true,
    requiresTicketGrant: true,
  },
  "support.grant.extend": recent("ticket"),
  "support.evidence.export": recent("ticket"),
  "auth.factor.bootstrap": a1("self"),
  "auth.factor.list": a1("self"),
  "auth.factor.enroll": recent("self"),
  "auth.factor.rename": recent("self"),
  "auth.factor.delete": recent("self"),
  "auth.session.list": a1("self"),
  "auth.session.revoke_self": recent("self"),
  "auth.session.revoke_other": recent("organization"),
  "auth.factor.disable_other": recent("platform"),
  "auth.factor.recovery.initiate": recent("organization", 1),
  "security.audit.view": a1("organization"),
  "security.audit.export": recent("organization", 1),
  "security.policy.manage": recent("platform", 1),
  "security.break_glass.invoke": recent("platform", 1),
  "platform.users.view": a1("platform"),
  "platform.users.suspend": recent("platform", 1),
  "platform.users.delete": recent("platform", 1),
  "platform.users.merge": recent("platform", 1),
  "platform.roles.owner.manage": recent("platform", 1),
  "platform.roles.security.manage": recent("platform", 1),
  "platform.roles.operational.manage": recent("platform"),
  "platform.health.view": a1("platform"),
  "platform.jobs.operate": recent("platform"),
  "platform.service_identity.manage": recent("platform", 1),
  "platform.service_credential.rotate": recent("platform"),
  "platform.compliance.manage": recent("platform", 1),
  "recovery.drill.view": a1("platform"),
  "recovery.drill.create": recent("platform"),
  "recovery.drill.assign": recent("platform"),
  "recovery.drill.approve": recent("platform"),
  "recovery.drill.start": recent("platform"),
  "recovery.drill.evidence": recent("platform"),
  "recovery.drill.contain": recent("platform"),
  "recovery.drill.complete": recent("platform"),
  "recovery.drill.abort": recent("platform"),
} as const satisfies Record<string, SecurityPolicy>;

export type SecurityPermission = keyof typeof SECURITY_POLICIES;
export const SECURITY_PERMISSIONS = Object.freeze(
  Object.keys(SECURITY_POLICIES) as SecurityPermission[]
);
const selfService: SecurityPermission[] = [
  "profile.self.view",
  "profile.self.edit",
  "auth.factor.bootstrap",
  "auth.factor.list",
  "auth.factor.enroll",
  "auth.factor.rename",
  "auth.factor.delete",
  "auth.session.list",
  "auth.session.revoke_self",
];
const organizationOperations: SecurityPermission[] = [
  "org.profile.view",
  "contacts.view",
  "contacts.write",
  "contacts.delete",
  "contacts.import",
  "templates.manage",
  "campaign.send_single",
  "campaign.start_bulk",
  "campaign.restart",
  "campaign.cancel",
  "reminders.view",
  "reminders.send_now",
  "reminders.cancel",
  "integrations.view",
];
const organizationAdministration: SecurityPermission[] = [
  ...organizationOperations,
  "org.profile.edit",
  "org.members.view",
  "org.members.operator.invite",
  "org.members.operator.remove",
  "contacts.export",
  "integrations.manage",
  "integrations.disconnect",
  "integrations.secret.rotate",
  "integrations.webhook.manage",
  "billing.plan.view",
  "security.audit.view",
  "security.audit.export",
];
const organizationOwnership: SecurityPermission[] = [
  ...organizationAdministration,
  "org.roles.admin.manage",
  "org.owner.transfer",
  "org.delete",
  "contacts.bulk_delete",
  "billing.portal.open",
  "auth.session.revoke_other",
  "auth.factor.recovery.initiate",
];
const securityAdministration: SecurityPermission[] = [
  "security.audit.view",
  "security.audit.export",
  "security.policy.manage",
  "security.break_glass.invoke",
  "auth.session.revoke_other",
  "auth.factor.disable_other",
  "auth.factor.recovery.initiate",
  "platform.users.view",
  "platform.users.suspend",
  "platform.users.delete",
  "platform.users.merge",
  "platform.roles.owner.manage",
  "platform.roles.security.manage",
  "platform.roles.operational.manage",
  "platform.health.view",
  "platform.service_identity.manage",
  "platform.service_credential.rotate",
  "platform.compliance.manage",
  "recovery.drill.view",
  "recovery.drill.approve",
  "recovery.drill.abort",
];

export const ROLE_PERMISSIONS: Readonly<
  Record<SecurityRole, ReadonlySet<SecurityPermission>>
> = {
  platform_owner: new Set<SecurityPermission>(SECURITY_PERMISSIONS),
  security_administrator: new Set<SecurityPermission>([
    ...selfService,
    ...securityAdministration,
  ]),
  platform_operations_administrator: new Set<SecurityPermission>([
    ...selfService,
    "org.profile.view",
    "integrations.view",
    "integrations.disconnect",
    "integrations.secret.rotate",
    "platform.users.view",
    "platform.health.view",
    "platform.jobs.operate",
    "platform.service_identity.manage",
    "platform.service_credential.rotate",
  ]),
  billing_administrator: new Set<SecurityPermission>([
    ...selfService,
    "billing.plan.view",
    "billing.portal.open",
    "billing.entitlement.correct",
    "billing.refund",
    "billing.subscription.cancel",
    "billing.catalog.manage",
    "platform.users.view",
  ]),
  support_manager: new Set<SecurityPermission>([
    ...selfService,
    "support.queue.view",
    "support.ticket.assign",
    "support.note.add",
    "support.reply.send",
    "support.grant.approve",
    "support.grant.use",
    "support.grant.extend",
    "support.evidence.export",
    "platform.health.view",
  ]),
  support_agent: new Set<SecurityPermission>([
    ...selfService,
    "support.queue.view",
    "support.note.add",
    "support.reply.send",
    "support.grant.use",
  ]),
  organization_owner: new Set<SecurityPermission>([
    ...selfService,
    ...organizationOwnership,
  ]),
  organization_administrator: new Set<SecurityPermission>([
    ...selfService,
    ...organizationAdministration,
  ]),
  campaign_operator: new Set<SecurityPermission>([
    ...selfService,
    ...organizationOperations,
  ]),
};

export type EvaluatedRoleGrant = {
  role: SecurityRole;
  scope: SecurityScope;
  organizationId: number | null;
};
export type EvaluatedPermissionOverride = {
  permission: string;
  effect: "allow" | "deny";
  scope: SecurityScope;
  organizationId: number | null;
};
export type AuthorizationEvidence = {
  authenticated: boolean;
  actorUserId: number | null;
  targetUserId: number | null;
  organizationId: number | null;
  assurance: SecurityAssurance;
  recentAuthenticationAt: number | null;
  roleGrants: EvaluatedRoleGrant[];
  permissionOverrides: EvaluatedPermissionOverride[];
  independentApproverUserIds: number[];
  customerConsent: boolean;
  ticketGrantActive: boolean;
  now: number;
};
export type AuthorizationDecision = {
  allowed: boolean;
  reasonCode:
    | "allowed"
    | "unknown_permission"
    | "unauthenticated"
    | "explicit_deny"
    | "missing_scope"
    | "scope_mismatch"
    | "missing_permission"
    | "insufficient_assurance"
    | "stale_step_up"
    | "missing_independent_approval"
    | "self_approval"
    | "missing_customer_consent"
    | "missing_ticket_grant";
};

const assuranceRank: Record<SecurityAssurance, number> = {
  a0: 0,
  a1: 1,
  a2: 2,
};
function scopeMatches(
  policy: SecurityPolicy,
  scope: SecurityScope,
  grantOrganizationId: number | null,
  evidence: AuthorizationEvidence
) {
  if (policy.scope === "self")
    return (
      scope === "self" &&
      evidence.actorUserId !== null &&
      evidence.actorUserId === evidence.targetUserId
    );
  if (policy.scope === "organization")
    return (
      evidence.organizationId !== null &&
      (scope === "platform" ||
        (scope === "organization" &&
          grantOrganizationId === evidence.organizationId))
    );
  if (policy.scope === "platform") return scope === "platform";
  if (policy.scope === "ticket")
    return scope === "platform" || scope === "ticket";
  return scope === policy.scope;
}

/** Pure, deterministic, deny-by-default policy evaluation. */
export function evaluateAuthorization(
  permission: string,
  evidence: AuthorizationEvidence
): AuthorizationDecision {
  const policy = SECURITY_POLICIES[permission as SecurityPermission] as
    | SecurityPolicy
    | undefined;
  if (!policy) return { allowed: false, reasonCode: "unknown_permission" };
  if (!evidence.authenticated || evidence.actorUserId === null)
    return { allowed: false, reasonCode: "unauthenticated" };
  if (
    (policy.scope === "organization" && evidence.organizationId === null) ||
    (policy.scope === "self" && evidence.targetUserId === null)
  )
    return { allowed: false, reasonCode: "missing_scope" };
  const matchingOverrides = evidence.permissionOverrides.filter(
    override =>
      override.permission === permission &&
      scopeMatches(policy, override.scope, override.organizationId, evidence)
  );
  if (matchingOverrides.some(override => override.effect === "deny"))
    return { allowed: false, reasonCode: "explicit_deny" };
  const allowedByOverride = matchingOverrides.some(
    override => override.effect === "allow"
  );
  const permissionRoles = evidence.roleGrants.filter(grant =>
    ROLE_PERMISSIONS[grant.role].has(permission as SecurityPermission)
  );
  const allowedByRole = permissionRoles.some(grant =>
    scopeMatches(policy, grant.scope, grant.organizationId, evidence)
  );
  if (!allowedByOverride && !allowedByRole)
    return {
      allowed: false,
      reasonCode:
        permissionRoles.length > 0 ? "scope_mismatch" : "missing_permission",
    };
  if (assuranceRank[evidence.assurance] < assuranceRank[policy.assurance])
    return { allowed: false, reasonCode: "insufficient_assurance" };
  if (
    policy.recentWithinMs !== undefined &&
    (evidence.recentAuthenticationAt === null ||
      evidence.now - evidence.recentAuthenticationAt > policy.recentWithinMs)
  )
    return { allowed: false, reasonCode: "stale_step_up" };
  if (policy.approvals && policy.approvals > 0) {
    if (evidence.independentApproverUserIds.includes(evidence.actorUserId))
      return { allowed: false, reasonCode: "self_approval" };
    if (
      new Set(
        evidence.independentApproverUserIds.filter(
          userId => userId !== evidence.actorUserId
        )
      ).size < policy.approvals
    )
      return { allowed: false, reasonCode: "missing_independent_approval" };
  }
  if (policy.requiresCustomerConsent && !evidence.customerConsent)
    return { allowed: false, reasonCode: "missing_customer_consent" };
  if (policy.requiresTicketGrant && !evidence.ticketGrantActive)
    return { allowed: false, reasonCode: "missing_ticket_grant" };
  return { allowed: true, reasonCode: "allowed" };
}
