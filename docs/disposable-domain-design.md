# Disposable Email Domain Defense Design

## Approved policy

Get Phame will synchronize two maintained public feeds each night. The `disposable-email-domains/disposable-email-domains` list provides one input and `disposable/disposable-email-domains` normal-mode `domains.txt` provides the other. The related lookup site is a source-health reference only; the older third list is intentionally excluded. The system assigns a blocking confidence only when the approved source policy supports it and never treats DNS facts alone as evidence that an email address is disposable.

## Enforcement boundary

Only genuinely new accounts are rejected. Returning email, Google, and Apple users retain access even when their historical email domain later appears in the catalog. The rejection is a clear, localized request to use a non-disposable email address. The server must apply the guard again immediately before user creation so that an issued magic link cannot bypass a later catalog update.

## Scheduled operation

The project-owned Heartbeat callback runs with idempotency safeguards and records a singleton scheduler task identifier. It honors 2:00 AM `America/Los_Angeles` semantics across daylight-saving changes, normalizes and deduplicates domains, refreshes source provenance, performs bounded MX enrichment only for new or stale catalog entries, and marks entries inactive after 90 days absent from all active feeds. It does not attempt a full network reputation sweep inside a two-minute handler.

## Existing accounts

Public-list membership is insufficient justification for deletion or paid-access revocation. Existing matches are placed in an administrator-only, reversible review queue. No account is deleted, suspended, or exposed to other users through this feature.

## Deferred enrichment

IPQualityScore, reputation services, domain age, registrar reputation, DNS history, catch-all behavior, and fraud-report sources are deferred pending measured benefit, managed credentials, cost review, and privacy assessment.
