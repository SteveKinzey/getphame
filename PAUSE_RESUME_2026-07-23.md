# Get Phame Work-in-Progress Pause Record

**Paused at the user’s request on July 23, 2026.** This snapshot is intentionally **not release-ready**. Resume from the saved integration branch and complete the validation sequence before merging or publishing.

## Saved branch state

| Item | Saved value |
|---|---|
| Repository | `SteveKinzey/getphame` |
| Local branch | `consolidation/push-safe` |
| Base commit before this WIP snapshot | `4f8c5b29e08ac21b9b5a3b6b825dc268c59d8e8c` |
| Previous upstream | `origin/consolidation/branches-deps-2026-07-22` |
| Session checklist | `todo-fnggkeft.md` |
| Primary user request in progress | Make sure the Get Phame WooCommerce plugin and app connector work end to end |

## Current work in progress

The Sources router now uses the shared `paidProcedure` for WooCommerce connection, preview, and commit operations. Disconnect remains authenticated rather than paid-gated so a downgraded account can remove stored credentials. The Sources interface now reads the authoritative `profile.hasPaidAccess` entitlement, presents a localized paid-plan state, and handles `UPGRADE_REQUIRED` responses. The public FAQ now states that WooCommerce is available only on paid plans and accurately describes manual, consent-first imports with no automatic sending. All seven maintained locale catalogs were updated, and the locale cache identifier is now `phame31`.

The stale cache-version, landing-locale, and Sources procedure-count regressions found by the consolidated full suite were corrected. These corrections have **not yet been rerun** because the pause was requested immediately after the next TypeScript check identified one remaining compile blocker.

## Resumed Mailjet research completed

The previously omitted Mailjet row is now source-verified and implemented as the thirteenth first-class Bulk Sender preset. It uses `in-v3.mailjet.com`, port `587`, STARTTLS, the Mailjet API Key as the SMTP username, and the Mailjet Secret Key as the SMTP password. The UI explicitly warns users not to enter their normal Mailjet account password and requires the From address or domain to be validated in Mailjet. No regional selector, credentials, or account-password field was introduced.

Mailjet-specific labels and setup guidance were added across all seven maintained locales, while the existing Custom SMTP fallback remains available. The provider matrix now cites Mailjet’s official relay, sender/domain, security, and pricing documentation; the detailed decision record is in `docs/mailjet-smtp-research.md`. Focused Mailjet and Settings tests pass, the complete suite passes with **522 tests passed and 6 skipped across 93 files**, and `pnpm audit --audit-level high` reports no known vulnerabilities. TypeScript and production build remain blocked only by the separate pre-existing `Sources.tsx` import described below.

## Newly queued global chatbot requirement

The Help Assistant must be available on **every public and authenticated route**, including the public Home/landing page and authenticated Home page. The current implementation is mounted only in `AppLayout`, so logged-out visitors and standalone public routes do not receive it. On resume, mount `HelpAssistant` exactly once inside the top-level theme/translation/tRPC provider tree in `App.tsx`, adjacent to `AppShell`, and remove the existing `AppLayout` instance to prevent duplicate launchers.

The current assistant backend is `protectedProcedure`, although the requested Home-page coverage includes logged-out visitors. Add a public-safe assistant contract that continues to use only curated Get Phame sources, redacts likely secrets, never infers account state, returns the existing structured confidence result, and applies bounded rate limiting by authenticated user when available or a privacy-safe request key for anonymous visitors. Do not expose account-specific data or privileged procedures through the public assistant.

The minimized state must be an accessible compact launcher rather than the current generic `HelpCircle` plus “Help” pill. Use a text-rendered **stylized question mark** in Poppins 900 with the official Get Phame gold/navy tokens and a subtle four-point-star accent; do not substitute a generated logo or generic review-star icon. Provide localized screen-reader text and tooltip, a visible gold focus ring, a minimum 48×48 touch target, pressed feedback, reduced-motion support, and safe-area positioning that avoids the authenticated mobile bottom navigation. Persist the minimized preference per browser with a storage-safe fallback when local storage is unavailable.

The assistant already detects insufficient sources, invalid model output, low confidence, and backend failure as escalation cases. In those cases, automatically present the existing durable `SupportDialog` with the last unanswered question prefilled as a technical support request. Extend `SupportDialog` with typed prefill values for subject, message, topic, name, and email where available, while preserving editable fields, validation, the honeypot, screenshot support, and explicit user confirmation. Do **not** silently email chat content. The existing public support procedure must remain the submission path: it rate-limits the request, stores a durable support record, and calls the server-side mailer whose authoritative recipient is `support@getphame.app` and whose `replyTo` is the requester’s email.

| Acceptance area | Required result |
|---|---|
| Global presence | One assistant instance on Home, landing, public product/legal/auth routes, authenticated routes, admin routes, and fallback routes |
| Minimize/restore | Keyboard- and touch-accessible minimize control; compact branded “?” launcher restores the panel without losing the in-memory conversation |
| Public safety | Anonymous questions are rate-limited and grounded only in approved sources; no account data, secrets, or durable transcript leakage |
| Escalation | Low-confidence/fallback answer opens a prefilled support request; the user confirms and supplies a reply email before submission |
| Delivery | Support submission is stored, notification is sent server-side to `support@getphame.app`, and failure states remain retryable |
| Localization | All new chatbot, launcher, consent, prefill, anonymous-limit, success, error, and offline copy exists in all seven maintained locales |
| Responsive behavior | Launcher does not overlap mobile navigation, install prompts, forms, or dialog controls at mobile, tablet, and desktop widths |
| Regression coverage | Tests prove single-instance global mounting, anonymous/authenticated boundaries, rate limits, fallback prefill, mailbox routing, accessibility, persistence, and locale coverage |

## Exact known blocker

`pnpm check` currently reports one error:

```text
client/src/pages/Sources.tsx: Cannot find module '@/components/PaywallModal'
```

The consolidated branch does not contain that component. On resume, remove the unavailable modal import and state, use the branch’s existing localized `useLocation()` navigation pattern to send upgrade actions and `UPGRADE_REQUIRED` responses to `/upgrade`, and retain the current `profile.hasPaidAccess` and server `paidProcedure` checks.

## Last verification state

| Validation | Most recent result |
|---|---|
| Consolidated Vitest suite after Mailjet and paid-gate edits | **522 passed, 6 skipped** across 93 files |
| Focused Mailjet and Settings regressions | **59 passed** across 4 files |
| Dependency audit | `pnpm audit --audit-level high`: no known vulnerabilities |
| TypeScript | One inherited missing-module error for the unavailable `PaywallModal` import; no Mailjet type error reported |
| Production build | Client bundling is blocked by the same inherited `PaywallModal` import after all 522 tests pass |
| Responsive verification | Not run because the consolidated branch is not buildable until the inherited Sources blocker is removed |
| Release status | Do not merge or publish until the resume queue is complete |

## Resume queue

1. Replace the missing Sources modal dependency with localized navigation to `/upgrade`, then run `pnpm check`.
2. Run the complete Vitest suite and resolve any remaining failures without weakening the WooCommerce paid, consent, deduplication, and no-automatic-send contracts.
3. Implement the global Help Assistant specification above: one all-route mount, public-safe assistant access, branded minimized “?” launcher, persisted minimize preference, typed support prefill, confirmed durable escalation, seven-locale coverage, and focused regressions.
4. Complete the send-request subject/body editor with preview, compliance checks, localization, and recipient rendering.
5. Enforce administrator-only template deletion in the backend, hide deletion controls for non-administrators, and add authorization regressions.
6. Add the Developer / API Keys enrollment flow, required identity and business details, scroll-to-review agreement, drawn signature, immutable agreement evidence, approval gates, least-privilege scopes, one-time secret reveal, expiry, revocation, and rotation.
7. Finish all seven-locale coverage for the developer, agreement, API-key, and send-time editor experiences.
8. Verify the Get Phame WooCommerce plugin and app connector end to end: enrollment, import-only key scope, authentication, credential security, pagination, consent/provenance, idempotency, deduplication, paid enforcement, and no automatic sending. Repair, version, test, and package the plugin if required.
9. Run focused tests, the full suite, TypeScript checks, dependency/security audit, production build, migration review, authenticated responsive verification, pull-request review, canonical merge, managed-project synchronization, checkpoint publication, and live-bundle confirmation.

## Resume instruction

Use this prompt when returning:

> Resume the Get Phame work from `PAUSE_RESUME_2026-07-23.md` on the saved `consolidation/push-safe` branch. Start with the missing Sources upgrade-navigation fix and restore a green baseline, then implement the global all-page Help Assistant and follow the remaining resume queue in order. Do not merge or publish until every validation gate passes.
