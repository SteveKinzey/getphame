# Magic-Link Verification Incident — 2026-07-12

## Observed production failure

The public `POST /api/auth/magic-link` route returned `200` and delivered the branded email successfully. Opening its valid verification URL consumed the token, but redirected the user to `/login?auth_error=verification_failed` and did not create an email-authenticated user or session.

## Root cause

The live `users` table was older than `drizzle/schema.ts`. Production inspection showed that it lacked `password_hash`, `default_from_email`, and `default_from_name`, while `db.upsertUser()` included those mapped columns in the insert generated from the current Drizzle schema. The insert therefore failed at account creation before JWT cookie issuance. The failed token had already received a `used_at` value, which prevented a retry.

## Repair

The production table received the three missing nullable columns through `drizzle/0001_add_user_auth_columns.sql`. Verification now creates or updates the user and signs the session before marking the magic link used. A behavioral Vitest test forces session signing to fail, confirms that the token is not consumed, retries the same token, and confirms successful cookie issuance and redirect.
