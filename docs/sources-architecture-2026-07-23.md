# Get Phame Sources Architecture

## Purpose

**Sources** is the single authenticated workspace for adding contact data to Get Phame. It consolidates CSV and WooCommerce intake behind a review-first, explicit-consent flow. Importing contacts never sends a message, starts a campaign, or schedules outreach.

## Architecture

| Layer | Responsibility |
|---|---|
| `drizzle/schema.ts` and migration `0026_jazzy_molecule_man.sql` | Additive connection, import, and PII-free event records with owner-scoped indexes and idempotency uniqueness |
| `shared/sourceTypes.ts` | Shared source, consent, row, and preview contracts |
| `server/sourceSecrets.ts` | Authenticated encryption and backward-compatible secret handling |
| `server/sourceSecurity.ts` | Public HTTPS store URL validation and private-network rejection |
| `server/sourceImportLogic.ts` | Deterministic normalization, validation, duplicate detection, payload hashing, and idempotency hashing |
| `server/sourceDb.ts` | Owner-scoped connection, preview, result, and audit-event persistence |
| `server/routers/sources.ts` | Protected connection, preview, consent, commit, history, and disconnect procedures |
| `client/src/pages/Sources.tsx` | Mobile-first source cards, CSV template/upload, WooCommerce lifecycle, consent review, preview, outcomes, and history |

## Supported and Planned Sources

| Source | Status | Behavior |
|---|---|---|
| CSV | Available | Local parsing, 2 MB and 1,000-row limits, sample template, explicit consent, preview, deduplication, reviewed commit |
| WooCommerce | Available | Encrypted read-only credentials, one-time manual fetch, staged review, explicit consent, preview, reviewed commit |
| Shopify | Planned | Visible as coming soon; unavailable because this Stripe-enabled project cannot add the managed Shopify integration |
| Square | Planned | Visible as coming soon |
| HubSpot | Planned | Visible as coming soon |
| Pipedrive | Planned | Visible as coming soon |

## Import State Machine

1. The owner chooses an available source.
2. Source rows are loaded or staged without contacting customers.
3. The owner records the lawful permission basis and where permission was captured.
4. The server normalizes rows, rejects missing or invalid email addresses, and detects duplicates against both the payload and owner-scoped saved contacts.
5. The owner reviews valid, duplicate, and rejected counts plus the normalized row preview.
6. A reviewed commit adds valid contacts to the canonical saved-contact store and skips duplicates.
7. A PII-free audit event records counts, source type, status, and consent metadata.
8. No send, campaign, reminder, or scheduled job is created.

## Security and Privacy Controls

| Control | Implementation |
|---|---|
| Authentication and authorization | Every Sources procedure is protected and scopes reads/writes to `ctx.user.id` |
| Credential secrecy | WooCommerce credentials are encrypted at rest, masked after saving, excluded from histories, and never logged |
| SSRF protection | Store URLs must use public HTTPS endpoints and are rejected when local, private, loopback, or link-local |
| Idempotency | Client keys are hashed with owner and source scope; payload hashes prevent mismatched reuse |
| Deduplication | Email normalization is case-insensitive and owner-scoped; duplicates are skipped rather than overwritten |
| PII minimization | Import history stores aggregate counts and consent metadata, not imported contact rows |
| Explicit consent | Preview creation requires attestation, permission basis, and a recorded source description |
| Manual-only imports | The legacy in-process WooCommerce scheduler was removed; no periodic source automation is registered |

## UX Contract

The page uses the established Get Phame navy, gold, card, typography, spacing, focus, and responsive tokens. Desktop and tablet users reach Sources from the primary sidebar; mobile users reach it through the account overflow so the five-tab bottom navigation remains stable. Every source has loading, empty, error, unavailable, preview, and completion states. CSV users can download a sample file. Rejected-row summaries explain how to correct source data. Tables are keyboard-scrollable and all controls retain visible focus indicators.

## Validation Contract

Focused Vitest coverage protects row normalization, rejected-row behavior, deduplication, deterministic payload hashes, owner/source idempotency scoping, encryption round-trips, tamper rejection, public URL validation, route and navigation registration, locale parity, explicit review, removal of duplicate Settings credentials, absence of background WooCommerce scheduling, sample CSV access, rejected-row feedback, and additive non-destructive migration SQL. The complete release gate additionally runs the full suite, TypeScript compiler, production audit, production build, migration review, and responsive authenticated verification.
