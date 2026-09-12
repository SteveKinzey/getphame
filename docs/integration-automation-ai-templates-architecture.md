# Get Phame Integration Expansion: Source Automation Release and Staged Roadmap

**Status:** Implementation-accurate release contract  
**Date:** 2026-08-02  
**Primary repository:** `SteveKinzey/getphame`  
**Related connector repository:** `SteveKinzey/get-phame-connector`

## 1. Release boundary

This release ships the **main-application foundation for source-bound, consent-evidenced review-request automation**. A scoped developer key and an approved source connection can submit one customer event, pass existing suppression and delivery safeguards, complete a validated dry run, and then deliver immediately or through a managed delayed processor. The source remains import-only and inactive by default. A connector cannot choose another tenant, expand its own scopes, bypass a source pause, or override the server-owned template, review platform, locale, delay, quota, quiet-hours, or reminder rules.[1] [2]

The broader program also includes AI-assisted onboarding templates, regional and category-aware platform recommendations, WordPress/WooCommerce automation controls, and expanded role-specific manuals. This release adds **additive schema foundations** for several of those capabilities, but it does not represent them as activated customer features. The status table below is authoritative.

| Capability                                                                        | Release status         | Boundary                                                                                                                      |
| --------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Source-bound review-request event API                                             | Implemented            | Requires `contacts:write` and `review_requests:send`, a bound source ID, active automation, and an unpaused source            |
| Immutable review-outreach consent evidence                                        | Implemented            | Purpose is `review_outreach`; channel is `email`; exact text, version, timestamp, source, and privacy-policy URL are required |
| Idempotent import, suppression, dry run, immediate delivery, and delayed delivery | Implemented            | Stable `sourceSubmissionId` is the replay anchor; payload changes under the same ID are rejected                              |
| Managed delayed-event processor                                                   | Implemented            | Project-owned task UID, five-minute reconciliation, bounded batches, overlap suppression, sanitized failures                  |
| Localized setup and source-operations interface                                   | Implemented            | English, Spanish, French, Italian, Thai, Simplified Chinese, and Traditional Chinese                                          |
| Approved localized template-revision resolution                                   | Foundation implemented | Non-English delivery requires an approved localized revision with its English counterpart; AI generation is not activated     |
| AI-generated onboarding drafts                                                    | Staged roadmap         | No live generation or approval workflow is included in this release                                                           |
| Regional/category platform recommendation UI                                      | Staged roadmap         | Recommendation helper and schema metadata are foundations, not an activated customer workflow                                 |
| WordPress/WooCommerce automatic submission                                        | Staged roadmap         | The main application endpoint is ready; connector-side opt-in, queue, tests, and package release remain separate work         |
| Expanded role-specific manuals and verified screenshots                           | Staged roadmap         | Current setup guidance is updated; the complete manual expansion remains a separate release gate                              |

## 2. Non-negotiable controls

The implementation preserves six operating boundaries. **Import-only is the default.** New sources start with automation disabled and dry-run mode enabled. **Every request remains individual and neutral.** The system does not add review gating, sentiment filtering, fabricated reviews, or incentives tied to a positive outcome. **Consent purposes stay separate.** Review outreach, marketing, calls, and SMS are not interchangeable permissions. **Get Phame remains the sending system of record.** External tools submit events; they do not send review email. **Suppression is authoritative.** An opted-out contact is suppressed before dry run or delivery. **A live workflow must prove readiness first.** The source must complete a real provider dry run after its delivery-critical configuration was last changed.[1] [3]

The default review-outreach checkbox should remain unchecked and should be reviewed for the business’s jurisdiction:

> [ ] **I agree that {{business_name}} may email me about my recent purchase or service experience, including one review request and up to two follow-up reminders. I can unsubscribe at any time. Consent is not a condition of purchase. See the Privacy Policy.**

Promotional email requires a separate optional choice:

> [ ] **I would like to receive occasional marketing emails and offers from {{business_name}}. I can unsubscribe at any time. Consent is not a condition of purchase. See the Privacy Policy.**

These examples are operational defaults, not legal advice. United States commercial-email rules require accurate headers and subjects, identification, a valid postal address, an opt-out method, and prompt handling of opt-out requests.[13] The UK Information Commissioner’s Office recommends specific, informed consent captured through a clear affirmative action such as an unticked opt-in box.[14]

## 3. Public source-event contract

### 3.1 Routes and headers

The specific review-request routes are:

| Operation            | Primary route                                        | Accepted alias                        |
| -------------------- | ---------------------------------------------------- | ------------------------------------- |
| Submit event         | `POST /api/v1/source-events/review-request`          | `POST /api/v1/source-events`          |
| Read-only validation | `POST /api/v1/source-events/review-request/validate` | `POST /api/v1/source-events/validate` |

Every request uses `Content-Type: application/json`, `Authorization: Bearer <server-side-key>`, and `X-Get-Phame-Source: <bound-source-public-id>`. The API key must have both `contacts:write` and `review_requests:send`. The source ID must resolve to the same tenant and key. A browser page must never contain the bearer key.[1]

The canonical nested payload is:

```json
{
  "eventType": "review_request",
  "sourceSubmissionId": "order-10482-completed",
  "sourceFormId": "post-purchase-review-consent-v3",
  "name": "Example Customer",
  "email": "customer@example.com",
  "preferredLocale": "en",
  "sourceApp": "zapier",
  "externalId": "order-10482",
  "tags": ["completed-order"],
  "consent": {
    "confirmed": true,
    "basis": "explicit_opt_in",
    "purpose": "review_outreach",
    "channel": "email",
    "capturedAt": "2026-08-02T18:00:00Z",
    "source": "Post-purchase consent checkbox",
    "text": "I agree that Example Business may email me about my recent purchase or service experience, including a review request.",
    "version": "review-consent-v3",
    "privacyPolicyUrl": "https://example.com/privacy"
  }
}
```

The exact supported outreach locales are `en`, `es`, `fr`, `it`, `th`, `zh-CN`, and `zh-TW`. The API also accepts documented flat consent aliases for webhook builders, but both forms pass through the same strict nested consent schema. Recipient language is explicit; it is not inferred from a person’s name, email address, social profile, or IP address.[1] [4]

### 3.2 Validation and dry-run distinction

The **validation route is side-effect free**. It verifies authentication, key scope, source binding, source activation, pause state, payload and consent shape, contact suppression, business profile, SMTP readiness, quota, review destination, template selection, and approved localized revision requirements. It does not import a contact, claim an automation event, create a customer request, or send email.[1] [5]

The **provider dry run is a real idempotent source event** while the source’s `dryRun` flag is true. It imports or updates the contact, persists immutable consent evidence, applies suppression, and executes the same delivery-readiness validation without creating a customer request or sending email. Only a successful provider dry run records `dryRunCompletedAt`. Changing automation mode, delay, template, platform, or locale clears that evidence and returns the source to dry-run mode.[1] [3]

This distinction prevents a superficial in-app form submission from authorizing a workflow that has never demonstrated real provider mapping, consent fields, source binding, and delivery readiness.

### 3.3 Event outcomes

| Outcome                                              | HTTP behavior                               | Meaning                                                                                                |
| ---------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dry_run`                                            | `200`                                       | Contact and consent evidence were accepted; delivery readiness passed; no request or email was created |
| `scheduled`                                          | `202`                                       | The source event is durable and will be processed after its configured delay or retry time             |
| `sent` or quiet-hours queue status                   | `200`                                       | Shared delivery created the authoritative request and either sent or queued it                         |
| `suppressed`                                         | `202`                                       | The contact is opted out; no request or email was created                                              |
| idempotent replay                                    | `200`, or `409` for a terminal failed event | The original event result is returned without creating another request                                 |
| idempotency conflict                                 | `409`                                       | The same source submission ID was reused with a different payload hash                                 |
| automation disabled or paused                        | `409`                                       | The source kill switch blocks processing                                                               |
| authentication, scope, or source binding failure     | `401` or `403`                              | The credential or source relationship is invalid                                                       |
| temporary quota, adaptive limit, or delivery failure | `202` or `429`                              | A bounded retry is scheduled or the caller receives `Retry-After`                                      |

All public errors use stable envelopes and bounded codes. Runtime responses do not expose authorization headers, API-key material, raw provider payloads, stack traces, recipient addresses, or thrown error text.[1] [6]

## 4. Delivery and idempotency model

The event path uses one shared delivery service. Before creating a request it checks the business profile, SMTP state, free-tier quota, selected or default review platform, selected or default template, and approved localized revision requirements. It then creates a request with source, event, locale, template-revision, English-revision, and platform references; injects tracking; respects quiet hours; schedules reminders; and records the delivery result.[5]

A database-level unique constraint on `(userId, sourceConnectionId, sourceEventId)` prevents a second customer request for the same source event. If a worker retries after a crash, the delivery service reuses the authoritative existing request or queue result instead of sending another email.[5] [10]

Consent evidence is append-only for this workflow. The unique `(userId, sourceSubmissionId, purpose)` contract permits an exact replay but rejects conflicting evidence under the same source submission and purpose. The evidence row stores the exact consent text and its SHA-256 hash, version, source, timestamp, basis, purpose, channel, privacy-policy URL, source connection, and contact association.[4] [8]

## 5. Delayed processor and operational safety

Delayed events are processed through a managed Heartbeat callback at `/api/scheduled/source-automation`. The desired task runs every five minutes. The application persists the owned task UID, repairs schedule drift, and adopts a concurrently created task after a cold-start race rather than creating an uncontrolled duplicate.[7]

Each run claims at most 25 due events. Before delivery, the processor re-reads the source state, stops disabled or paused sources, re-checks contact suppression, honors dry-run state, and calls the same shared delivery service used by immediate events. Recoverable failures use bounded retries with stable error codes. The callback accepts only authenticated cron requests from the persisted task UID, deduplicates overlapping four-minute run windows, records generic run status, and returns only `SOURCE_AUTOMATION_PROCESSING_FAILED` for unhandled failures.[6] [7]

| Operator control           | Implemented behavior                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Remote kill switch         | Disable automation or pause the source in Get Phame                                    |
| Dry-run gate               | Live mode is rejected until durable dry-run completion evidence exists                 |
| Configuration invalidation | Delivery-critical changes clear dry-run evidence and restore dry-run mode              |
| Delay                      | Per-source value is bounded from 0 to 43,200 minutes                                   |
| Retry                      | Durable event status, attempt count, next due time, and stable error code              |
| Overlap control            | Scheduler run claim prevents concurrent processing windows                             |
| Secret safety              | Callback and processor logs omit raw exception details and provider data               |
| Suppression                | Opt-out is checked on initial submission and again immediately before delayed delivery |

## 6. Source setup and health interface

The managed source panel now uses the review-request endpoint rather than an import-only recipe. Zapier, Make, and custom instructions show the source header, authorization placeholder, stable replay identifier, nested consent evidence, explicit locale, validation route, dry-run sequence, safe retry behavior, and pause/revocation guidance.[11]

For each source, the owner can configure automation mode, dry-run/live state, delay, approved template, verified platform, and outreach locale. Live activation remains server-enforced; the interface cannot bypass the completed-dry-run invariant. The workspace also exposes source health, the last successful automation, bounded failure state, safe retry guidance, and pause/resume controls without displaying recipient details or credential values.[11]

All new source setup and automation copy is present in the seven maintained locale catalogs and the complete offline fallback bundle. Locale and service-worker cache versions were advanced so installed PWA clients receive the updated content.[11]

## 7. Additive migrations

| Revision                        | Purpose                                                                                                                                                                   | Destructive statements |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `0047_parallel_spectrum.sql`    | Adds consent evidence, source automation events, immutable template revisions, explicit locale fields, source automation settings, and additive profile/platform metadata | None                   |
| `0048_clean_baron_zemo.sql`     | Adds the customer-request source-event uniqueness constraint                                                                                                              | None                   |
| `0049_curvy_the_santerians.sql` | Adds persisted source-automation scheduler ownership and run state                                                                                                        | None                   |
| `0050_bouncy_la_nuit.sql`       | Adds durable `dryRunCompletedAt` evidence to source connections                                                                                                           | None                   |

The current release does not drop or rename existing tables or columns. Existing templates retain their mutable compatibility fields. The new immutable revision table and English-counterpart references are available to the shared delivery validator, but AI generation and complete template-family management remain staged.[8] [9] [10]

## 8. Regression evidence

Focused tests cover public endpoint source binding, idempotent replay and conflict, consent persistence, suppression-safe dry runs, delayed scheduling, immediate delivery, bounded retries, authenticated preflight, tenant scoping, delivery-code mapping, processor suppression and retries, bounded batches, scheduler creation and repair, task-UID authorization, overlap deduplication, sanitized failures, seven-locale direct-key coverage, cache-version contracts, and the managed-source UI contract.[12]

The release gate still requires the repository-wide suite, TypeScript validation, production build, dependency/security checks, migration application in order, mobile and desktop responsive review, and protected-main parity. Focused tests are necessary evidence, not a substitute for the complete release gate.

## 9. Rollout and rollback

Rollout should proceed in four controlled stages:

1. Apply migrations `0047` through `0050` in order and verify the schema journal.
2. Reconcile the single project-owned Heartbeat task while every source remains import-only or disabled.
3. Enable review-request mode and dry run for selected internal sources; submit validation and real provider dry-run events.
4. Enable live automation only after the source reports current dry-run completion evidence and operator review.

Rollback is operational first. Disable automation or pause every affected source, disable the scheduled processor if required, and return integrations to import-only behavior. Keep consent, automation, request, queue, and scheduler records intact for audit and recovery. Do not delete evidence or drop additive columns during an incident rollback.[2] [3]

## 10. Staged follow-on releases

The following work remains outside this release and must not be presented as active until its own implementation and release gates pass:

| Follow-on                         | Required completion evidence                                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI onboarding templates           | Structured model output, prompt-injection fixtures, variable allowlist, deterministic fallback, English counterpart, preview/edit/regenerate/skip, explicit approval, rate and timeout limits |
| Template-family management        | Legacy backfill, immutable revisions for every edit, transactional activation, complete request/reminder/queue snapshots, administrator controls                                              |
| Regional platform recommendations | Evidence-backed catalog, localized rationale, owner confirmation of country/region/category, URL validation, Yelp instruction-only treatment, editable destination selection                  |
| WordPress/WooCommerce automation  | Explicit local opt-in, stable order event ID, dry run, local and remote kill switches, bounded retry queue, PHPUnit/WordPress capability and nonce tests, redacted logs, signed package       |
| Manuals and screenshots           | Role-exclusive user/admin topics in seven locales, verified redacted media, alt text, checksum/version metadata, synchronized in-app and PDF export                                           |

## References

[1]: ../server/publicApi.ts "Get Phame public source-event and validation routes"
[2]: ../server/sourceConnections.ts "Get Phame source-connection defaults, activation gates, and pause controls"
[3]: ../server/sourceAutomation.ts "Get Phame source-event ledger, consent evidence, dry-run completion, claims, and retries"
[4]: ../server/integrationExpansion.ts "Get Phame consent schema and supported outreach locales"
[5]: ../server/reviewRequestDelivery.ts "Get Phame delivery validation and shared request-delivery service"
[6]: ../server/sourceAutomationProcessor.ts "Get Phame delayed source-event processor and authenticated callback"
[7]: ../server/sourceAutomationHeartbeat.ts "Get Phame managed Heartbeat ownership and reconciliation"
[8]: ../drizzle/0047_parallel_spectrum.sql "Get Phame integration-expansion migration 0047"
[9]: ../drizzle/0049_curvy_the_santerians.sql "Get Phame source-automation scheduler migration 0049"
[10]: ../drizzle/0048_clean_baron_zemo.sql "Get Phame source-event request uniqueness migration 0048"
[11]: ../client/src/components/SourceAutomationWorkspace.tsx "Get Phame localized source-automation workspace"
[12]: ../server/publicApi.sourceEvents.test.ts "Get Phame source-event endpoint regression tests"
[13]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC — CAN-SPAM Act: A Compliance Guide for Business"
[14]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/ "ICO — Electronic and telephone marketing"
