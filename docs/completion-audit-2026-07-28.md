# Get Phame Completion Audit

**Audit date:** 2026-07-28  
**Author:** Manus AI  
**Protected repository:** [SteveKinzey/getphame](https://github.com/SteveKinzey/getphame)  
**Connector repository:** [SteveKinzey/get-phame-connector](https://github.com/SteveKinzey/get-phame-connector)

## Executive finding

The current deployed Get Phame tree and protected GitHub `main` were synchronized before this audit. Most inherited unchecked entries are stale bookkeeping for functionality already present, tested, and released. The branch and ledger audit found five genuine interrupted deliverables: the reusable administrator CSV-preview skill was never installed; individual sends still lack send-time subject/body editing; the Help Assistant component exists but is not mounted; Mailjet is absent from the SMTP provider flow; and the standalone WordPress connector still targets the obsolete automatic `/api/public/contacts` contract instead of the consent-first Sources API.

## Completion matrix

| Workstream | Classification | Evidence | Completion requirement |
|---|---|---|---|
| Managed checkpoint and protected `main` | Completed before corrective work | Protected `main` merge tree matched checkpoint `8dbaf19b`; PRs #36 and #37 closed the last login-order release. | Recheck exact-tree parity after all corrective work is released. |
| Active session ledger | In progress | `todo-nsa5x2yj.md` contains only the explicit completion-audit and confirmed-gap tasks added for this request. | Finish and check every active item; leave no unchecked task. |
| Other `todo*.md` ledgers | Stale bookkeeping plus confirmed inherited gaps | Read-only audit found unchecked entries only in `todo-fnggkeft.md`; current protected-main implementation and reconciliation documents prove most of those entries were released. | Do not edit the other session ledger. Complete confirmed gaps in the active ledger and document stale items here. |
| Administrator revenue controls and complimentary entitlements | Completed | Protected main contains administrator privilege controls, grant/revoke procedures, coupon duration semantics, and focused regression coverage. | No product change. |
| Administrator CSV preview workflow | Product completed; reusable skill missing | Protected main contains selectable-column sanitized preview, copy/download, date-range export naming, and tests. The promised reusable administrator CSV-preview skill directory is absent. | Package and validate the missing reusable skill without changing working product behavior. |
| Consent-first Sources imports | Completed in the SaaS app | Protected main contains source connections, `contacts:write` key scoping, preview/commit flows, consent confirmation, source attribution, idempotency, provenance, and tests. | Preserve this contract while repairing the standalone connector. |
| Individual send subject/body editor | Confirmed gap | `client/src/pages/SendRequest.tsx` shows a read-only template preview and sends only `templateId`; no send-time override contract exists. | Add localized editable subject/body fields, recipient rendering, truthful preview, server validation, compliance checks, and focused tests without mutating the saved template. |
| Template deletion authorization | Completed as ownership-scoped behavior | The authenticated procedure calls a database delete constrained by both `userId` and `templateId`. | Preserve user-owned deletion; do not incorrectly convert it to administrator-only. |
| Developer/API enrollment | Completed and intentionally superseded in one detail | Protected main contains versioned Terms/AUP acceptance, privacy-safe evidence, default import scope, administrator approval for send scope, one-time reveal, rotation, revocation, expiry, and localization tests. | Preserve versioned acceptance evidence; do not add a drawn-signature privacy regression. |
| Global Help Assistant | Confirmed gap | `client/src/components/HelpAssistant.tsx` implements the assistant and support escalation, but no protected-main route or layout mounts it. | Mount it across public and authenticated pages, keep anonymous use safe, persist minimization, use the branded question-mark launcher, localize it, and add accessibility/regression coverage. |
| Mailjet SMTP preset | Confirmed gap | The preserved WIP branch contains a Mailjet intent, while protected main exposes no Mailjet preset or setup guidance. | Add correct Mailjet host, port, TLS, API-key/secret fields, detection, localized instructions, validation, and tests without exposing credentials. |
| WordPress/WooCommerce connector | Confirmed incompatible release | Connector `main` at `83108ae6e84bb562682e21dac286907d01a39890` uses `/api/public/contacts`, requires `rl_`, sends only name/email, creates a real test contact, and automatically uploads queued contacts every six hours. | Release a consent-first connector using `/api/v1/contacts`, current keys, authorized source ID, affirmative consent, stable idempotency, provenance, local preview/approval, safe retries, migrations, tests, documentation, and a versioned ZIP. Detection may be automatic; transfer must require explicit approval. |
| Pull request #33 | Stale duplicate | Its premium-conversion commit tree matches the already released premium checkpoint `60b90d9f292b9efc08201f22289534ba058528c5`, which is reachable from protected main. | Close as superseded after corrective releases; do not merge duplicate history. |
| `reconcile/main-with-validated-checkpoint` branch | Superseded preserved history | Its compatibility-router and reconciliation changes are present under newer modularized contracts or intentionally replaced on protected main. | Preserve branch history; no merge or deletion is required for task completion. |
| `consolidation/push-safe` branch | Mixed preserved history | Most branch-only work is independently released; the branch also preserves the five interrupted deliverables classified above. | Complete the five gaps from current protected main, not by merging the stale aggregate branch. Preserve it unless a separate cleanup request authorizes deletion. |

## Acceptance contracts for confirmed gaps

The CSV-preview skill is complete when its package documents the user-facing workflow, security sanitization, authorization boundary, selectable-column preview, locale-aware formatting, clipboard/download behavior, active date-range filename convention, error states, and test checklist, and when the skill-creator validation workflow passes.

The individual send editor is complete when a user can edit subject and body for one recipient without modifying the saved template; supported variables render against the actual recipient and business context; the final preview matches the payload sent; invalid, oversized, or dangerous content is rejected server-side; compliance confirmation remains mandatory; all maintained locales expose complete copy; and focused plus full release gates pass.

The Help Assistant is complete when it is reachable from every public and authenticated route, anonymous users trigger no protected query failure, minimized preference persists, the minimized launcher is a branded accessible question mark, unanswered questions open the existing support flow addressed to `support@getphame.app`, and keyboard, localization, mobile, and desktop regressions pass.

Mailjet support is complete when provider selection or detection configures `in-v3.mailjet.com`, port `587`, TLS, API key as username, secret key as password, clear localized setup guidance, and the same encrypted credential storage and connection validation used by other SMTP providers. No credential value may appear in source, logs, screenshots, tests, or documentation.

The connector is complete when it stores no plaintext telemetry beyond WordPress options protected by administrator capability; detects eligible WooCommerce customers into a local preview queue; requires administrator confirmation of customer-relationship consent before transfer; sends an authorized source identifier and stable per-order idempotency key to `/api/v1/contacts`; never automatically sends review requests; handles duplicate, retryable, revoked-key, forbidden-source, and validation responses safely; upgrades existing installations without data loss; passes syntax, security, behavior, and package checks; and merges through the connector repository’s protected workflow.

## Release rule

Corrective application work must pass focused tests, the complete Vitest suite, TypeScript, the unweakened production dependency audit, production build, and representative multilingual mobile/desktop verification before a managed checkpoint. The exact checkpoint tree must then merge normally through protected GitHub `main`. Connector work must be validated and released independently through `SteveKinzey/get-phame-connector`; stale or unique branches must never be force-pushed or deleted as a side effect of completion.
