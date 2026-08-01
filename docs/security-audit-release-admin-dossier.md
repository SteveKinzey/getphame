# Security Audit release verification — administrator dossier architecture

## Decision

The verified Security Audit History evidence will remain inside Get Phame’s existing `/admin/security-audit-release` route. The route will continue to obtain its complete evidence payload from `securityAuditReleaseVerification.dashboard`, which is protected by centralized server-side `adminProcedure` middleware. The standalone static verification site and its public report links are not part of this release and must not be published.

## Access contract

| Request context | Page behavior | Evidence API behavior | Report files |
| --- | --- | --- | --- |
| Unauthenticated | Public landing experience only; the protected dossier is not rendered | Returns `FORBIDDEN`; no dossier payload | None exposed |
| Authenticated non-admin | Redirects away from the administrator page and shows no evidence | Returns `FORBIDDEN`; no dossier payload | None exposed |
| Authenticated administrator | Renders the internal verification dossier | Returns a sanitized, static verification payload | No public file link; the protected in-app record is the source of truth |

The client-side role check is a usability layer only. The server-side administrator procedure is the authorization boundary.

## Evidence content

The internal dossier may show only facts already proven by the completed release-verification record: reviewed PR `#72`, merge commit prefix `c48585a`, quality-gate run `30679098927`, `23/23` focused tests, `948` full-suite passes, `17` skips, strict TypeScript success, a clean production dependency audit, production build success, four responsive cases, unauthenticated ingestion rejection (`401` with `no-store`), unauthenticated administrator-reporting rejection (`403`), and production presence of `security_audit_reports` with its two reporting indexes.

The dossier must keep the first normal-cadence scheduled report visibly separate as **pending by design**. It must not convert that time-dependent observation into a pass.

## Privacy boundary

The payload must exclude credentials, cookies, bearer material, customer records, database rows, raw dependency logs, package names, individual advisory details, full workflow URLs, and public report-download URLs. It may include non-sensitive identifiers needed to trace the reviewed release, such as a pull-request number, short commit prefix, workflow-run identifier, route names, table name, and index names.

## Presentation

The page will use the existing official `BrandLockup`, Get Phame navy/gold tokens, administrator navigation, localization system, keyboard focus behavior, and responsive shell. The information architecture will be an internal evidence ledger rather than a public marketing page: determination, access boundary, exact validation gates, production controls, protected lineage, privacy boundary, and the pending scheduled confirmation.

## Release rules

The separate static website checkpoint must remain unpublished. The corrected Get Phame change must pass focused authorization and localization tests, the full test suite, TypeScript, dependency audit, production build, and mobile/desktop browser verification before it is eligible for a managed checkpoint and protected-main pull request.
