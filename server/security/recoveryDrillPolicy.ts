import type { SecuritySessionContext } from "../_core/context";
import { RECENT_STEP_UP_MS } from "./policy";

export const RECOVERY_DRILL_OVERRIDE_MS = 4 * 60 * 60 * 1000;
export const RECOVERY_DRILL_ACTION_KEY = "recovery.drill.start";
export const RECOVERY_DRILL_APPROVER_PERMISSIONS = [
  "recovery.drill.view",
  "recovery.drill.approve",
] as const;
export const RECOVERY_EVIDENCE_TYPES = [
  "preflight",
  "containment",
  "revoked_session_denial",
  "revoked_credential_denial",
  "tenant_isolation",
  "replacement_enrollment",
  "step_up_verification",
  "audit_verification",
  "rollback",
  "stop_condition",
  "after_action",
] as const;
export const RECOVERY_EVIDENCE_OUTCOMES = [
  "passed",
  "failed",
  "blocked",
  "observed",
  "contained",
  "rolled_back",
] as const;
export const REQUIRED_COMPLETION_EVIDENCE = [
  "containment",
  "revoked_session_denial",
  "revoked_credential_denial",
  "tenant_isolation",
  "replacement_enrollment",
  "step_up_verification",
  "audit_verification",
] as const;

export type RecoveryEvidenceType = (typeof RECOVERY_EVIDENCE_TYPES)[number];
export type RecoveryEvidenceOutcome =
  (typeof RECOVERY_EVIDENCE_OUTCOMES)[number];
export type RecoveryDrillStatus =
  | "draft"
  | "ready"
  | "in_progress"
  | "paused"
  | "completed"
  | "aborted";
export type RecoveryDrillActorRole =
  | "recovery_custodian"
  | "independent_approver"
  | "observer"
  | "platform_owner"
  | "none";
export type RecoveryRuntimeReason =
  | "enabled"
  | "mode_disabled"
  | "host_missing"
  | "host_not_allowed"
  | "production_host_blocked";

export class RecoveryDrillError extends Error {
  constructor(
    public readonly code:
      | "NOT_AVAILABLE"
      | "FORBIDDEN"
      | "A2_REQUIRED"
      | "INVALID_STATE"
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "RecoveryDrillError";
  }
}

const productionHosts = new Set([
  "getphame.app",
  "www.getphame.app",
  "getphame.manus.space",
  "revrocket-j5ynazte.manus.space",
]);

const transitions: Readonly<
  Record<RecoveryDrillStatus, ReadonlySet<RecoveryDrillStatus>>
> = {
  draft: new Set<RecoveryDrillStatus>(["ready", "aborted"]),
  ready: new Set<RecoveryDrillStatus>(["in_progress", "aborted"]),
  in_progress: new Set<RecoveryDrillStatus>(["paused", "completed", "aborted"]),
  paused: new Set<RecoveryDrillStatus>(["in_progress", "aborted"]),
  completed: new Set<RecoveryDrillStatus>(),
  aborted: new Set<RecoveryDrillStatus>(),
};

function normalizeHost(rawHost: string | undefined): string {
  return (
    (rawHost ?? "").split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ??
    ""
  );
}

export function evaluateRecoveryRuntime(input: {
  mode?: string;
  allowedHosts?: string;
  requestHost?: string;
}) {
  const host = normalizeHost(input.requestHost);
  if (input.mode?.trim().toLowerCase() !== "staging")
    return { enabled: false, reason: "mode_disabled" as const, host };
  if (!host) return { enabled: false, reason: "host_missing" as const, host };
  if (productionHosts.has(host))
    return { enabled: false, reason: "production_host_blocked" as const, host };
  const allowedHosts = new Set(
    (input.allowedHosts ?? "").split(",").map(normalizeHost).filter(Boolean)
  );
  if (!allowedHosts.has(host))
    return { enabled: false, reason: "host_not_allowed" as const, host };
  return { enabled: true, reason: "enabled" as const, host };
}

export function hasRecentPasskeyA2(
  session: SecuritySessionContext | null,
  now = Date.now()
): boolean {
  return Boolean(
    session &&
      session.method === "passkey" &&
      session.assurance === "a2" &&
      session.recentAuthenticationAt !== null &&
      session.recentAuthenticationAt <= now &&
      now - session.recentAuthenticationAt <= RECENT_STEP_UP_MS
  );
}

export function assertRecentPasskeyA2(
  session: SecuritySessionContext | null,
  now = Date.now()
): void {
  if (!hasRecentPasskeyA2(session, now)) {
    throw new RecoveryDrillError(
      "A2_REQUIRED",
      "A recent passkey sign-in is required for this recovery action"
    );
  }
}

export function assertSeparatedRecoveryRoles(
  custodianUserId: number,
  approverUserId: number
): void {
  if (custodianUserId === approverUserId) {
    throw new RecoveryDrillError(
      "INVALID_INPUT",
      "Recovery custodian and independent approver must be different users"
    );
  }
}

export function assertRecoveryTransition(
  from: RecoveryDrillStatus | string,
  to: RecoveryDrillStatus
): void {
  const allowedTransitions = transitions[from as RecoveryDrillStatus];
  if (!allowedTransitions || !allowedTransitions.has(to)) {
    throw new RecoveryDrillError(
      "INVALID_STATE",
      `Recovery drill cannot transition from ${from} to ${to}`
    );
  }
}

const prohibitedEvidencePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/i,
  /\b(?:token|secret|password|cookie|credential|challenge|private[_ -]?key)\s*[:=]/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b[A-Fa-f0-9]{64,}\b/,
];

export function assertRedactedEvidenceText(
  value: string,
  fieldName: string
): string {
  const normalized = value.trim();
  if (!normalized)
    throw new RecoveryDrillError("INVALID_INPUT", `${fieldName} is required`);
  if (prohibitedEvidencePatterns.some(pattern => pattern.test(normalized))) {
    throw new RecoveryDrillError(
      "INVALID_INPUT",
      `${fieldName} may contain a secret or personal identifier`
    );
  }
  return normalized;
}
