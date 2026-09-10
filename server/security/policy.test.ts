import { describe, expect, it } from "vitest";
import { evaluateAuthorization, type AuthorizationEvidence } from "./policy";

const now = 1_800_000_000_000;
const baseEvidence = (
  overrides: Partial<AuthorizationEvidence> = {}
): AuthorizationEvidence => ({
  authenticated: true,
  actorUserId: 7,
  targetUserId: 7,
  organizationId: 42,
  assurance: "a2",
  recentAuthenticationAt: now,
  roleGrants: [
    { role: "organization_owner", scope: "organization", organizationId: 42 },
  ],
  permissionOverrides: [],
  independentApproverUserIds: [],
  customerConsent: false,
  ticketGrantActive: false,
  now,
  ...overrides,
});

describe("evaluateAuthorization", () => {
  it("denies unknown permissions", () => {
    expect(
      evaluateAuthorization("invented.permission", baseEvidence())
    ).toEqual({
      allowed: false,
      reasonCode: "unknown_permission",
    });
  });

  it("denies unauthenticated requests", () => {
    expect(
      evaluateAuthorization(
        "profile.self.view",
        baseEvidence({ authenticated: false, actorUserId: null })
      )
    ).toMatchObject({
      allowed: false,
      reasonCode: "unauthenticated",
    });
  });

  it("lets an explicit denial override an otherwise valid role grant", () => {
    expect(
      evaluateAuthorization(
        "contacts.view",
        baseEvidence({
          permissionOverrides: [
            {
              permission: "contacts.view",
              effect: "deny",
              scope: "organization",
              organizationId: 42,
            },
          ],
        })
      )
    ).toMatchObject({ allowed: false, reasonCode: "explicit_deny" });
  });

  it("rejects a role grant from a different organization", () => {
    expect(
      evaluateAuthorization(
        "contacts.view",
        baseEvidence({
          roleGrants: [
            {
              role: "organization_owner",
              scope: "organization",
              organizationId: 99,
            },
          ],
        })
      )
    ).toMatchObject({ allowed: false, reasonCode: "scope_mismatch" });
  });

  it("requires recent A2 authentication for sensitive actions", () => {
    expect(
      evaluateAuthorization(
        "contacts.delete",
        baseEvidence({
          recentAuthenticationAt: now - 5 * 60 * 1000 - 1,
        })
      )
    ).toMatchObject({ allowed: false, reasonCode: "stale_step_up" });
  });

  it("requires an independent approver for dual-control actions", () => {
    expect(evaluateAuthorization("org.delete", baseEvidence())).toMatchObject({
      allowed: false,
      reasonCode: "missing_independent_approval",
    });
    expect(
      evaluateAuthorization(
        "org.delete",
        baseEvidence({ independentApproverUserIds: [11] })
      )
    ).toMatchObject({
      allowed: true,
      reasonCode: "allowed",
    });
  });

  it("requires both customer consent and an active ticket grant for support access", () => {
    const supportEvidence = baseEvidence({
      roleGrants: [
        { role: "support_agent", scope: "platform", organizationId: null },
      ],
    });
    expect(
      evaluateAuthorization("support.grant.use", supportEvidence)
    ).toMatchObject({
      allowed: false,
      reasonCode: "missing_customer_consent",
    });
    expect(
      evaluateAuthorization("support.grant.use", {
        ...supportEvidence,
        customerConsent: true,
        ticketGrantActive: true,
      })
    ).toMatchObject({ allowed: true, reasonCode: "allowed" });
  });

  it("allows the configured platform owner to perform a platform-scoped health check", () => {
    expect(
      evaluateAuthorization(
        "platform.health.view",
        baseEvidence({
          organizationId: null,
          roleGrants: [
            { role: "platform_owner", scope: "platform", organizationId: null },
          ],
        })
      )
    ).toMatchObject({ allowed: true, reasonCode: "allowed" });
  });

  it("honors a narrowly scoped explicit grant without widening organization scope", () => {
    const grant = {
      permission: "contacts.view",
      effect: "allow" as const,
      scope: "organization" as const,
      organizationId: 42,
    };
    expect(
      evaluateAuthorization(
        "contacts.view",
        baseEvidence({ roleGrants: [], permissionOverrides: [grant] })
      )
    ).toMatchObject({
      allowed: true,
      reasonCode: "allowed",
    });
    expect(
      evaluateAuthorization(
        "contacts.view",
        baseEvidence({
          organizationId: 99,
          roleGrants: [],
          permissionOverrides: [grant],
        })
      )
    ).toMatchObject({ allowed: false, reasonCode: "missing_permission" });
  });
});
