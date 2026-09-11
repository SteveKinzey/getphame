# Get Phame Developer API Contract

## Purpose

The Developer API lets a signed-in Get Phame business create revocable API keys and import customers from external forms. Importing a contact **never sends a review request automatically**. Outreach remains a separate, explicit action governed by the account’s quota, connected email transport, opt-out state, platform-compliance rules, and existing send workflows.

## Compatibility and Versioning

The canonical endpoint is `POST /api/v1/contacts`. The existing `POST /api/public/contacts` route remains available as a compatibility alias. Existing `rl_` keys remain valid. New keys use the recognizable `gp_live_` prefix; both formats authenticate through the same hashed-key service so current form configurations continue to work.

Authentication accepts either `Authorization: Bearer gp_live_…` or `X-Get-Phame-Key: gp_live_…`; legacy `rl_…` values remain supported. Keys are never accepted in query strings, request bodies, logs, analytics, support summaries, or chatbot context.

## API-Key Contract

| Concern             | Contract                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret storage      | Show the raw key once; store only its SHA-256 hash and a non-secret display prefix                                                                                      |
| Ownership           | Every key belongs to exactly one signed-in Get Phame account                                                                                                            |
| Scopes              | `contacts:write` and `review_requests:send`; new keys default to import-only                                                                                            |
| Existing keys       | Migration grants both legacy capabilities so existing integrations do not break                                                                                         |
| Rotation            | Create a replacement key, then revoke the old key; never reveal an existing raw secret                                                                                  |
| Revocation          | Immediate soft revocation with owner-scoped authorization                                                                                                               |
| Expiry              | Optional earlier UTC expiry plus mandatory expiry after 12 months without a successful API request                                                                      |
| Inactivity warnings | Show in-app warnings at 30 days and 7 days before the inactivity date; keep expired keys visible for audit context and rotation                                         |
| Usage metadata      | Update last-successful-use time and successful-use count only after a completed side effect or valid idempotent replay; never store the raw key or authorization header |
| Rate limit          | 60 authenticated requests per key per rolling minute, enforced by key identity rather than a raw-key fragment                                                           |
| Abuse protection    | Persist privacy-hashed key, account, trusted-proxy IP, and recipient velocity windows; temporarily suspend broad-limit offenders for 24 hours                           |

## Contact Import Request

```json
{
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "phone": "+1 555 010 2040",
  "notes": "Completed service appointment",
  "tags": ["website-form", "completed-service"],
  "externalId": "form-submission-1842",
  "sourceApp": "gravity-forms",
  "consent": {
    "confirmed": true,
    "basis": "customer_relationship",
    "capturedAt": "2026-07-22T20:00:00.000Z",
    "source": "Checkout confirmation checkbox"
  }
}
```

`name` and `email` are required. `consent.confirmed` must be `true` on the canonical v1 endpoint. Supported consent bases are `customer_relationship`, `explicit_opt_in`, and `other`. The optional `capturedAt` value must be a valid ISO-8601 timestamp that is not unreasonably in the future. Free-text fields and arrays have strict length and count limits.

The integration should send an `Idempotency-Key` header containing a stable form-submission identifier. Get Phame hashes that value, binds it to the API key, and replays the original result for duplicate deliveries. Reusing the same idempotency key with a different payload returns HTTP `409`.

## Import Response

```json
{
  "success": true,
  "contactId": 1842,
  "created": true,
  "deduplicated": false,
  "idempotentReplay": false
}
```

Contacts are deduplicated by normalized email address within the owning Get Phame account. An existing contact is never re-enrolled or emailed. Safe mutable fields may be supplemented without overwriting manually maintained identity data. Contacts that have opted out remain opted out.

## Audit and Privacy

The saved contact contains the name and email required for future account-owner actions. Import audit records do not duplicate the plaintext email. They store a masked email, a one-way fingerprint, the API key identity, source application, consent basis, outcome code, contact identifier, and timestamp. Rejected requests store bounded error codes rather than payloads or secrets.

Idempotency, rate-limit, and abuse-window records contain hashes and counters only. Raw IP addresses and recipient addresses are never stored in abuse-control tables. Old operational records are pruned opportunistically during API traffic, while key inactivity is evaluated centrally during authentication and key listing; no in-process timer is required.

## Abuse Safeguards

Abuse checks execute before contact persistence, webhook activity, quota consumption, or email delivery. Import traffic receives account, IP, and per-recipient velocity controls in addition to the general per-key limit. The separate individual-send endpoint receives stricter per-key, account-burst, account-daily, IP, and per-recipient controls. A broad threshold breach suspends the key for 24 hours; a recipient-only breach blocks that destination without immediately suspending the entire integration. Repeated recipient breaches still contribute to broader account and key counters.

Limits are applied to successful and rejected attempts so repeated abusive retries cannot evade protection. A blocked response includes a `Retry-After` header and a stable code, while the audit record stores only the key identity, masked recipient metadata, bounded reason code, outcome, and timestamp. Key rotation is unavailable during an active abuse suspension so a suspended actor cannot bypass the protection window.

## Error Contract

| HTTP status | Stable code            | Meaning                                                                 |
| ----------: | ---------------------- | ----------------------------------------------------------------------- |
|         400 | `INVALID_REQUEST`      | Required or bounded fields failed validation                            |
|         401 | `INVALID_API_KEY`      | The key is missing, unknown, revoked, or expired                        |
|         401 | `API_KEY_INACTIVE`     | The key expired after 12 months without a successful request            |
|         403 | `INSUFFICIENT_SCOPE`   | The authenticated key lacks the endpoint scope                          |
|         409 | `IDEMPOTENCY_CONFLICT` | An idempotency key was reused with a different payload                  |
|         422 | `CONSENT_REQUIRED`     | The canonical import endpoint lacks affirmative consent attestation     |
|         429 | `RATE_LIMITED`         | The per-key request limit was exceeded                                  |
|         429 | `API_KEY_SUSPENDED`    | The key is inside an active abuse-protection suspension window          |
|         429 | `ABUSE_PROTECTION`     | A key, account, IP, or recipient velocity safeguard blocked the request |
|         500 | `INTERNAL_ERROR`       | A safe, retryable server error occurred                                 |

Responses never expose database errors, stack traces, credentials, hashes, or account existence beyond what the authenticated key already establishes.

## Form-Builder Mapping

WS Form, Gravity Forms, Fluent Forms, Elementor Forms, and generic webhook tools all call the same endpoint and payload. Product-specific guides differ only in where the webhook URL, header, and JSON field mappings are entered. The documentation must use placeholders for secrets and must never render an account’s raw key into copyable examples after its one-time creation screen is dismissed.

## Supported Form and Automation Paths

| Platform            | Connection pattern                                                                                                            | Stable idempotency value            | Key handling                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Zapier              | Webhooks by Zapier POST or Custom Request directly to the v1 endpoint. Map every JSON field explicitly.                       | Original source event ID            | Zapier protected connection or header configuration.                                          |
| Make                | HTTP > Make a request (v4), POST with an `application/json` data structure. Treat non-2xx responses as errors.                | Original source event ID            | Make protected credential store.                                                              |
| Jotform             | Native Jotform Webhooks to a trusted HTTPS bridge, then the bridge posts normalized JSON to the v1 endpoint.                  | `submissionID`                      | The bridge only; Jotform's native webhook setup does not document protected outbound headers. |
| Elementor Pro Forms | A reviewed server-side WordPress form action or bridge forwards the submission after validation.                              | Persisted server-side submission ID | WordPress server configuration only.                                                          |
| Gravity Forms       | Webhooks Add-On feed using POST, JSON, selected fields, and protected headers.                                                | Namespaced `{entry_id}`             | Webhook feed header configuration or a server-side filter.                                    |
| WS Form             | Submitted-only Webhook Action using JSON, Header Mapping, and SSL verification.                                               | Namespaced `#submit_id`             | Header Mapping or a server-side filter.                                                       |
| Contact Form 7      | A reviewed WordPress plugin or mu-plugin uses `wpcf7_before_send_mail`, validates sanitized data, and posts JSON server-side. | Persisted server-generated key      | WordPress server configuration only.                                                          |

Do not put a Get Phame key in browser JavaScript, a public webhook URL, a query string, or a form field. Each bridge must validate its expected form identifier and affirmative consent before forwarding; all retries must reuse the same stable idempotency value. Contact import remains import-only: it does not queue or send review outreach.
