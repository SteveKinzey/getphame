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

The Sources router now uses the shared `paidProcedure` for WooCommerce connection, preview, and commit operations. Disconnect remains authenticated rather than paid-gated so a downgraded account can remove stored credentials. The Sources interface now reads the authoritative `profile.hasPaidAccess` entitlement, presents a localized paid-plan state, and handles `UPGRADE_REQUIRED` responses. The public FAQ now states that WooCommerce is available only on paid plans and accurately describes manual, consent-first imports with no automatic sending. All seven maintained locale catalogs were updated, and the locale cache identifier moved to `phame30`.

The stale cache-version, landing-locale, and Sources procedure-count regressions found by the consolidated full suite were corrected. These corrections have **not yet been rerun** because the pause was requested immediately after the next TypeScript check identified one remaining compile blocker.

## Exact known blocker

`pnpm check` currently reports one error:

```text
client/src/pages/Sources.tsx: Cannot find module '@/components/PaywallModal'
```

The consolidated branch does not contain that component. On resume, remove the unavailable modal import and state, use the branch’s existing localized `useLocation()` navigation pattern to send upgrade actions and `UPGRADE_REQUIRED` responses to `/upgrade`, and retain the current `profile.hasPaidAccess` and server `paidProcedure` checks.

## Last verification state

| Validation | Most recent result |
|---|---|
| Consolidated Vitest suite after paid-gate edits | **520 passed, 3 failed, 6 skipped** across 93 files |
| Three failures | Stale assertions in `googleVerificationHomepage.test.ts`, `landing-locales.test.ts`, and `sourcesWorkspace.test.ts`; all three were edited afterward but not rerun |
| TypeScript | One missing-module error for the unavailable `PaywallModal` import |
| Production build and responsive verification | Not rerun after the latest Sources and localization edits |
| Release status | Do not merge or publish until the resume queue is complete |

## Resume queue

1. Replace the missing Sources modal dependency with localized navigation to `/upgrade`, then run `pnpm check`.
2. Run the complete Vitest suite and resolve any remaining failures without weakening the WooCommerce paid, consent, deduplication, and no-automatic-send contracts.
3. Complete the send-request subject/body editor with preview, compliance checks, localization, and recipient rendering.
4. Enforce administrator-only template deletion in the backend, hide deletion controls for non-administrators, and add authorization regressions.
5. Add the Developer / API Keys enrollment flow, required identity and business details, scroll-to-review agreement, drawn signature, immutable agreement evidence, approval gates, least-privilege scopes, one-time secret reveal, expiry, revocation, and rotation.
6. Finish all seven-locale coverage for the developer, agreement, API-key, and send-time editor experiences.
7. Verify the Get Phame WooCommerce plugin and app connector end to end: enrollment, import-only key scope, authentication, credential security, pagination, consent/provenance, idempotency, deduplication, paid enforcement, and no automatic sending. Repair, version, test, and package the plugin if required.
8. Run focused tests, the full suite, TypeScript checks, dependency/security audit, production build, migration review, authenticated responsive verification, pull-request review, canonical merge, managed-project synchronization, checkpoint publication, and live-bundle confirmation.

## Resume instruction

Use this prompt when returning:

> Resume the Get Phame work from `PAUSE_RESUME_2026-07-23.md` on the saved `consolidation/push-safe` branch. Start with the missing Sources upgrade-navigation fix, then follow the resume queue in order. Do not merge or publish until every validation gate passes.
