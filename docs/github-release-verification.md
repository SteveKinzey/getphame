# Get Phame GitHub Release Verification

**Commit:** `985cdb6e5947be470ddcdf25b2f13b9cedac89e5`

**Repository:** <https://github.com/SteveKinzey/getphame>

**Actions page:** <https://github.com/SteveKinzey/getphame/actions>

| Workflow | Run | Observed result |
| --- | --- | --- |
| API Recovery Browser Check | [Run 30109619578](https://github.com/SteveKinzey/getphame/actions/runs/30109619578) | Passed in 1m 39s. |
| Quality Gate | [Run 30109619465](https://github.com/SteveKinzey/getphame/actions/runs/30109619465) | Failed in 1m 50s because CI did not provide `JWT_SECRET` to one fingerprint test. |

The live readiness endpoint <https://getphame.app/api/health> returned HTTP 200 with `{"ok":true,"status":"ready"}` after the managed release checkpoint.

## Quality Gate Diagnosis

The application correctly fails closed when fingerprint signing material is absent. The managed release suite passed because managed secrets are injected there, while the private GitHub runner had no equivalent test-only value. The fingerprint test now generates random ephemeral signing material inside the isolated test process, restores the prior environment afterward, and leaves production behavior fail closed. No production credential or reusable secret is stored in source, logs, or workflow configuration.

## Dependency Advisory Remediation

The follow-up release raises the authoritative `tar` override from `>=7.5.11` to `>=7.5.22`, resolving GHSA-r292-9mhp-454m in the transitive `@capacitor/cli` graph. The regenerated lockfile resolves `tar@7.5.22`. The OSV production audit passed across 683 unique package versions, the high-severity pnpm audit reported no known vulnerabilities, and the exact CI sequence passed locally with ephemeral signing material: TypeScript, 92 Vitest files with 551 passing tests, and the production bundle.

**Follow-up commit:** [`5ec70d2`](https://github.com/SteveKinzey/getphame/commit/5ec70d2122b00d9fdc0b57c9e12ae61179e959a0)

| Follow-up workflow | Run | Current observation |
| --- | --- | --- |
| Quality Gate | [Run 30110365354](https://github.com/SteveKinzey/getphame/actions/runs/30110365354) | Passed in 2m 36s: 89 test files, 546 tests, and 11 skips under the repository workflow contract. |
| API Recovery Browser Check | [Run 30110365219](https://github.com/SteveKinzey/getphame/actions/runs/30110365219) | Passed in 1m 41s; the offline-to-online recovery job passed in 1m 36s. |

Both follow-up workflows completed successfully. Their only annotation is GitHub's non-blocking notice that checkout, setup-node, and pnpm setup actions targeting Node.js 20 are currently forced onto Node.js 24 by the runner platform.

## Development Dependency Remediation

GitHub Dependabot alert [#136](https://github.com/SteveKinzey/getphame/security/dependabot/136) reported **GHSA-r28c-9q8g-f849** in development-only `postcss@8.5.16`. Versions through 8.5.17 are affected; 8.5.18 is the first patched release. The authoritative workspace override now requires `postcss >=8.5.18`, and the regenerated graph resolves `postcss@8.5.22` across Vite, Vitest, Tailwind Vite integration, and the Builder.io Vite plugin. The high-severity audit reports no known vulnerabilities. With `JWT_SECRET` absent, TypeScript, 92 Vitest files, the production audit, and the production bundle all pass.
