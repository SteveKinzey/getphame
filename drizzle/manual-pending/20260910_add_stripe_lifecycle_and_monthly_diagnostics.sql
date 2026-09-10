-- Additive schema migration for Stripe lifecycle and recurring monthly diagnostics exports
-- Safe, additive statements with idempotent checks

-- 1. Business profile lifecycle locale
ALTER TABLE `business_profiles`
  ADD COLUMN IF NOT EXISTS `lifecycleLocale` VARCHAR(16) NOT NULL DEFAULT 'en';

-- 2. Stripe subscriptions canonical period and cancellation boundaries
ALTER TABLE `stripe_subscriptions`
  ADD COLUMN IF NOT EXISTS `trialEndsAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `currentPeriodEndsAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Stripe verified webhook event ledger
CREATE TABLE IF NOT EXISTS `stripe_webhook_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stripeEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `objectId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `claimExpiresAt` BIGINT NULL,
  `errorCode` VARCHAR(64) NULL,
  `receivedAt` BIGINT NOT NULL,
  `processedAt` BIGINT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_webhook_events_event_id_unique` (`stripeEventId`),
  KEY `stripe_webhook_events_claim_idx` (`status`, `claimExpiresAt`)
);

-- 4. Stripe lifecycle transactional notice outbox
CREATE TABLE IF NOT EXISTS `stripe_lifecycle_emails` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `stripeSubscriptionId` VARCHAR(64) NOT NULL,
  `stripeInvoiceId` VARCHAR(191) NULL,
  `sequenceKey` VARCHAR(255) NOT NULL,
  `kind` VARCHAR(32) NOT NULL,
  `locale` VARCHAR(16) NOT NULL DEFAULT 'en',
  `state` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `scheduledAt` BIGINT NOT NULL,
  `attemptedAt` BIGINT NULL,
  `sentAt` BIGINT NULL,
  `provider` VARCHAR(32) NULL,
  `providerMessageId` VARCHAR(191) NULL,
  `errorCode` VARCHAR(64) NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_lifecycle_emails_sub_seq_unique` (`stripeSubscriptionId`, `sequenceKey`),
  KEY `stripe_lifecycle_emails_due_idx` (`state`, `scheduledAt`),
  KEY `stripe_lifecycle_emails_user_idx` (`userId`)
);

-- 5. Stripe lifecycle heartbeat scheduler ledger
CREATE TABLE IF NOT EXISTS `stripe_lifecycle_schedulers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `scheduleKey` VARCHAR(32) NOT NULL DEFAULT 'global',
  `scheduleCronTaskUid` VARCHAR(65) NULL,
  `cronExpression` VARCHAR(64) NOT NULL DEFAULT '0 */5 * * * *',
  `lastRunAt` BIGINT NULL,
  `lastRunStatus` VARCHAR(20) NULL,
  `lastRunErrorCode` VARCHAR(64) NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_lifecycle_schedulers_schedule_key_unique` (`scheduleKey`),
  UNIQUE KEY `stripe_lifecycle_schedulers_task_uid_unique` (`scheduleCronTaskUid`)
);

-- 6. Monthly diagnostics export schedule singleton
CREATE TABLE IF NOT EXISTS `monthly_diagnostic_export_schedules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schedule_key` VARCHAR(32) NOT NULL DEFAULT 'global',
  `schedule_cron_task_uid` VARCHAR(65) NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `cron_expression` VARCHAR(64) NOT NULL DEFAULT '0 10 8 1 * *',
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `monthly_diagnostic_export_schedule_key_unique` (`schedule_key`),
  UNIQUE KEY `monthly_diagnostic_export_schedule_task_uid_unique` (`schedule_cron_task_uid`)
);

-- 7. Monthly diagnostics export runs metadata ledger
CREATE TABLE IF NOT EXISTS `monthly_diagnostic_export_runs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schedule_id` INT NOT NULL,
  `report_month_key` VARCHAR(7) NOT NULL,
  `snapshot_generated_at` BIGINT NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'preparing',
  `saved_contacts_total` INT NOT NULL DEFAULT 0,
  `explicit_consent_total` INT NOT NULL DEFAULT 0,
  `without_explicit_consent_total` INT NOT NULL DEFAULT 0,
  `opted_out_total` INT NOT NULL DEFAULT 0,
  `auth_total_matching` INT NOT NULL DEFAULT 0,
  `auth_exported_rows` INT NOT NULL DEFAULT 0,
  `auth_truncated` BOOLEAN NOT NULL DEFAULT FALSE,
  `consent_filename` VARCHAR(160) NULL,
  `auth_filename` VARCHAR(160) NULL,
  `error_code` VARCHAR(64) NULL,
  `created_at` BIGINT NOT NULL,
  `completed_at` BIGINT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `monthly_diagnostic_export_run_month_unique` (`schedule_id`, `report_month_key`),
  KEY `monthly_diagnostic_export_run_status_idx` (`status`, `created_at`)
);

-- 8. Monthly diagnostics per-administrator delivery ledger (recipient IDs only)
CREATE TABLE IF NOT EXISTS `monthly_diagnostic_export_deliveries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `run_id` INT NOT NULL,
  `recipient_user_id` INT NOT NULL,
  `state` VARCHAR(24) NOT NULL DEFAULT 'pending',
  `attempt_count` INT NOT NULL DEFAULT 0,
  `attempted_at` BIGINT NULL,
  `sent_at` BIGINT NULL,
  `error_code` VARCHAR(64) NULL,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `monthly_diagnostic_export_delivery_recipient_unique` (`run_id`, `recipient_user_id`),
  KEY `monthly_diagnostic_export_delivery_state_idx` (`run_id`, `state`),
  KEY `monthly_diagnostic_export_delivery_recipient_idx` (`recipient_user_id`)
);
