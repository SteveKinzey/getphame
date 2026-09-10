import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SecuritySessionContext } from "../_core/context";
import {
  RECOVERY_DRILL_APPROVER_PERMISSIONS,
  RECOVERY_DRILL_OVERRIDE_MS,
  RecoveryDrillError,
  assertRecoveryTransition,
  assertRedactedEvidenceText,
  assertSeparatedRecoveryRoles,
  evaluateRecoveryRuntime,
  hasRecentPasskeyA2,
} from "./recoveryDrillPolicy";
import { RECENT_STEP_UP_MS, ROLE_PERMISSIONS } from "./policy";

const stagingHost = "3000-staging-example.manus.computer";

describe("staging recovery runtime", () => {
  it("defaults to disabled and denies non-allowlisted hosts", () => {
    expect(evaluateRecoveryRuntime({ requestHost: stagingHost })).toMatchObject(
      { enabled: false, reason: "mode_disabled" }
    );
    expect(
      evaluateRecoveryRuntime({ mode: "staging", requestHost: stagingHost })
    ).toMatchObject({ enabled: false, reason: "host_not_allowed" });
  });

  it("enables only an exact explicitly allowlisted staging host", () => {
    expect(
      evaluateRecoveryRuntime({
        mode: "staging",
        allowedHosts: stagingHost,
        requestHost: `${stagingHost}:443`,
      })
    ).toEqual({ enabled: true, reason: "enabled", host: stagingHost });
  });

  it.each([
    "getphame.app",
    "www.getphame.app",
    "getphame.manus.space",
    "revrocket-j5ynazte.manus.space",
  ])(
    "blocks the published production host %s even if it is allowlisted",
    host => {
      expect(
        evaluateRecoveryRuntime({
          mode: "staging",
          allowedHosts: host,
          requestHost: host,
        })
      ).toEqual({ enabled: false, reason: "production_host_blocked", host });
    }
  );
});

describe("staging recovery assurance and duties", () => {
  const now = 2_000_000_000_000;
  const session = (
    overrides: Partial<SecuritySessionContext> = {}
  ): SecuritySessionContext => ({
    id: "session-1",
    method: "passkey",
    assurance: "a2",
    recentAuthenticationAt: now - 1_000,
    ...overrides,
  });

  it("requires a recent A2 passkey session for every sensitive recovery mutation", () => {
    expect(hasRecentPasskeyA2(session(), now)).toBe(true);
    expect(hasRecentPasskeyA2(session({ method: "magic_link" }), now)).toBe(
      false
    );
    expect(hasRecentPasskeyA2(session({ assurance: "a1" }), now)).toBe(false);
    expect(
      hasRecentPasskeyA2(
        session({ recentAuthenticationAt: now - RECENT_STEP_UP_MS - 1 }),
        now
      )
    ).toBe(false);
    expect(hasRecentPasskeyA2(null, now)).toBe(false);
  });

  it("rejects the same user as custodian and approver", () => {
    expect(() => assertSeparatedRecoveryRoles(7, 8)).not.toThrow();
    expect(() => assertSeparatedRecoveryRoles(7, 7)).toThrowError(
      RecoveryDrillError
    );
  });

  it("keeps the approver grant narrow and time-bounded", () => {
    expect(RECOVERY_DRILL_APPROVER_PERMISSIONS).toEqual([
      "recovery.drill.view",
      "recovery.drill.approve",
    ]);
    expect(RECOVERY_DRILL_OVERRIDE_MS).toBe(4 * 60 * 60 * 1000);
    const securityAdminPermissions = ROLE_PERMISSIONS.security_administrator;
    expect(securityAdminPermissions.has("recovery.drill.view")).toBe(true);
    expect(securityAdminPermissions.has("recovery.drill.approve")).toBe(true);
    expect(securityAdminPermissions.has("recovery.drill.create")).toBe(false);
    expect(securityAdminPermissions.has("recovery.drill.start")).toBe(false);
    expect(securityAdminPermissions.has("recovery.drill.complete")).toBe(false);
  });
});

describe("staging recovery lifecycle and evidence", () => {
  it("permits only the explicit lifecycle transitions", () => {
    expect(() => assertRecoveryTransition("draft", "ready")).not.toThrow();
    expect(() =>
      assertRecoveryTransition("ready", "in_progress")
    ).not.toThrow();
    expect(() =>
      assertRecoveryTransition("in_progress", "paused")
    ).not.toThrow();
    expect(() =>
      assertRecoveryTransition("in_progress", "completed")
    ).not.toThrow();
    expect(() => assertRecoveryTransition("ready", "completed")).toThrowError(
      RecoveryDrillError
    );
    expect(() =>
      assertRecoveryTransition("completed", "in_progress")
    ).toThrowError(RecoveryDrillError);
  });

  it("accepts redacted references and rejects likely secrets or personal identifiers", () => {
    expect(
      assertRedactedEvidenceText("audit:event-7f2b", "Evidence reference")
    ).toBe("audit:event-7f2b");
    expect(() =>
      assertRedactedEvidenceText("owner@example.com", "Evidence reference")
    ).toThrowError(RecoveryDrillError);
    expect(() =>
      assertRedactedEvidenceText("token=abc123", "Evidence reference")
    ).toThrowError(RecoveryDrillError);
    expect(() =>
      assertRedactedEvidenceText("sk_live_123456789", "Evidence reference")
    ).toThrowError(RecoveryDrillError);
  });

  it("ships TiDB-enforced participant uniqueness for separated recovery duties", () => {
    const migration = readFileSync(
      new URL("../../drizzle/0029_amazing_toad.sql", import.meta.url),
      "utf8"
    );
    expect(migration).toContain("CREATE TABLE `recovery_drill_participants`");
    expect(migration).toContain(
      "CONSTRAINT `recovery_participants_drill_role_unique` UNIQUE(`drill_id`,`role`)"
    );
    expect(migration).toContain(
      "CONSTRAINT `recovery_participants_drill_user_unique` UNIQUE(`drill_id`,`user_id`)"
    );
  });
});
