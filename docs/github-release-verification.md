# GitHub Release Verification

**Commit:** `985cdb6e5947be470ddcdf25b2f13b9cedac89e5`

**Repository:** <https://github.com/SteveKinzey/getphame>

**Actions page:** <https://github.com/SteveKinzey/getphame/actions>

| Workflow                   | Run                                                                                 | Observed result                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| API Recovery Browser Check | [Run 30109619578](https://github.com/SteveKinzey/getphame/actions/runs/30109619578) | Passed in 1m 39s.                                                                 |
| Quality Gate               | [Run 30109619465](https://github.com/SteveKinzey/getphame/actions/runs/30109619465) | Failed in 1m 50s because CI did not provide `JWT_SECRET` to one fingerprint test. |

The live readiness endpoint <https://getphame.app/api/health> returned HTTP 200 with `{"ok":true,"status":"ready"}` after the managed release checkpoint.

## Quality Gate Diagnosis

The application correctly fails closed when fingerprint signing material is absent. The managed release suite passed because managed secrets are injected there, while the private GitHub runner had no equivalent test-only value. The fingerprint test now generates random ephemeral signing material inside the isolated test process, restores the prior environment afterward, and leaves production behavior fail closed. No production credential or reusable secret is stored in source, logs, or workflow configuration.

## Dependency Advisory Remediation

The follow-up release raises the authoritative `tar` override from `>=7.5.11` to `>=7.5.22`, resolving GHSA-r292-9mhp-454m in the transitive `@capacitor/cli` graph. The regenerated lockfile resolves `tar@7.5.22`. The OSV production audit passed across 683 unique package versions, the high-severity pnpm audit reported no known vulnerabilities, and the exact CI sequence passed locally with ephemeral signing material: TypeScript, 92 Vitest files with 551 passing tests, and the production bundle.

**Follow-up commit:** [`5ec70d2`](https://github.com/SteveKinzey/getphame/commit/5ec70d2122b00d9fdc0b57c9e12ae61179e959a0)

| Follow-up workflow         | Run                                                                                 | Current observation                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Quality Gate               | [Run 30110365354](https://github.com/SteveKinzey/getphame/actions/runs/30110365354) | Passed in 2m 36s: 89 test files, 546 tests, and 11 skips under the repository workflow contract. |
| API Recovery Browser Check | [Run 30110365219](https://github.com/SteveKinzey/getphame/actions/runs/30110365219) | Passed in 1m 41s; the offline-to-online recovery job passed in 1m 36s.                           |

Both follow-up workflows completed successfully. Their only annotation is GitHub's non-blocking notice that checkout, setup-node, and pnpm setup actions targeting Node.js 20 are currently forced onto Node.js 24 by the runner platform.

## Development Dependency Remediation

GitHub Dependabot alert [#136](https://github.com/SteveKinzey/getphame/security/dependabot/136) reported **GHSA-r28c-9q8g-f849** in development-only `postcss@8.5.16`. Versions through 8.5.17 are affected; 8.5.18 is the first patched release. The authoritative workspace override now requires `postcss >=8.5.18`, and the regenerated graph resolves `postcss@8.5.22` across Vite, Vitest, Tailwind Vite integration, and the Builder.io Vite plugin. The high-severity audit reports no known vulnerabilities. With `JWT_SECRET` absent, TypeScript, 92 Vitest files, the production audit, and the production bundle all pass.

## Final Private Head and Deployment

Private `main` now points to [`61f2c7d`](https://github.com/SteveKinzey/getphame/commit/61f2c7d9be5643f623d97bf5945a32a009d53dde). [Quality Gate run 30111039819](https://github.com/SteveKinzey/getphame/actions/runs/30111039819) passed in 2m 42s. [API Recovery Browser Check run 30111039817](https://github.com/SteveKinzey/getphame/actions/runs/30111039817) passed in 1m 33s. The public readiness endpoint returned `{"ok":true,"status":"ready"}` after the managed checkpoint deployed successfully to `getphame.app`, `www.getphame.app`, `getphame.manus.space`, and `revrocket-j5ynazte.manus.space`.

GitHub re-indexed the final lockfile on July 24, 2026 and reports **0 open Dependabot alerts** and 128 closed alerts on private `main`. The local and remote private-main heads matched exactly, and the reconciled GitHub worktree was clean.

## Workflow Drift Audit Production Remediation — 29 July 2026

Live workflow-drift audit [run 30479608074](https://github.com/SteveKinzey/getphame/actions/runs/30479608074) failed even though repository auto-merge was enabled. The read-only workflow had queried REST `.allow_auto_merge`, an administrative field that was absent from the production token response and therefore created a false disabled result. The remediation uses the read-only GraphQL `Repository.autoMergeAllowed` field, rejects any regression to the REST field in both the deterministic audit script and Vitest contracts, and retains full actionlint validation with ShellCheck and Pyflakes.

| Release evidence                  | Verified result                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Managed implementation checkpoint | `cd13356d9dc7f6720d6669fbb7b40d67c6355fde`                                                                                                                                                           |
| Exact released tree               | `da956c507412aabe5b0603692c55cb5e818418c5`                                                                                                                                                           |
| Protected release pull request    | [PR #55](https://github.com/SteveKinzey/getphame/pull/55)                                                                                                                                            |
| Reviewed release head             | `f07804d27f86627d1fbba5259c6eaa36462a335f`                                                                                                                                                           |
| Protected `main` merge commit     | `e8fefb8db9ae6932881d208b6e05edd6a884bbcb`                                                                                                                                                           |
| Corrected live audit              | [Run 30482109150](https://github.com/SteveKinzey/getphame/actions/runs/30482109150) — passed, including repository contracts, GraphQL auto-merge verification, and actionlint with both integrations |

The integrated candidate preserved concurrent AI email tone adjustment, privacy-safe CSV import, Activity Trend CSV/PNG export, localization, and regression work. Strict TypeScript passed; all 142 Vitest files completed with 839 passing tests and 6 skips; the production dependency audit reported no known vulnerabilities; the production bundle built successfully; Drizzle remained consistent; three-way application, protected-main baseline, and Connector pairing semantics matched; formatting, whitespace, added-line credential, and desktop/mobile responsive checks passed. Pull request checks and Copilot review completed successfully with no unresolved review threads. The merge was normal, not forced or bypassed, the reviewed release head is an ancestor of protected `main`, repository auto-merge remains enabled, and protected `main` tree `da956c507412aabe5b0603692c55cb5e818418c5` exactly matched implementation checkpoint `cd13356d` before this administrative closeout update.
