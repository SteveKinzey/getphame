# Customer Requests Schema Reconciliation

The home-page customer request read failed because the application schema expected five additive fields that were absent from the live `customer_requests` table: `sourceConnectionId`, `sourceEventId`, `preferredLocale`, `templateRevisionId`, and `englishTemplateRevisionId`.

The production table was reconciled with additive columns and the schema-declared source-event unique index. The exact previously failing select completed successfully afterward. A durable manual migration and both schema-level and behavioral helper-path regressions now protect the fields used by the home-page read. Drizzle migration generation remains blocked by the existing `0048_snapshot.json` / `0049_snapshot.json` parent-snapshot collision; the manual migration is the non-destructive deployment record for this reconciliation.
