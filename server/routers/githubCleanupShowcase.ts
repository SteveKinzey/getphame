import { adminProcedure, router } from "../_core/trpc";

const SCRIPT_SCENES = [
  {
    id: "audit-preserve-clean",
    title: "Clean the repository without losing the work",
    time: "0:00–0:30",
    narration:
      "A clean GitHub repository should reduce confusion without erasing useful work. This workflow begins with evidence, not deletion. It audits every branch, proves what is already merged, identifies what remains unique, verifies that main matches the intended release, and only then removes branches that meet strict preservation gates.",
  },
  {
    id: "read-only-evidence",
    title: "Build the evidence before making a decision",
    time: "0:30–1:05",
    narration:
      "The skill starts with a read-only audit. It records the default branch, live branch tips, open pull requests, protection rules, merge relationships, ahead-and-behind counts, and final-tree differences. Age and branch naming are never treated as proof that a branch is stale.",
  },
  {
    id: "ancestry-preservation-parity",
    title: "Read ancestry, preservation, and tree parity correctly",
    time: "1:05–1:50",
    narration:
      "A solid line means Git has verified commit ancestry. A preservation label means a retained reference contains the exact tip of a deleted branch. A dashed line means two commits have different history but the same Git tree. Get Phame main exactly matches the managed release tree, while consolidation push-safe remains a separate preservation branch with unique work.",
  },
  {
    id: "main-status",
    title: "Confirm whether main actually needs an update",
    time: "1:50–2:25",
    narration:
      "A different commit history does not automatically mean main is outdated. The decisive content check is Git-tree parity. Get Phame main is current because its tree exactly matches the validated managed release. The safe action is a no-op: do not create a redundant release or rewrite history.",
  },
  {
    id: "metrics",
    title: "Extraction priority and readiness mean different things",
    time: "2:25–3:20",
    narration:
      "Extraction priority is an ordinal action order. Priority one means evaluate or extract first; it does not mean highest revenue, urgency, or percent complete. Readiness is categorical. It describes what the evidence supports today: selectively portable after revalidation, specification only, architecturally stale, blocked, or superseded.",
  },
  {
    id: "decision-queue",
    title: "Turn preserved work into an ordered decision queue",
    time: "3:20–4:15",
    narration:
      "Mailjet is first because it is bounded and historically tested. The global Help Assistant is second because its requirements can become a scoped issue. The Sources and WooCommerce workspace is third because it overlaps newer architecture. The paid-entitlement patch is fourth because a known missing dependency leaves it blocked.",
  },
  {
    id: "deletion-gates",
    title: "Deletion remains gated until the last moment",
    time: "4:15–4:50",
    narration:
      "The deletion utility begins in dry-run mode. Before execution it fetches the live repository again, confirms every branch still has the audited SHA, checks for new pull requests, and verifies that any preservation branch still contains the exact deleted tip. If any fact changed, the operation stops.",
  },
  {
    id: "next-actions",
    title: "Preserve decisions, not branch clutter",
    time: "4:50–5:20",
    narration:
      "Keep main unchanged while it matches the validated release. Port selected Mailjet work through a fresh pull request. Convert the Help Assistant requirements into a dedicated issue. Reconcile Sources behavior with today's architecture, and rebuild the blocked entitlement flow against current patterns. Retire push-safe only after every workstream is delivered or explicitly closed.",
  },
] as const;

export function buildGithubCleanupShowcasePayload() {
  return {
    snapshot: {
      repository: "SteveKinzey/getphame",
      verifiedAt: "2026-07-25",
      mainSha: "29dc09dde2f6b4083f03642dc47b590e4475fd49",
      mainShortSha: "29dc09d",
      treeSha: "0f90c2f9dcc1a36d9a5d8c69400d2c39c03dc169",
      exactReleaseTreeMatch: true,
      openPullRequests: 0,
      namedBranches: 2,
      requiredCheck: "Validate application quality",
      automaticMergedBranchCleanup: true,
    },
    divergence: {
      commitsAhead: 27,
      commitsBehindMain: 96,
      finalTreeFilesDiffer: 183,
      branchOnlyFiles: 20,
    },
    workstreams: [
      { id: "mailjet", priority: 1, readiness: "portable", action: "port" },
      {
        id: "helpAssistant",
        priority: 2,
        readiness: "specification",
        action: "issue",
      },
      { id: "sourcesWoo", priority: 3, readiness: "stale", action: "rework" },
      {
        id: "wooEntitlement",
        priority: 4,
        readiness: "blocked",
        action: "rebuild",
      },
    ] as const,
    safetyGates: [
      "dryRun",
      "refetch",
      "exactSha",
      "openPr",
      "preservation",
      "execute",
      "reaudit",
    ] as const,
    script: {
      language: "en",
      estimatedRuntime: "5:20",
      scenes: SCRIPT_SCENES,
    },
  };
}

export const githubCleanupShowcaseRouter = router({
  dashboard: adminProcedure.query(() => buildGithubCleanupShowcasePayload()),
});
