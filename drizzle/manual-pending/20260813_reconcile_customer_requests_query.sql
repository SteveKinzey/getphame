-- Reconciles production customer_requests tables created before source-event,
-- locale, and template-revision support was introduced. All changes are additive.
ALTER TABLE customer_requests
  ADD COLUMN IF NOT EXISTS sourceConnectionId INT NULL,
  ADD COLUMN IF NOT EXISTS sourceEventId VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS preferredLocale VARCHAR(16) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS templateRevisionId INT NULL,
  ADD COLUMN IF NOT EXISTS englishTemplateRevisionId INT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_requests_source_event_unique
  ON customer_requests (userId, sourceConnectionId, sourceEventId);
