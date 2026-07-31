# Automation Health Architecture

## Scope

Get Phame will receive privacy-minimized GitHub workflow outcomes through short-lived GitHub Actions OIDC tokens, persist bounded operational history, expose administrator-only metrics, and show an administrator warning only while the latest drift-audit result is failed. No long-lived GitHub credential, raw OIDC token, raw workflow payload, repository source, customer data, review content, or workflow log is stored.

## Trust Boundary

GitHub Actions requests a short-lived token with the exact audience `https://getphame.app/api/automation/events`. The ingestion endpoint verifies the token signature from GitHub's discovery and JWKS endpoints and requires the documented issuer, audience, temporal claims, and unique `jti`.[1] The endpoint then applies exact allowlists for the immutable repository and owner IDs, repository name, protected branch ref, event name, and workflow path/ref. The workflow needs only `id-token: write` and `contents: read`; requesting an OIDC token does not itself grant repository write access.[1]

| Control      | Contract                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Issuer       | Exact `https://token.actions.githubusercontent.com`                                                                              |
| Audience     | Exact `https://getphame.app/api/automation/events`                                                                               |
| Repository   | Exact configured repository name plus immutable repository and owner IDs                                                         |
| Workflow     | Only `.github/workflows/workflow-drift-audit.yml` and `.github/workflows/dependabot-merge-observability.yml` on protected `main` |
| Events       | Drift: `schedule` or `workflow_dispatch`; Dependabot merge: `pull_request` on a closed, merged Dependabot pull request           |
| Time         | Signature plus `exp`, `nbf`, and `iat`; reject tokens issued more than five minutes before receipt                               |
| Replay       | Persist a SHA-256 fingerprint of `jti` behind a unique index; reject replays without storing the token                           |
| Body binding | Require body run ID, attempt, workflow identity, repository identity, and ref to match signed claims                             |
| Input        | Strict JSON schema, 16 KiB body limit, allowlisted status/failure codes, bounded strings, no raw logs                            |

## Durable Data

`automation_events` is an append-only, normalized event ledger. It stores event kind, result, repository/workflow identity, run identity, event timestamps, a safe run URL, bounded drift failure code/summary, and the minimum pull-request timestamps needed for Dependabot merge-time metrics. A unique event key makes retries idempotent. A unique OIDC `jti` fingerprint provides replay protection. Ingestion opportunistically removes records older than 400 days, while administrator queries are limited to 366 days.

`automation_alert_acknowledgements` stores only an event ID, administrator user ID, and acknowledgement timestamp behind a unique event/user index. Acknowledgement is per administrator. It never changes the underlying failed event and never hides a later failure.

| Event kind       | Stored operational fields                                                                             | Explicitly excluded                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Drift audit      | Result, run ID/number/attempt, workflow SHA, event time, duration, safe failure code/summary, run URL | Workflow logs, changed file contents, tokens, secrets              |
| Dependabot merge | Pull-request number, created/merged timestamps, run identity, run URL                                 | Pull-request body, commit diff, author email, dependency changelog |

## Alert Lifecycle

The global authenticated shell requests the latest drift state only for administrators. A warning banner appears when the newest drift event is failed and that administrator has not acknowledged that exact event. A later successful drift event clears the active warning for every administrator. Acknowledgement dismisses only the current event for the current administrator; the Automation Health page continues to show its failed history.

## Administrator Dashboard Contract

The `/admin/automation-health` route uses an `adminProcedure` query with preset windows of 7, 30, 90, or 366 days. The response contains summary metrics, daily Dependabot merge counts, daily drift pass/fail counts, latest drift status, and a newest-first bounded history list. Charts use real persisted events only, provide keyboard-accessible controls and an adjacent tabular/text summary, and never manufacture empty-state values.

## Activity Trend Export Contract

Activity Trend keeps the current 7, 30, and 90-day presets and adds an explicit custom date range. Custom dates are interpreted as inclusive user-local calendar days and converted to UTC boundaries before the query. The server requires both endpoints, rejects inverted or future-ending windows, and limits the range to 366 days. CSV and PNG exports use the active filtered snapshot. Export filenames include `YYYY-MM-DD_to_YYYY-MM-DD`; empty or all-zero snapshots remain non-exportable.

## Failure Recovery

Workflow telemetry publishing runs in an `always()` step and must not change the audit or Dependabot job's original conclusion. A transient telemetry delivery failure is visible in the workflow step but cannot turn a successful audit into a false drift failure. Retries reuse the deterministic event key but receive a new OIDC `jti`; the server returns the existing event as an idempotent success. If the application is unavailable, an administrator can rerun the workflow to backfill that event.

## References

[1]: https://docs.github.com/actions/reference/openid-connect-reference "GitHub Actions OpenID Connect reference"
[2]: https://token.actions.githubusercontent.com/.well-known/openid-configuration "GitHub Actions OIDC provider metadata"
