import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { InsertSecurityAuditReport } from "../drizzle/schema";

export const SECURITY_AUDIT_REPOSITORY = "SteveKinzey/getphame";
export const SECURITY_AUDIT_REPOSITORY_ID = "1200140517";
export const SECURITY_AUDIT_OWNER_ID = "4842067";
export const SECURITY_AUDIT_AUDIENCE =
  "https://getphame.app/api/security-audits";
export const SECURITY_AUDIT_PATH = "/api/security-audits";
export const SECURITY_AUDIT_REPORT_RETENTION_MS = 400 * 24 * 60 * 60 * 1000;
export const SECURITY_AUDIT_REPORT_MAX_AGE_MS = 10 * 60 * 1000;
export const SECURITY_AUDIT_HISTORY_MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

const githubJwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks")
);

const positiveIntegerString = z.string().regex(/^\d+$/);
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/i);

const securityAuditOidcClaimsSchema = z.object({
  actor: z.string().min(1).max(255),
  event_name: z.string().min(1).max(64),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  jti: z.string().min(8).max(255),
  nbf: z.number().int().nonnegative().optional(),
  ref: z.string().min(1).max(255),
  repository: z.literal(SECURITY_AUDIT_REPOSITORY),
  repository_id: z.literal(SECURITY_AUDIT_REPOSITORY_ID),
  repository_owner_id: z.literal(SECURITY_AUDIT_OWNER_ID),
  run_attempt: positiveIntegerString,
  run_id: positiveIntegerString,
  run_number: positiveIntegerString,
  sub: z.string().min(1).max(512),
  workflow: z.string().min(1).max(255),
  workflow_ref: z.string().min(1).max(512),
  workflow_sha: shaSchema,
  base_ref: z.string().max(255).optional(),
  head_ref: z.string().max(255).optional(),
});

export type SecurityAuditOidcClaims = z.infer<
  typeof securityAuditOidcClaimsSchema
>;

const severitySummarySchema = z.object({
  info: z.number().int().min(0).max(1_000_000),
  low: z.number().int().min(0).max(1_000_000),
  moderate: z.number().int().min(0).max(1_000_000),
  high: z.number().int().min(0).max(1_000_000),
  critical: z.number().int().min(0).max(1_000_000),
  dependencyCount: z.number().int().min(0).max(1_000_000),
});

const validationStatusSchema = z.enum(["passed", "failed", "not_run"]);

export const securityAuditEventBodySchema = z
  .object({
    outcome: z.enum(["clean", "attention", "failed"]),
    eventAt: z.number().int().nonnegative(),
    durationMs: z
      .number()
      .int()
      .nonnegative()
      .max(24 * 60 * 60 * 1000)
      .optional(),
    production: severitySummarySchema,
    full: severitySummarySchema,
    updatedPackageCount: z.number().int().min(0).max(1_000),
    testStatus: validationStatusSchema,
    buildStatus: validationStatusSchema,
    failureCode: z
      .enum([
        "audit_execution_failed",
        "audit_output_invalid",
        "test_failed",
        "build_failed",
        "workflow_cancelled",
        "workflow_timed_out",
      ])
      .optional(),
    failureSummary: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const fullVulnerabilities =
      value.full.info +
      value.full.low +
      value.full.moderate +
      value.full.high +
      value.full.critical;
    const hasFailureDetails = Boolean(
      value.failureCode || value.failureSummary
    );
    const severityNames = [
      "info",
      "low",
      "moderate",
      "high",
      "critical",
    ] as const;
    for (const severity of severityNames) {
      if (value.production[severity] > value.full[severity]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["production", severity],
          message:
            "Production severity counts cannot exceed full audit counts.",
        });
      }
    }
    if (value.production.dependencyCount > value.full.dependencyCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["production", "dependencyCount"],
        message: "Production dependency count cannot exceed full audit count.",
      });
    }

    if (value.outcome === "clean") {
      if (fullVulnerabilities !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["full"],
          message:
            "Clean audit reports must have zero reported vulnerabilities.",
        });
      }
      if (value.testStatus !== "passed") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["testStatus"],
          message: "Clean audit reports require passing tests.",
        });
      }
      if (hasFailureDetails) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Clean audit reports cannot include failure details.",
        });
      }
    }

    if (value.outcome === "failed") {
      if (!value.failureCode || !value.failureSummary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Failed audit reports require bounded failure details.",
        });
      }
    } else if (hasFailureDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only failed audit reports may include failure details.",
      });
    }
  });

export type SecurityAuditEventBody = z.infer<
  typeof securityAuditEventBodySchema
>;
export type SecurityAuditOutcome = SecurityAuditEventBody["outcome"];

export async function verifySecurityAuditOidcToken(
  token: string,
  nowMs = Date.now()
): Promise<SecurityAuditOidcClaims> {
  const { payload } = await jwtVerify(token, githubJwks, {
    issuer: "https://token.actions.githubusercontent.com",
    audience: SECURITY_AUDIT_AUDIENCE,
    algorithms: ["RS256"],
    clockTolerance: 30,
  });
  const claims = securityAuditOidcClaimsSchema.parse(payload);
  if (nowMs - claims.iat * 1000 > SECURITY_AUDIT_REPORT_MAX_AGE_MS) {
    throw new Error("The GitHub OIDC token is too old.");
  }
  return claims;
}

function requireSecurityAuditIdentity(claims: SecurityAuditOidcClaims): void {
  const expectedWorkflowRef = `${SECURITY_AUDIT_REPOSITORY}/.github/workflows/monthly-dependency-security-audit.yml@refs/heads/main`;
  if (
    claims.workflow !== "Monthly Dependency Security Audit" ||
    claims.workflow_ref !== expectedWorkflowRef ||
    claims.ref !== "refs/heads/main" ||
    !["schedule", "workflow_dispatch"].includes(claims.event_name) ||
    claims.sub !== `repo:${SECURITY_AUDIT_REPOSITORY}:ref:refs/heads/main`
  ) {
    throw new Error(
      "The GitHub OIDC workflow identity is not allowed for security audit reports."
    );
  }
}

export function buildSecurityAuditReportInsert(input: {
  body: SecurityAuditEventBody;
  claims: SecurityAuditOidcClaims;
  receivedAt: number;
}): InsertSecurityAuditReport {
  const { body, claims, receivedAt } = input;
  if (Math.abs(receivedAt - body.eventAt) > SECURITY_AUDIT_REPORT_MAX_AGE_MS) {
    throw new Error(
      "The security audit report timestamp is outside the accepted freshness window."
    );
  }
  requireSecurityAuditIdentity(claims);

  return {
    eventKey: `dependency_audit:${claims.run_id}:${claims.run_attempt}`,
    oidcJtiHash: createHash("sha256").update(claims.jti).digest("hex"),
    outcome: body.outcome,
    productionInfoCount: body.production.info,
    productionLowCount: body.production.low,
    productionModerateCount: body.production.moderate,
    productionHighCount: body.production.high,
    productionCriticalCount: body.production.critical,
    fullInfoCount: body.full.info,
    fullLowCount: body.full.low,
    fullModerateCount: body.full.moderate,
    fullHighCount: body.full.high,
    fullCriticalCount: body.full.critical,
    productionDependencyCount: body.production.dependencyCount,
    fullDependencyCount: body.full.dependencyCount,
    updatedPackageCount: body.updatedPackageCount,
    testStatus: body.testStatus,
    buildStatus: body.buildStatus,
    failureCode: body.outcome === "failed" ? (body.failureCode ?? null) : null,
    failureSummary:
      body.outcome === "failed" ? (body.failureSummary ?? null) : null,
    repository: claims.repository,
    repositoryId: claims.repository_id,
    repositoryOwnerId: claims.repository_owner_id,
    ref: claims.ref,
    eventName: claims.event_name,
    workflow: claims.workflow,
    workflowRef: claims.workflow_ref,
    workflowSha: claims.workflow_sha,
    runId: claims.run_id,
    runNumber: Number.parseInt(claims.run_number, 10),
    runAttempt: Number.parseInt(claims.run_attempt, 10),
    runUrl: `https://github.com/${claims.repository}/actions/runs/${claims.run_id}`,
    eventAt: body.eventAt,
    durationMs: body.durationMs ?? null,
    receivedAt,
  };
}
