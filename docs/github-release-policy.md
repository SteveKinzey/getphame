# Get Phame GitHub Release Policy

## Why this policy exists

The managed Get Phame project and `SteveKinzey/getphame` are separate Git remotes. A managed checkpoint publishes the app, but it does **not** implicitly commit, push, review, or merge that release into GitHub. A release is complete only when the validated checkpoint and GitHub `main` have identical file trees.

## Required release sequence

| Stage        | Required evidence                                                                                                                                                                  | Stop condition                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Validate     | Focused tests, full Vitest, TypeScript, production audit, production build, and responsive checks pass on the exact releasable tree.                                               | Any gate fails.                                                                               |
| Checkpoint   | Save the validated managed checkpoint and record its version, commit, and tree hash.                                                                                               | The checkpoint differs from the validated tree.                                               |
| Reconcile    | Fetch current GitHub `main`; create a new history-preserving `release/checkpoint-<version>` branch; merge the managed release history without force-pushing.                       | GitHub changed unexpectedly, conflicts are ambiguous, or unrelated work would be overwritten. |
| Prove parity | The release branch must satisfy `git diff --exit-code <managed-release-commit>` and its tree hash must equal the managed checkpoint tree hash.                                     | Any file or tree mismatch remains.                                                            |
| Review       | Push the branch and open or update a pull request containing checkpoint identity, tree hash, validation results, and production status.                                            | The pull request is conflicted or evidence is incomplete.                                     |
| Check        | GitHub Quality Gate and API Recovery Browser Check pass. Security scanners must be investigated; false-positive credential examples must use unmistakably non-secret placeholders. | A required check fails or is skipped.                                                         |
| Merge        | Merge through the pull request with history preserved. Never force-push `main`. Delete only the merged release branch.                                                             | Required checks are incomplete.                                                               |
| Verify       | Fetch remote `main`, confirm the merged pull request, and prove `git diff --exit-code <managed-release-commit> origin/main`.                                                       | Remote `main` differs from the released checkpoint.                                           |

## Branch and pull-request rules

Use one new release branch per validated checkpoint. Never reuse stale reconciliation branches. Never overwrite, rebase, or delete unrelated contributor branches. Close a stale pull request only with a comment identifying the replacement pull request; retain its branch unless the work was merged or the owner explicitly approves deletion.

The `main` branch must require pull requests, up-to-date required checks, resolved conversations, and the repository’s first-party quality and recovery checks. Force pushes and branch deletion must remain disabled.

## Required pull-request record

Every release pull request must record the managed checkpoint version, managed commit, managed tree hash, GitHub branch head, validation totals, production origins checked, and the final remote `main` parity result. A managed checkpoint alone is not a completed Get Phame release.
