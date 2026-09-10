# PWA Resilience Deployment and Repository Audit

**Observed:** 2026-08-01 UTC
**Scope:** Canonical production availability, managed runtime signals, protected-main health, and branch-cleanup safety.

## Production availability

| Endpoint                                            | Observation                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `https://getphame.app/`                             | Returned HTTP 200 and rendered the Get Phame landing experience.       |
| `https://www.getphame.app/`                         | Returned HTTP 200 after canonical redirect to `https://getphame.app/`. |
| `https://getphame.manus.space/`                     | Returned HTTP 200.                                                     |
| `https://revrocket-j5ynazte.manus.space/`           | Returned HTTP 200.                                                     |
| `https://getphame.app/api/health`                   | Returned HTTP 200 with the expected JSON content type.                 |
| `https://revrocket-j5ynazte.manus.space/api/health` | Returned HTTP 200 with the expected JSON content type.                 |

The managed runtime’s recent records showed a successful SMTP health sweep and ordinary unauthenticated health/browser requests. No production application crash, HTTP 5xx response, or failed/cancelled recent GitHub workflow was observed during this audit.

## Release and repository evidence

| Check                                              | Observed result                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Protected `main`                                   | Commit `e63eed9374f26e14d848582ee082c53a87e15db7`; tree `515fd38953d0e79ce2c0352f284ef60d9e6c30d3`. |
| Expected tree comparison                           | Exact match.                                                                                        |
| Recent Quality Gate and API Recovery Browser Check | Successful on protected `main`.                                                                     |
| Open pull requests                                 | None at audit time.                                                                                 |
| Recent failed or cancelled workflow runs           | None in the audited window.                                                                         |

The repository’s scheduled API-health workflow currently probes the legacy Manus deployment hostname rather than the canonical `https://getphame.app/api/health` endpoint. This is an observability gap: it can report the platform deployment as healthy while missing a canonical-domain routing, certificate, or edge failure. The remediation will repoint the monitor to the canonical endpoint while retaining its minimal incident-state behavior.

## Offline experience verification

On 2026-08-01, the refreshed English offline fallback was visually verified at a 375 × 812 mobile viewport. The approved gold P-star asset, text-rendered `GET PHAME` lockup, connection guidance, visible focus-capable retry action, status copy, and readable contrast all rendered within the viewport without horizontal overflow.

The same recovery experience was also verified at a 1280 × 720 desktop viewport. Its card remained centered and legible, with intentional whitespace, proportionate hierarchy, and no clipped or overflowing elements.

After reconciling the release onto current protected-main work, the transferred managed tree was rechecked at 390 × 844 and 1280 × 720. The branded recovery card remained readable, centered, and fully visible at both breakpoints; the gold retry control and live-status copy remained easy to identify without overflow.

## Branch-cleanup safety

The evidence-preserving branch audit found `consolidation/push-safe`, `feature/wordpress-self-service-binding`, `release/reconcile-main-with-20437f53-20260726`, and `release/restore-security-audit-verification-20260801` to be `UNIQUE_REVIEW_REQUIRED`. None is safe for automatic deletion. They will remain preserved unless a separate review proves their contents are redundant or the repository owner explicitly authorizes a specific deletion.
