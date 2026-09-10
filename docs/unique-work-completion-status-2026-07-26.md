# Unique unreleased work: completion status and execution plan

**Assessment date:** 2026-07-25 PDT / 2026-07-26 UTC  
**Repository:** `SteveKinzey/getphame`  
**Historical source:** `unique-work-disposition.png`  
**Historical branch:** `consolidation/push-safe`  
**Current protected-main baseline:** `8a3db86c915b750cdf261993f34a8c2a7cac1541`

## Executive status

The historical graphic is still accurate as a record of what existed when it was created, but **three of its four workstream dispositions are now outdated because current `main` has moved forward**. The branch still contains 27 unique commits and 20 branch-only files, but it is now 109 commits behind `main`, with 273 final-tree files changed. That makes a wholesale merge less appropriate than it was when the graphic showed 96 commits behind and 183 changed files.

The current outcome is:

| Area                                | Current status                                 | Decision                                                                                               |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Mailjet Bulk Sender preset          | **Open — not on current main**                 | Selectively port or explicitly retire.                                                                 |
| Global public Help Assistant        | **Partially superseded**                       | Authenticated product implementation exists; decide whether public/anonymous coverage is still wanted. |
| Consent-first Sources + WooCommerce | **Complete through a newer reimplementation**  | Do not port the stale branch files.                                                                    |
| WooCommerce paid entitlement        | **Complete through a current-pattern rebuild** | Do not port the non-compiling branch patch.                                                            |
| Five backlog items                  | **Four complete; one scope ambiguity**         | Clarify whether “administrator template deletion” means cross-user admin deletion.                     |
| Retain `push-safe`                  | **Still required for now**                     | Keep it until Mailjet and the two scope decisions are resolved and preservation evidence is recorded.  |

> **Bottom line:** do not merge `consolidation/push-safe`. Extract only the still-desired behavior onto fresh branches from current `main`, then archive and retire the stale branch through a protected pull-request workflow.

## Baseline reconciliation

| Metric                   | Historical graphic | Fresh audit | Change | Interpretation                                              |
| ------------------------ | -----------------: | ----------: | -----: | ----------------------------------------------------------- |
| Commits ahead of `main`  |                 27 |          27 |      0 | The same unique commit set remains preserved.               |
| Commits behind `main`    |                 96 |         109 |    +13 | Rebase/cherry-pick risk has increased.                      |
| Final-tree files changed |                183 |         273 |    +90 | The old branch tree has become materially staler.           |
| Branch-only files        |                 20 |          20 |      0 | Unique artifacts remain available for selective extraction. |

The fresh audit classifies `consolidation/push-safe` as **`UNIQUE_REVIEW_REQUIRED`**, not a safe deletion candidate. Protection/check-run API visibility was unavailable to the audit integration, so no protection state is inferred from missing API data.

## Workstream status matrix

### 1. Mailjet Bulk Sender preset

| Field                  | Assessment                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical disposition | Portable after rebase and revalidation.                                                                                                                                 |
| Historical action      | Port selectively on a fresh branch from `main`.                                                                                                                         |
| Current completion     | **Not completed.** Current `main` intentionally omits Mailjet from the approved preset matrix.[1]                                                                       |
| Preserved evidence     | The stale branch contains a `mailjet` provider definition, source-backed relay research, tests, documentation, and seven locale updates.[2]                             |
| Risk                   | Copying the old locale files or whole preset registry would overwrite substantial current localization and provider work. Provider documentation may also have changed. |
| Final disposition      | **Open / selectively portable.**                                                                                                                                        |

**Execution plan**

1. Confirm the product decision: add Mailjet as a first-class SMTP preset or explicitly retire the workstream.
2. If approved, create a fresh `feature/mailjet-smtp-preset` branch from the latest protected `main`; do not merge or rebase `push-safe` into it.
3. Revalidate Mailjet’s current SMTP hostname, supported encrypted submission mode, credential model, sender/domain verification requirements, and account-security guidance against first-party documentation.
4. Manually add only the provider definition, current-format documentation, and focused tests. Do not copy the stale registry or locale files wholesale.
5. Add the Mailjet labels through the current localization workflow for all seven supported locales and run locale parity checks.
6. Verify that connection testing authenticates without sending a message, credentials remain encrypted/redacted, and the UI clearly distinguishes API Key, Secret Key, and account password.
7. Run focused preset tests, the full Vitest suite, TypeScript validation, dependency audit, production build, and responsive Settings verification.
8. Release through a checkpoint, protected pull request, required checks, merge, and tree verification.

**Acceptance criteria**

- Mailjet appears exactly once in the provider registry and localized selector.
- The preset fills only safe connection defaults; it never supplies or logs credentials.
- “Test connection” performs an authentication check without sending customer-facing email.
- Sender/domain verification guidance is visible and source-backed.
- All seven locale catalogs retain key parity.
- No unrelated `push-safe` file enters the release.

### 2. Global public Help Assistant

| Field                  | Assessment                                                                                                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical disposition | Specification only.                                                                                                                                                                                                                                               |
| Historical action      | Convert the requirements into a dedicated issue.                                                                                                                                                                                                                  |
| Current completion     | **Substantially implemented, with a safer authenticated scope.** Current `main` ships a localized Help Assistant UI, grounded source categories, privacy guidance, citations, escalation, per-user rate limiting, a protected backend procedure, and tests.[3][4] |
| Scope gap              | The historical title and requirements said “global public” and “anonymous-safe.” The current implementation is attached to authenticated application layout and uses a protected procedure; it is not an anonymous landing-page assistant.                        |
| Issue status           | No dedicated GitHub issue for the historical public/anonymous scope was found during the audit.                                                                                                                                                                   |
| Final disposition      | **Original build action superseded; public scope remains a product decision.**                                                                                                                                                                                    |

**Execution plan**

1. Decide whether public/anonymous assistance is still strategically valuable. If not, record the authenticated scope as intentional and retire the old requirement.
2. If public coverage is desired, create one narrowly scoped issue for **public Help Assistant exposure**, not for rebuilding the existing assistant.
3. Define anonymous abuse controls before implementation: IP/device rate limits, strict input size, no durable transcript, no secrets or customer data, source-grounded answers only, and deterministic support escalation.
4. Reuse the current knowledge, citation, localization, and escalation contracts. Add a separate public procedure rather than weakening the protected procedure.
5. Add public-route accessibility, mobile, privacy, abuse, and fallback tests before release.

**Acceptance criteria if public scope is approved**

- Authenticated behavior remains unchanged.
- Anonymous requests cannot access account, customer, review, billing, or integration data.
- Rate limits and source grounding fail closed.
- All seven supported languages preserve equivalent privacy and escalation behavior.

### 3. Consent-first Sources + WooCommerce

| Field                  | Assessment                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical disposition | Architecturally stale; rework behavior and contracts rather than old files.                                                                                                                                                                                                                                            |
| Historical action      | Rebuild against current Sources and WooCommerce infrastructure.                                                                                                                                                                                                                                                        |
| Current completion     | **Completed through a newer architecture.** Current `main` includes source attribution, source filters, external IDs for deduplication, WooCommerce credential handling, staged pending imports, import/dismiss flows, sync history, API-key-linked Sources, consent-aware setup, and connection-health history.[5][6] |
| Final disposition      | **Superseded / do not port old files.**                                                                                                                                                                                                                                                                                |

The historical recommendation has been executed in substance. The correct follow-up is regression maintenance, not code extraction from `push-safe`.

**Maintenance plan**

1. Keep source provenance, consent attestation, idempotency, secret redaction, and pending-import behavior covered by focused tests.
2. Verify representative WooCommerce and Sources connections in production after connector or schema changes.
3. Treat any branch-only migration or UI file as reference material only; port a behavior only when a current-main test proves a gap.

### 4. WooCommerce paid entitlement

| Field                  | Assessment                                                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical disposition | Blocked because the stale branch patch did not compile.                                                                                                                                                                                       |
| Historical action      | Rebuild against current entitlement patterns.                                                                                                                                                                                                 |
| Current completion     | **Completed through the current paid-access pattern.** `paidProcedure` is established, WooCommerce sync and bulk-send mutations use it, and the client presents the existing `PaywallModal` instead of relying on the stale broken import.[7] |
| Final disposition      | **Rebuilt / do not port old patch.**                                                                                                                                                                                                          |

The current pattern gates revenue-impacting actions while allowing safe configuration and explanatory UI. If product policy changes to gate the entire route, that should be a separate pricing decision rather than a recovery task.

## Backlog triage

| Backlog action from graphic     | Current status                                 | Evidence and conclusion                                                                                                                                                         | Next action                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send-request editor             | **Complete**                                   | Request subject/body editing, save, resend, and campaign restart are implemented through `ClientDetailSheet` and `requests.updateEmail`.[8]                                     | Keep focused editor/resend tests; no branch port required.                                                                                                                   |
| Administrator template deletion | **Partially complete / ambiguous**             | User-owned template deletion exists, and account deletion removes templates. No dedicated cross-user administrator template-deletion workflow was found.[9]                     | Decide whether admins truly need cross-user deletion. If no, retire the item. If yes, implement an audited `adminProcedure` with explicit confirmation and ownership checks. |
| Developer/API Keys enrollment   | **Complete**                                   | Current `main` includes scoped creation, optional expiry, one-time secret display, rotation, revocation, suspension/usage metadata, UI, Sources linkage, and focused tests.[10] | Maintain abuse, enrollment, and lifecycle tests; no branch port required.                                                                                                    |
| Locale completion               | **Complete for the supported catalog set**     | Seven locale directories are present; full-app key parity plus landing and Settings locale-coverage tests pass.[11]                                                             | Continue native-speaker linguistic QA as maintenance; structural completion is met.                                                                                          |
| Connector verification          | **Complete across current connector surfaces** | SMTP connection testing, WooCommerce connect/save guidance, Source health checks/history, and onboarding verification paths are implemented.[6][12]                             | Preserve non-destructive verification and production smoke checks after connector changes.                                                                                   |

### Administrator template deletion: safe implementation if approved

If “administrator template deletion” means an administrator may remove another user’s template, use this bounded design:

1. Add an `adminProcedure` accepting `templateId`, a reason, and an explicit confirmation value.
2. Load the template and owner before deletion; never infer ownership from client input.
3. Reject default/system templates and any template referenced by an in-progress send unless a separate, documented policy permits it.
4. Write a durable admin audit event containing administrator ID, template ID, owner ID, reason, and timestamp—but never template body content.
5. Provide a single-record confirmation dialog; do not add bulk deletion in the first release.
6. Add authorization, ownership, protected-template, audit, keyboard, and localization tests.

## Branch retention and retirement plan

The graphic’s retention instruction remains active:

> Retain `push-safe` until each selected workstream is ported or explicitly retired.

`consolidation/push-safe` should remain untouched until the following gates are complete:

1. **Mailjet decision:** port through a fresh branch or record explicit retirement.
2. **Help scope decision:** keep authenticated-only or open a narrow public-scope issue.
3. **Admin deletion decision:** retire the ambiguous request or implement the audited admin workflow.
4. **Evidence map:** record every one of the 27 unique commits as ported, superseded by current-main implementation, documentation-only, or retired.
5. **Preservation:** create an immutable archival tag or repository bundle for the final `push-safe` tip and attach the evidence map.
6. **Dry-run deletion:** fetch current remote refs, re-check the exact SHA, confirm no new commits appeared, and verify the archive object.
7. **Protected cleanup:** delete only the stale branch ref after explicit approval. Never force-push and never rewrite `main`.

## Prioritized execution sequence

| Priority | Action                                     | Why it comes next                                                                                                          | Completion evidence                                                                 |
| -------: | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
|        1 | Decide Mailjet: port or retire             | It is the only clearly portable product capability still absent from current `main`.                                       | Written decision; issue/PR or retirement record.                                    |
|        2 | Decide public Help Assistant scope         | Current authenticated implementation makes the old full-build action obsolete, but the anonymous scope remains unresolved. | Closed decision record or narrow issue with abuse/privacy acceptance criteria.      |
|        3 | Clarify administrator template deletion    | Current user deletion may already satisfy the business need; cross-user deletion adds security and audit risk.             | Retired requirement or approved implementation spec.                                |
|        4 | Build only approved gaps on fresh branches | Prevents stale branch code from overwriting newer architecture.                                                            | Focused tests, full gates, checkpoint, protected PR, tree verification.             |
|        5 | Archive and retire `push-safe`             | Removes maintenance ambiguity only after unique work is preserved or explicitly declined.                                  | Archive hash, 27-commit disposition map, fresh SHA check, approved branch deletion. |

## Evidence and confidence

This assessment is based on the historical graphic, a fresh remote audit, exact branch-only commit/file evidence, current-main source contracts, GitHub issue/PR inventory, and a passing full release gate for the active website tree. The audit found only one unrelated repository issue; it found no dedicated Mailjet, public Help Assistant, or administrator-template-deletion issue.

| Conclusion                                                                                   | Confidence |
| -------------------------------------------------------------------------------------------- | ---------- |
| Mailjet is absent from current main but preserved on `push-safe`                             | High       |
| Sources/WooCommerce was reimplemented and old files should not be ported                     | High       |
| WooCommerce paid entitlement was rebuilt using current patterns                              | High       |
| Help Assistant exists but does not implement the old anonymous/public scope                  | High       |
| Send-request editor, Developer/API Keys, locales, and connector verification are implemented | High       |
| “Administrator template deletion” requires clarification                                     | High       |

## References

[1]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/docs/bulk-sender-smtp-presets.md "Current-main SMTP preset matrix"
[2]: https://github.com/SteveKinzey/getphame/blob/c616a1589730c8887f358cb2c1a4d89d7401351d/shared/bulkSenderPresets.ts "Preserved Mailjet preset on push-safe"
[3]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/components/HelpAssistant.tsx "Current Help Assistant UI"
[4]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/server/helpAssistant.ts "Current protected Help Assistant backend"
[5]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/pages/SavedContacts.tsx "Current Sources and WooCommerce contact UI"
[6]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/components/SourceOperationsPanel.tsx "Current Source operations and health UI"
[7]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/server/_core/trpc.ts "Current paid procedure"
[8]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/components/ClientDetailSheet.tsx "Current send-request editor"
[9]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/pages/EmailTemplates.tsx "Current user-owned template deletion"
[10]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/server/developerApiKeys.ts "Current Developer API key lifecycle"
[11]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/server/fullAppLocalization.test.ts "Current locale key-parity regression"
[12]: https://github.com/SteveKinzey/getphame/blob/8a3db86c915b750cdf261993f34a8c2a7cac1541/client/src/components/OnboardingWizard.tsx "Current connector verification flow"
