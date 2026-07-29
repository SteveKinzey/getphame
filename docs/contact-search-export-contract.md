# Conversational Contact Search and Export Contract

## Product outcome

Authenticated Get Phame users can describe the contacts they need in ordinary language, review how the query was interpreted, continue using the existing deterministic filters, and export only their resulting contact data as a sanitized CSV or a readable PDF.

## Search boundary

The server receives a trimmed query of 3–300 characters and the active supported locale. The built-in model receives only that query, the current UTC date, and the closed filter schema. Contact records, customer lists, notes, and account data are never sent to the model.

The model may return only these structured filters:

| Filter | Allowed values |
| --- | --- |
| Text | Bounded free text for name, email, phone, notes, tags, or source application |
| Source | `manual`, `woocommerce`, `stripe`, `koalendar`, `api`, or no restriction |
| Tag | One bounded tag value or no restriction |
| Send state | Any, never sent, sent at least once, or not sent within a bounded number of days |
| Consent state | Any, consent recorded, or consent not recorded |
| Suppression state | Any, active, or opted out |
| Created range | Optional valid `YYYY-MM-DD` lower and upper bounds |
| Sort | Relevance, name, oldest/newest last send, or newest creation |

The response is validated again with Zod. Invalid or unavailable model output falls back to deterministic text search, never to an unrestricted model-generated database query. The server loads contacts through the existing `listSavedContacts(ctx.user.id)` tenant boundary, applies only allowlisted predicates, caps returned rows at 200, and returns the parsed filters, matched count, total count, truncation state, and safe result records.

## Explainability and privacy

The client renders localized filter chips derived from the validated structure. It does not display model reasoning. Search results include direct links/actions already available on Saved Contacts. Requests are rate-limited per authenticated user and are not stored as a durable conversation transcript.

## Export boundary

Exports use the currently displayed result set after conversational and manual filters. The fixed allowlist is: name, email, phone, tags, source, consent basis, consent captured date, send count, last sent date, suppression status, and created date. Internal IDs, external provider IDs, API-key IDs, raw metadata, and account identifiers are excluded.

CSV cells beginning with spreadsheet formula characters are prefixed with an apostrophe. CSV values follow RFC-style quoting and UTF-8 output. PDF output uses the existing Unicode-capable jsPDF helper and is limited to 750 rows; CSV is limited to 5,000 rows. The UI explains any truncation before download.

Filenames use the actual exported records’ creation-date span: `get-phame-contacts-YYYY-MM-DD_to_YYYY-MM-DD.csv` or `.pdf`. An empty export uses the current date for both bounds.

## Loading and motion

The initial contact query, conversational interpretation, and export preparation each expose distinct loading states. Skeleton rows preserve the final card geometry, buttons expose busy/disabled state, and result entrances use existing short opacity/transform transitions. All non-essential motion is disabled by the existing reduced-motion contract.

## Acceptance gates

Focused tests must prove structured validation, deterministic fallback, tenant-scoped retrieval, filter semantics, result bounds, formula neutralization, column allowlisting, date-range filenames, PDF row limits, and LLM data minimization. The release also requires full Vitest, strict TypeScript, production dependency audit/build, and responsive desktop/mobile verification.
