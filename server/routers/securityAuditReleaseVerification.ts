import { adminProcedure, router } from "../_core/trpc";

export const SECURITY_AUDIT_RELEASE_VERIFICATION = {
  verifiedAt: "2026-07-31",
  status: "verified" as const,
  audience: "administrators" as const,
  release: {
    title: "Security Audit History",
    scope:
      "Protected audit ingestion, administrator reporting, and sanitized audit persistence.",
    repository: "SteveKinzey/getphame",
    protectedBranch: "main",
  },
  determination: {
    release: "verified" as const,
    scheduledReport: "pending_expected" as const,
  },
  accessBoundary: [
    {
      id: "unauthenticated",
      status: "blocked" as const,
      pageOutcome: "public_landing_only" as const,
      apiOutcome: "FORBIDDEN" as const,
      payloadOutcome: "none" as const,
    },
    {
      id: "non-admin",
      status: "blocked" as const,
      pageOutcome: "redirected" as const,
      apiOutcome: "FORBIDDEN" as const,
      payloadOutcome: "none" as const,
    },
    {
      id: "administrator",
      status: "allowed" as const,
      pageOutcome: "rendered" as const,
      apiOutcome: "authorized" as const,
      payloadOutcome: "sanitized" as const,
    },
  ],
  validationGates: [
    { id: "focused-tests", status: "passed" as const, result: "23 / 23" },
    {
      id: "full-suite",
      status: "passed" as const,
      result: "948 passed · 17 skipped",
    },
    { id: "typescript", status: "passed" as const, result: "0 errors" },
    {
      id: "dependency-audit",
      status: "passed" as const,
      result: "0 production advisories",
    },
    { id: "production-build", status: "passed" as const, result: "Passed" },
    { id: "responsive", status: "passed" as const, result: "4 viewport cases" },
  ],
  productionControls: [
    {
      id: "ingestion",
      status: "passed" as const,
      result: "401 · no-store",
    },
    {
      id: "admin-reporting",
      status: "passed" as const,
      result: "403 · no payload",
    },
    {
      id: "schema",
      status: "passed" as const,
      result: "Table + 2 indexes",
    },
    {
      id: "interfaces",
      status: "passed" as const,
      result: "2 protected routes",
    },
  ],
  lineage: {
    pullRequest: 72,
    mergeCommit: "c48585a",
    qualityGateRun: "30679098927",
    preservedInProtectedMain: true,
  },
  schema: {
    table: "security_audit_reports",
    indexes: [
      "security_audit_reports_event_idx",
      "security_audit_reports_outcome_event_idx",
    ],
    rowDataInspected: false,
  },
  evidence: [
    {
      id: "github-release",
      status: "passed" as const,
      title: "Reviewed release lineage",
      detail:
        "The reviewed Security Audit History release is merged to protected main.",
    },
    {
      id: "ingestion-auth",
      status: "passed" as const,
      title: "Ingestion authorization",
      detail:
        "Unauthenticated ingestion is rejected before an audit report can be stored.",
    },
    {
      id: "admin-reporting-auth",
      status: "passed" as const,
      title: "Administrator reporting authorization",
      detail:
        "The reporting payload is served only through an administrator-authorized procedure.",
    },
    {
      id: "schema-readiness",
      status: "passed" as const,
      title: "Audit-history schema readiness",
      detail:
        "The additive audit-report table and reporting indexes are available in production.",
    },
    {
      id: "admin-ui",
      status: "passed" as const,
      title: "Administrator interface",
      detail:
        "Security Audit History loads for an authorized administrator and retains no raw dependency logs or advisory details.",
    },
  ],
  nextOperationalConfirmation: {
    title: "Confirm the first scheduled audit",
    steps: [
      "Allow the scheduled dependency-audit workflow to finish at its normal cadence. Do not trigger a duplicate run only to populate the page.",
      "Confirm that one authenticated, sanitized summary is accepted through the audit-ingestion path.",
      "Open Security Audit History as an administrator and confirm that a new latest-report card shows an outcome, validation statuses, a timestamp, package-update count, and a workflow reference.",
      "If no report appears, preserve the failed-run evidence and investigate the workflow or sanitized ingestion result before retrying.",
    ],
  },
  privacy: {
    title: "Privacy-preserving reporting",
    detail:
      "The release record excludes credentials, customer data, production rows, raw logs, individual advisory details, and public report links.",
  },
} as const;

export function buildSecurityAuditReleaseVerificationPayload() {
  return {
    ...SECURITY_AUDIT_RELEASE_VERIFICATION,
    release: { ...SECURITY_AUDIT_RELEASE_VERIFICATION.release },
    determination: { ...SECURITY_AUDIT_RELEASE_VERIFICATION.determination },
    accessBoundary: SECURITY_AUDIT_RELEASE_VERIFICATION.accessBoundary.map(
      item => ({ ...item })
    ),
    validationGates: SECURITY_AUDIT_RELEASE_VERIFICATION.validationGates.map(
      item => ({ ...item })
    ),
    productionControls:
      SECURITY_AUDIT_RELEASE_VERIFICATION.productionControls.map(item => ({
        ...item,
      })),
    lineage: { ...SECURITY_AUDIT_RELEASE_VERIFICATION.lineage },
    schema: {
      ...SECURITY_AUDIT_RELEASE_VERIFICATION.schema,
      indexes: [...SECURITY_AUDIT_RELEASE_VERIFICATION.schema.indexes],
    },
    evidence: SECURITY_AUDIT_RELEASE_VERIFICATION.evidence.map(item => ({
      ...item,
    })),
    nextOperationalConfirmation: {
      ...SECURITY_AUDIT_RELEASE_VERIFICATION.nextOperationalConfirmation,
      steps: [
        ...SECURITY_AUDIT_RELEASE_VERIFICATION.nextOperationalConfirmation
          .steps,
      ],
    },
    privacy: { ...SECURITY_AUDIT_RELEASE_VERIFICATION.privacy },
  };
}

export const securityAuditReleaseVerificationRouter = router({
  dashboard: adminProcedure.query(() =>
    buildSecurityAuditReleaseVerificationPayload()
  ),
});
