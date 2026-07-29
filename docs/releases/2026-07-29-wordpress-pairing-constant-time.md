# WordPress Pairing Constant-Time Remediation Evidence

## Scope

This release integrates the self-service WordPress account-pairing flow from pull request 40 onto the current protected-main tree. The security remediation replaces direct pairing-secret digest string equality with `crypto.timingSafeEqual()` over equal-length SHA-256 byte buffers. Unknown pairing IDs, wrong candidate secrets, malformed candidate secrets, and malformed stored digests return the same generic `NOT_FOUND` classification without attempting credential decryption.

## Local Validation

| Gate | Result | Evidence |
|---|---|---|
| Focused pairing regressions | Passed | 2 files; 12 tests passed, including generic endpoint failures and bounded-map pruning |
| Full Vitest suite | Passed | 133 files passed; 786 tests passed; 6 skipped |
| Strict TypeScript | Passed | The initial candidate passed after increasing the validation heap from 2 GB to 3 GB; the PR 42 replacement candidate passed on its first 3 GB run. |
| Production dependency audit | Passed | `pnpm audit --prod` reported no known vulnerabilities |
| Production build | Passed | Client and server production bundles completed |
| Whitespace review | Passed | `git diff --check` returned no findings |
| Added-line credential scan | Passed | No private-key, live Stripe key, GitHub token, Google key, database URL, or Stripe secret assignment pattern was found |
| Integration parity | Passed | All nine PR 40 application and migration files matched the isolated merge of the feature branch into current protected `main` |
| Local public endpoint fail-safe | Passed | Unknown pairing IDs, wrong secrets, and malformed or missing secrets return the same generic `404 NOT_FOUND`; responses use `Cache-Control: no-store` and expose no credential fields |

## Database

Migration `0033_wordpress_pairings.sql` was applied through the managed database workflow. The `wordpress_pairings` table and its primary, unique, status-expiry, and user-created indexes were verified after application.

## Responsive and Runtime Verification

Desktop captures at 1280 × 720 and mobile captures at 390 × 844 covered `/`, `/login`, and the authenticated `/developer` surface. The affected Developer Integrations page rendered its pairing guidance and existing controls without horizontal overflow, blocked actions, or navigation overlap. The public and authentication surfaces remained readable and responsive.

Runtime review found no failed network responses during these captures. Browser-console matches were limited to expected development-only Vite WebSocket reconnect noise after the deliberate server restart; no application exception or affected-route request failure was observed.

After the PR 42 hardening changes, desktop captures at 1280 × 720 and mobile captures at 390 × 844 were repeated for `/`, `/login`, and `/developer`. All six views remained readable without horizontal overflow, blocked primary controls, or navigation overlap; the authenticated Developer Integrations surface retained usable desktop and mobile layouts. Network logs recorded no failed responses. Browser-console findings were limited to expected development-only Vite WebSocket reconnect noise after the deliberate server restart, with no application exception.

## Release Status

Initial code checkpoint `8fe04fbb` was auto-published successfully, and evidence-only checkpoint `62dbb225` recorded that production verification. Both `revrocket-j5ynazte.manus.space` and `getphame.app` returned `200` with `{"ok":true,"status":"ready"}` from `/api/health`. Side-effect-free unknown-pairing claims returned the same generic `404 NOT_FOUND` response with `Cache-Control: no-store` on both origins and exposed no credential fields.

PR 42 review then identified two additional hardening changes: malformed public claim secrets must use that same generic 404 contract, and the per-IP start limiter must cap and prune tracked clients. Replacement code checkpoint `d3b1d666` was auto-published after 2 focused files and 12 tests, the 133-file full suite with 786 passing and 6 skipped tests, strict TypeScript, production dependency audit, production build, static security checks, and repeated desktop/mobile verification all passed. Both production origins returned ready health responses; missing, malformed, and unknown pairing claims returned the same generic `404 NOT_FOUND` body with `Cache-Control: no-store` and no credential fields.

Protected-main required check results, final merge, and exact-tree parity evidence remain pending. Connector pull request 2 remains intentionally unmerged pending its PHP CI gate.
