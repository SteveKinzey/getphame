# Profile and Preferences Export-History Migration

## Purpose

The `profile_preference_export_history` table records only the authenticated user ID, export format (`json` or `csv`), and export timestamp. It deliberately excludes the downloaded payload, browser metadata, credentials, customer records, and diagnostic data.

## Generation Evidence and Manual Application

On 2026-08-26, `pnpm drizzle-kit generate` was attempted after the schema update. Drizzle could not generate a migration because existing `0048_snapshot.json` and `0049_snapshot.json` share the same parent snapshot ID, producing a snapshot-parent collision. The metadata issue predates this change and was not edited during this release.

The reviewed non-destructive SQL in `drizzle/manual-pending/20260826_add_profile_preference_export_history.sql` was therefore applied through the managed schema executor. The table contains the intended four columns and `(user_id, exported_at)` index. A follow-up reviewed migration added the `profile_preference_export_history_user_id_users_id_fk` foreign key with `ON DELETE CASCADE`; managed schema verification confirmed it references `users` and cascades account deletion.

## Future Cleanup

Repair the historical Drizzle snapshot lineage in a dedicated migration-maintenance task before relying on generated migrations again. Do not rewrite or delete snapshot files as part of a feature release.
