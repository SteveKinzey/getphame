import { adminProcedure, router } from "../_core/trpc";

export const SECURITY_AUDIT_RELEASE_VERIFICATION = {
  verifiedAt: "2026-07-31",
  status: "verified" as const,
  release: {
    title: "Security Audit History",
    scope:
      "Protected audit ingestion, administrator reporting, and sanitized audit persistence.",
    repository: "SteveKinzey/getphame",
    protectedBranch: "main",
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
      "The release record excludes credentials, customer data, raw logs, and individual advisory details.",
  },
} as const;

export function buildSecurityAuditReleaseVerificationPayload() {
  return SECURITY_AUDIT_RELEASE_VERIFICATION;
}

export const securityAuditReleaseVerificationRouter = router({
  dashboard: adminProcedure.query(() =>
    buildSecurityAuditReleaseVerificationPayload()
  ),
});
