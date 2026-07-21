# Dependabot assessment — 2026-07-20

## Evidence source

The authenticated GitHub Dependabot alert list for [`SteveKinzey/getphame`](https://github.com/SteveKinzey/getphame/security/dependabot) showed **8 open alerts** at review time.

| Priority | Alert | Severity | Dependency context | Why it matters now |
|---|---|---|---|---|
| P0 | `node-tar`: decompression/parse DoS via unlimited input | Critical | `tar` in `package-lock.json` | Highest severity; confirm whether the npm lockfile remains a supported install path and remove or update it. |
| P1 | `Nodemailer`: raw-option bypass enabling arbitrary file read and full-response SSRF ([alert #113](https://github.com/SteveKinzey/getphame/security/dependabot/113)) | High, direct | `nodemailer` in `package-lock.json`; affected `<= 9.0.0`, patched in `9.0.1` | Direct mail-path dependency with security impact in an application that sends email. |
| P2 | `node-tar`: negative entry size infinite loop | High | `tar` in `package-lock.json` | Should be handled with the P0 package-lock remediation. |
| P2 | `brace-expansion`: exponential-time DoS | High (two alerts) | `brace-expansion` in `package-lock.json` | Transitive dependency; remediate through an updated parent chain or lockfile refresh. |

The same alert list also showed one moderate `node-tar` alert and two moderate `esbuild` alerts. The `esbuild` alerts were marked development-only. At initial review, `pnpm audit --prod` reported zero production vulnerabilities, so the first remediation decision needed to distinguish the active pnpm deployment graph from the legacy npm `package-lock.json` graph.

## Immediate recommendation

Treat the direct high-severity Nodemailer alert as the **first runtime-relevant remediation** after confirming the active lockfile. The current pnpm manifest already requests `nodemailer` `^9.0.3`, which is above the vulnerable range; the outstanding alert is therefore tied to the legacy npm lockfile. Treat the critical and related `tar` alerts as the **first repository hygiene remediation**: either remove an obsolete `package-lock.json` after confirming pnpm is the only supported package manager, or update the npm lockfile and its affected transitive dependencies.

## Production audit remediation

The release build’s stricter OSV audit subsequently detected `body-parser@1.20.5` through `express@4.22.2`. The official advisory identifies versions below `1.20.6` as affected and provides `1.20.6` as the compatible patched release. The supported `pnpm-workspace.yaml` override now pins `body-parser` to `1.20.6`; a requested `pnpm install --no-frozen-lockfile` regenerated the lockfile, resolved the patched version, and passed the production OSV audit across 656 resolved package versions. [1]

[1]: https://github.com/expressjs/body-parser/security/advisories/GHSA-v422-hmwv-36x6 "body-parser advisory GHSA-v422-hmwv-36x6"

## CI publishing note

The repository now has a reviewed quality-gate workflow locally, but the configured GitHub App credential was rejected when it attempted to push `.github/workflows/quality.yml` because it lacks the `workflows` permission. Publishing this file requires either a user-authorized GitHub web commit or a credential that includes that permission; no force-push or permission bypass is appropriate.

## Remaining alert inventory — 2026-07-20

The authenticated GitHub Dependabot view reports eight open alerts. The critical and high `tar` and `brace-expansion` findings, the direct high Nodemailer finding, and the low body-parser finding are all attributed to the legacy `package-lock.json`; the moderate esbuild finding is marked development-only. Because the application’s validated build and GitHub Actions workflow use `pnpm install --frozen-lockfile`, the next safe remediation decision is to verify that the npm lockfile is not an active delivery input before removing or regenerating it. The alert source must not be dismissed merely by deleting a lockfile without that review.

## Accepted package-manager remediation

The source review confirmed that the custom Dockerfile copies `package.json`, `pnpm-lock.yaml`, and `patches/` into both build stages, never copies `package-lock.json`, and never executes `npm ci` or `npm install`. The tracked `package-lock.json` is therefore an unsupported alternate resolution graph rather than a production delivery input. It is removed as part of this release, while Docker is tightened to use the `packageManager`-pinned pnpm version with `--frozen-lockfile` in both stages. The maintained dependency graph is now solely `pnpm-lock.yaml`; future vulnerability remediation must update it and preserve the production audit gate.
