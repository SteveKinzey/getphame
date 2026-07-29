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
| Get Phame focused pairing and localization regressions | 68 tests passed |
| Get Phame full Vitest suite | 133 files passed; 788 tests passed; 6 skipped |
| Strict TypeScript | Passed with no diagnostics |
| Production dependency audit | No known high-severity production vulnerabilities |
| Production client and server build | Passed |
| Connector PHPUnit | 23 tests and 139 assertions passed |
| Connector WordPress coding standards | 4 files passed PHP_CodeSniffer |
| Connector PHP syntax and Composer metadata | Passed |
| Whitespace, stale-cache, and changed-file scans | Passed |

## Managed Application Checkpoint

Checkpoint `cdc49f76` captured the initial validated application tree and auto-published it. Production readiness and side-effect-free missing, malformed, and unknown pairing probes passed on both `https://getphame.app` and the managed production origin. Every negative claim returned the same generic no-store `404 NOT_FOUND` body without credential fields.

PR 44 review identified two valid presentation defects in the recovery panel: the amber unavailable state reused the rose error icon treatment, and its retry control lacked an explicit focus-visible ring. Both were corrected with focused regression coverage. The remaining review comment proposed a `RATE_LIMITED` branch on the authenticated approval page; the application approval contract cannot emit that code, because per-IP throttling belongs to the connector's public pairing-start flow. No unsupported frontend-only state was added.

The reviewed replacement tree passed the focused Developer Integrations regression (8 tests), the complete Vitest suite (133 files and 788 tests passed; 6 skipped), strict TypeScript, the production-only high-severity dependency audit, and the production build. It was saved and auto-published as checkpoint `16e7594a`; its exact tree is `8a02c83fd12003f49dd301e7e3b4169e0369fb97`.

## Connector PR 2 GitHub Evidence

The transient-expiry, immediate-cleanup, stale-control reset, rate-limit warning, PHP_CodeSniffer, and regression-test changes were committed as `383208daf545b8969d8f8657dda098a55d7aa5dc` and pushed normally to `feature/wordpress-self-service-binding`. GitHub reported the pull request as `CLEAN` in three consecutive polls after initially reporting it as `UNSTABLE`; the REST merge state was also `clean`. All three review conversations were answered with commit-level evidence and resolved.

Connector PR 2 remains open and unmerged as required. Its head is `383208daf545b8969d8f8657dda098a55d7aa5dc`, it has zero unresolved review threads, and the locally executed PHP gate remains 23 PHPUnit tests with 139 assertions plus a clean PHP_CodeSniffer run. The current GitHub integration can read the pull request's aggregate clean state but is not authorized to read the private repository's named check-run details; no unavailable check detail is represented as direct evidence.

## Protected GitHub Release

Application PR [#44](https://github.com/SteveKinzey/getphame/pull/44) was updated normally to reviewed replacement commit `52db7870b0d45307da785864a2c90763bd2c4a53`. The two valid presentation conversations were replied to and resolved after their fixes reached the reviewed branch. The rate-limit conversation was resolved with contract-level evidence that the authenticated approval query cannot emit `RATE_LIMITED` and that the public connector pairing-start flow owns the `429` state.

The required `Validate application quality` gate remained missing until the established post-review empty trigger commit `527ff1d90a252c1a369ac194e87a89e477492169` was pushed without changing the tree. GitHub then reported PR 44 as `CLEAN`. The pull request merged through protected `main` at `0d1a0a8b584c048dc080c5aaf2254967211d6b1a` on 2026-07-29 at 07:06:03 UTC with zero unresolved review conversations.

The merge commit tree and protected remote `main` tree both equal `8a02c83fd12003f49dd301e7e3b4169e0369fb97`, exactly matching managed checkpoint `16e7594a`. This release record and completed ledger are administrative closeout changes and will be captured in a final evidence-only checkpoint and synchronized through a separate protected pull request.
