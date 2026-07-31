import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { InsertAutomationEvent } from "../drizzle/schema";

export const AUTOMATION_HEALTH_REPOSITORY = "SteveKinzey/getphame";
export const AUTOMATION_HEALTH_REPOSITORY_ID = "1200140517";
export const AUTOMATION_HEALTH_OWNER_ID = "4842067";
export const AUTOMATION_HEALTH_AUDIENCE =
  "https://getphame.app/api/automation/events";
export const AUTOMATION_HEALTH_ISSUER =
  "https://token.actions.githubusercontent.com";
export const AUTOMATION_HEALTH_PATH = "/api/automation/events";
export const AUTOMATION_EVENT_RETENTION_MS = 400 * 24 * 60 * 60 * 1000;
export const AUTOMATION_EVENT_MAX_AGE_MS = 10 * 60 * 1000;
export const AUTOMATION_HISTORY_MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

const githubJwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks")
);

const positiveIntegerString = z.string().regex(/^\d+$/);
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/i);

const automationOidcClaimsSchema = z.object({
  actor: z.string().min(1).max(255),
  event_name: z.string().min(1).max(64),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  jti: z.string().min(8).max(255),
  nbf: z.number().int().nonnegative().optional(),
  ref: z.string().min(1).max(255),
  repository: z.literal(AUTOMATION_HEALTH_REPOSITORY),
  repository_id: z.literal(AUTOMATION_HEALTH_REPOSITORY_ID),
  repository_owner_id: z.literal(AUTOMATION_HEALTH_OWNER_ID),
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

export type AutomationOidcClaims = z.infer<typeof automationOidcClaimsSchema>;

const sharedEventFields = {
  eventAt: z.number().int().nonnegative(),
  durationMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000)
    .optional(),
};

export const automationEventBodySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("drift_audit"),
      result: z.enum(["success", "failure"]),
      ...sharedEventFields,
      failureCode: z
        .enum(["workflow_failed", "workflow_cancelled", "workflow_timed_out"])
        .optional(),
      failureSummary: z.string().trim().min(1).max(300).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (
        value.result === "failure" &&
        (!value.failureCode || !value.failureSummary)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Failed drift audits require a bounded failure code and summary.",
        });
      }
      if (
        value.result === "success" &&
        (value.failureCode || value.failureSummary)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Successful drift audits must not include failure details.",
        });
      }
    }),
  z
    .object({
      kind: z.literal("dependabot_merge"),
      result: z.literal("success"),
      ...sharedEventFields,
      pullRequestNumber: z.number().int().positive(),
      pullRequestCreatedAt: z.number().int().nonnegative(),
      pullRequestMergedAt: z.number().int().nonnegative(),
    })
    .strict()
    .refine(value => value.pullRequestMergedAt >= value.pullRequestCreatedAt, {
      message:
        "The pull request merge time must not precede its creation time.",
    }),
]);

export type AutomationEventBody = z.infer<typeof automationEventBodySchema>;

export async function verifyAutomationOidcToken(
  token: string,
  nowMs = Date.now()
): Promise<AutomationOidcClaims> {
  const { payload } = await jwtVerify(token, githubJwks, {
    issuer: AUTOMATION_HEALTH_ISSUER,
    audience: AUTOMATION_HEALTH_AUDIENCE,
    algorithms: ["RS256"],
    clockTolerance: 30,
  });
  const claims = automationOidcClaimsSchema.parse(payload);
  if (nowMs - claims.iat * 1000 > AUTOMATION_EVENT_MAX_AGE_MS) {
    throw new Error("The GitHub OIDC token is too old.");
  }
  return claims;
}

function requireDriftIdentity(claims: AutomationOidcClaims): void {
  const expectedWorkflowRef = `${AUTOMATION_HEALTH_REPOSITORY}/.github/workflows/workflow-drift-audit.yml@refs/heads/main`;
  if (
    claims.workflow !== "Monthly Workflow Drift Audit" ||
    claims.workflow_ref !== expectedWorkflowRef ||
    claims.ref !== "refs/heads/main" ||
    !["schedule", "workflow_dispatch"].includes(claims.event_name) ||
    claims.sub !== `repo:${AUTOMATION_HEALTH_REPOSITORY}:ref:refs/heads/main`
  ) {
    throw new Error(
      "The GitHub OIDC workflow identity is not allowed for drift events."
    );
  }
}

function requireDependabotIdentity(claims: AutomationOidcClaims): void {
  const expectedWorkflowRef = `${AUTOMATION_HEALTH_REPOSITORY}/.github/workflows/dependabot-merge-observability.yml@refs/heads/main`;
  if (
    claims.workflow !== "Dependabot merge observability" ||
    claims.workflow_ref !== expectedWorkflowRef ||
    claims.event_name !== "pull_request" ||
    claims.base_ref !== "main" ||
    !claims.head_ref?.startsWith("dependabot/github_actions/") ||
    !(
      /^refs\/pull\/\d+\/merge$/.test(claims.ref) ||
      claims.ref === "refs/heads/main"
    ) ||
    claims.sub !== `repo:${AUTOMATION_HEALTH_REPOSITORY}:pull_request`
  ) {
    throw new Error(
      "The GitHub OIDC workflow identity is not allowed for Dependabot events."
    );
  }
}

export function buildAutomationEventInsert(input: {
  body: AutomationEventBody;
  claims: AutomationOidcClaims;
  receivedAt: number;
}): InsertAutomationEvent {
  const { body, claims, receivedAt } = input;
  if (Math.abs(receivedAt - body.eventAt) > AUTOMATION_EVENT_MAX_AGE_MS) {
    throw new Error(
      "The automation event timestamp is outside the accepted freshness window."
    );
  }
  if (body.kind === "drift_audit") requireDriftIdentity(claims);
  else requireDependabotIdentity(claims);

  const eventKey = `${body.kind}:${claims.run_id}:${claims.run_attempt}`;
  return {
    eventKey,
    oidcJtiHash: createHash("sha256").update(claims.jti).digest("hex"),
    kind: body.kind,
    result: body.result,
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
    pullRequestNumber:
      body.kind === "dependabot_merge" ? body.pullRequestNumber : null,
    pullRequestCreatedAt:
      body.kind === "dependabot_merge" ? body.pullRequestCreatedAt : null,
    pullRequestMergedAt:
      body.kind === "dependabot_merge" ? body.pullRequestMergedAt : null,
    failureCode:
      body.kind === "drift_audit" ? (body.failureCode ?? null) : null,
    failureSummary:
      body.kind === "drift_audit" ? (body.failureSummary ?? null) : null,
    receivedAt,
  };
}
