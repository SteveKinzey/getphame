# Get Phame unfinished-work reconciliation

## Revenue controls

- The complimentary-access schema, migration, server service, Stripe creation helper, entitlement integration, administrator procedures, route, and page are present in the working tree.
- The current TypeScript gate fails only because `AdminDashboard.tsx` references `BadgePercent` without importing it.
- Seven-locale revenue-control copy and focused revenue-control regressions are not present.
- Drizzle migration history was intentionally linearized to `0018`–`0020`; the idempotent `0020` table migration has already been applied to the live database.

## Previously pending release items

- The administrator CSV preview skill exists at `/home/ubuntu/skills/admin-csv-preview-workflows/SKILL.md`; validation still needs to be rerun.
- The earlier release checkpoint, live marker verification, and final product rationale were never completed.

## Developer API

- A partial system already exists: hashed `rl_` API keys, one-time raw-key return, active-key listing, revocation, import logs, `POST /api/public/contacts`, `POST /api/public/send`, a Settings card, and form-builder instructions.
- Missing security and reliability controls include scopes, exact key identity return, durable rate-limit semantics, versioned endpoints, idempotency, consent metadata, bounded audit detail, key rotation, standardized errors, and a dedicated developer page.
- The existing custom HTML example embeds a secret API key in browser JavaScript and must be removed; form builders must send secrets only from server-side webhook actions.
- `POST /api/public/send` automatically sends review outreach and therefore requires an explicit review-request-consent contract. Contact import must remain non-sending by default.

## Help assistant, email onboarding, and Bulk Sender

- Architecture and source-cited provider designs are complete, but the product implementations are not present.
- Gmail OAuth infrastructure exists but is not wired into the primary send transport or current email-onboarding UI.
- Bulk Sender currently stores/tests limited provider keys, but the saved provider credentials are not selected by the live delivery path.
- These are intentional product additions and must receive focused tests, localization, responsive verification, and explicit transport precedence rules.

## Release gate

- Required before checkpoint: focused tests, full suite, TypeScript, dependency audit, production build, authenticated responsive verification where the active preview session permits it, skill validation, checkpoint, and live-bundle marker confirmation.
