# WordPress Pairing Recovery UX and Connector CI Release Evidence

## Scope

This release replaces raw Get Phame pairing failures with localized, privacy-preserving recovery guidance and adds a distinct, accessible rate-limit warning with server-timed retry guidance in the WordPress connector. It also resolves Connector PR 2's transient-expiry, immediate-cleanup, stale-control, PHPUnit, and WordPress coding-standard findings.

## Completed Responsive Validation

The authenticated Developer Integrations route is `/developer`. A desktop full-page capture at 1280 × 720 rendered the complete page without clipping, overlap, invisible text, or broken navigation. The earlier `/developer-integrations` capture correctly exercised the application's unknown-route fallback and was excluded from affected-page evidence.

A mobile full-page capture at 390 × 844 preserved readable content, full-width controls, visible focusable actions, and bottom-navigation clearance without horizontal overflow. Post-capture network logs contained no failed affected-route requests. Browser-console errors were limited to expected Vite development WebSocket reconnect noise after the deliberate server restart; no application exception was observed.

A valid-shape unknown identifier (`wpb_` plus 12 characters) exercised the actual generic `NOT_FOUND` contract. The desktop viewport displayed a distinct rose recovery panel titled “Connection request no longer available,” explained that the request could not be verified, directed the user back to WordPress to start again, and explicitly confirmed that no credentials were created or exposed. No raw server message, pairing secret, or internal identifier was rendered.

## Completed Local Gates

| Gate | Result |
|---|---|
| Get Phame focused pairing, shared-limiter, and cross-product regressions | 30 tests passed |
| Get Phame full Vitest suite | 135 files passed; 797 tests passed; 6 skipped |
| Strict TypeScript | Passed with no diagnostics |
| Production dependency audit | No known high-severity production vulnerabilities |
| Production client and server build | Passed |
| Connector PHPUnit | 26 tests and 155 assertions passed |
| Connector WordPress coding standards | 6 files passed PHP_CodeSniffer |
| Connector PHP syntax and Composer metadata | Passed |
| Whitespace, stale-cache, and changed-file scans | Passed |

## Managed Application Checkpoint

Checkpoint `cdc49f76` captured the initial validated application tree and auto-published it. Production readiness and side-effect-free missing, malformed, and unknown pairing probes passed on both `https://getphame.app` and the managed production origin. Every negative claim returned the same generic no-store `404 NOT_FOUND` body without credential fields.

PR 44 review identified two valid presentation defects in the recovery panel: the amber unavailable state reused the rose error icon treatment, and its retry control lacked an explicit focus-visible ring. Both were corrected with focused regression coverage. The remaining review comment proposed a `RATE_LIMITED` branch on the authenticated approval page; the application approval contract cannot emit that code, because per-IP throttling belongs to the connector's public pairing-start flow. No unsupported frontend-only state was added.

The reviewed replacement tree passed the focused Developer Integrations regression (8 tests), the complete Vitest suite (133 files and 788 tests passed; 6 skipped), strict TypeScript, the production-only high-severity dependency audit, and the production build. It was saved and auto-published as checkpoint `16e7594a`; its exact tree is `8a02c83fd12003f49dd301e7e3b4169e0369fb97`.

## Hybrid Pairing Hardening

The first bounded production burst returned 13 successful pairing starts without a `429`. The application was using a process-local map, so Autoscale instances could enforce independent windows. The release replaces that map with a privacy-preserving shared database window keyed by a server-secret fingerprint, uses an atomic MySQL upsert, fails closed on storage errors, preserves `Retry-After` and `retryAfterSeconds`, and indexes expiration for bounded cleanup.

Migration `0034_faithful_selene.sql` adds only the shared limiter table and expiry index; the managed database schema was verified after application. On the managed preview, the bounded hybrid smoke returned readiness `200`, identical no-store generic `404 NOT_FOUND` bodies for unknown and malformed claims without forbidden credential fields, and the first shared-window `429` on start attempt 20. The response included both a positive `Retry-After` header and `retryAfterSeconds` value, and the runner stopped immediately.

The reusable `security-remediation-release-loop` skill now includes a canonical WordPress pairing contract, a byte-for-byte comparator, a bounded production smoke runner, and ordered release gates. Identical contract snapshots are vendored in the application and Connector repositories. Native Vitest and PHPUnit regressions bind both implementations to request shape, generic failure privacy, no-store behavior, retry semantics, localized warning state, and immediate stale-control cleanup; the comparator confirmed all three snapshots match.

The validated hybrid tree was saved and auto-published as checkpoint `c57808d5` with exact tree `f1f66f4657322db84fe8ac23e8152054cde8b917`. After deployment propagation completed, both `https://getphame.app` and the managed production origin returned readiness `200`. Unknown and malformed synthetic claims returned identical no-store generic `404 NOT_FOUND` bodies without forbidden credential fields. A bounded `.invalid` start burst reached the shared `429` after 11 successful starts, included positive header and body retry metadata, and stopped immediately without printing or retaining a returned secret.

Copilot review on application PR 46 identified that deleting every expired limiter row on every start request could add avoidable write load and lock contention. The valid finding was remediated in the managed tree by making expiry cleanup opportunistic at most once per minute per process while retaining the indexed shared-table cleanup path. The focused regressions, complete 135-file Vitest suite, strict TypeScript, production dependency audit, and production build all passed after the fix. The replacement tree was saved and auto-published as checkpoint `4d9b3fea`; its exact tree is `013e305b1f08875d3c022b73d2b708f55c999f42`.

After replacement-checkpoint propagation, both production origins again returned readiness `200`; unknown and malformed synthetic claims returned identical no-store generic `404 NOT_FOUND` bodies without forbidden credential fields. The bounded `.invalid` start burst reached the shared `429` after 12 successful starts, included positive header and body retry metadata, and stopped immediately without printing or retaining a returned secret.

## Connector PR 2 GitHub Evidence

The transient-expiry, immediate-cleanup, stale-control reset, rate-limit warning, PHP_CodeSniffer, and regression-test changes were committed as `383208daf545b8969d8f8657dda098a55d7aa5dc` and pushed normally to `feature/wordpress-self-service-binding`. GitHub reported the pull request as `CLEAN` in three consecutive polls after initially reporting it as `UNSTABLE`; the REST merge state was also `clean`. All three review conversations were answered with commit-level evidence and resolved.

The synchronized contract and Connector-native cross-product regression were added at reviewed head `288cd5f27057d4dbc8c047d48fc115a872b71dfd`. The exact head passed 26 PHPUnit tests with 155 assertions, PHP_CodeSniffer across all six checked PHP files, PHP syntax, contract parity, whitespace, and credential-pattern scans. PR [#2](https://github.com/SteveKinzey/get-phame-connector/pull/2) then merged normally as `33c3bdbbbd66c71ebfd73e3d903f01c71f8c31b8`; remote Connector `main` contains the reviewed head and has tree `09ba693633c851ac3607c3f6a59d58ae03eea6a0`.

## Protected GitHub Release

Application PR [#44](https://github.com/SteveKinzey/getphame/pull/44) was updated normally to reviewed replacement commit `52db7870b0d45307da785864a2c90763bd2c4a53`. The two valid presentation conversations were replied to and resolved after their fixes reached the reviewed branch. The rate-limit conversation was resolved with contract-level evidence that the authenticated approval query cannot emit `RATE_LIMITED` and that the public connector pairing-start flow owns the `429` state.

The required `Validate application quality` gate remained missing until the established post-review empty trigger commit `527ff1d90a252c1a369ac194e87a89e477492169` was pushed without changing the tree. GitHub then reported PR 44 as `CLEAN`. The pull request merged through protected `main` at `0d1a0a8b584c048dc080c5aaf2254967211d6b1a` on 2026-07-29 at 07:06:03 UTC with zero unresolved review conversations.

The merge commit tree and protected remote `main` tree both equal `8a02c83fd12003f49dd301e7e3b4169e0369fb97`, exactly matching managed checkpoint `16e7594a`. This release record and completed ledger are administrative closeout changes and will be captured in a final evidence-only checkpoint and synchronized through a separate protected pull request.

## Hybrid Protected Release

Application PR [#46](https://github.com/SteveKinzey/getphame/pull/46) was updated normally to reviewed replacement commit `00b6a2218234e4d83822032402175ed43f6d8f27`. The cleanup-contention conversation was answered with commit-level evidence and resolved only after the fix reached the reviewed branch. The required `Validate application quality` gate was retriggered on exact-tree commit `e376616a8e0e1be8a8741e78a138a9b693292577`; GitHub then reported the pull request as `CLEAN` with zero unresolved conversations.

PR 46 merged through protected `main` at `4a7bd11203aa9c633324e80e3093e4ba7bf11113` on 2026-07-29 at 11:00:46 UTC. The merge commit tree and protected remote `main` tree both equal `013e305b1f08875d3c022b73d2b708f55c999f42`, exactly matching replacement managed checkpoint `4d9b3fea`. This final release record and completed ledger are administrative closeout changes that will be captured and synchronized through an evidence-only protected pull request.

## Quality Gate Action Runtime Remediation

Application PR [#47](https://github.com/SteveKinzey/getphame/pull/47) merged normally on 2026-07-29 at 11:53:19 UTC as `de3afe59970392fa84ee845b8b22c37e82a9439b`, which is the current protected `main` commit. The reported cancellation annotation named concurrency group `quality-Quality Gate-refs/heads/main`. That proves the manually dispatched run targeted `main` while another `main` validation was queued; the existing `quality-${{ github.workflow }}-${{ github.ref }}` key therefore deduplicated the same ref as designed rather than allowing one branch to cancel another. The ref-scoped concurrency policy remains unchanged and is now asserted by the workflow contract test.

The actionable annotation was the Node.js 20 JavaScript-action runtime warning. GitHub’s [Node.js 20 deprecation notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) directs workflow users to action releases that declare Node 24. The Quality Gate now uses `actions/checkout@v7` and `actions/setup-node@v7`, whose current official repositories document Node 24 runtimes, and removes `pnpm/action-setup@v4`. The workflow installs the project-pinned `pnpm@10.18.1` with npm under the configured Node 22 application runtime, preserving the locked install, TypeScript, Vitest, and production-build commands.

Local validation passed the focused workflow contract, Prettier YAML parsing, strict TypeScript, all 135 Vitest files with 797 tests passed and 6 skipped, a production-only dependency audit with no known vulnerabilities, the production build, Drizzle migration consistency check, semantic three-way pairing-contract comparison, whitespace review, and added-line credential-pattern scan. The authoritative GitHub Actions result and absence of Node 20 annotations remain pending until this exact tree is checkpointed and synchronized through protected `main`.
