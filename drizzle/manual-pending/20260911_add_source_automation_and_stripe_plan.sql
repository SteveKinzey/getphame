-- Additive, idempotent schema migration for source connections automation safeguards and Stripe subscriptions
-- Safe for live production MySQL/TiDB database

-- 1. Stripe subscriptions: add plan column if missing
ALTER TABLE `stripe_subscriptions`
  ADD COLUMN IF NOT EXISTS `plan` VARCHAR(16) NOT NULL DEFAULT 'monthly';

-- 2. Source connections: add automation, dry-run, template, platform, locale, and pause columns
ALTER TABLE `source_connections`
  ADD COLUMN IF NOT EXISTS `automationEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `automationMode` VARCHAR(24) NOT NULL DEFAULT 'import_only',
  ADD COLUMN IF NOT EXISTS `dryRun` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `sendDelayMinutes` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `templateId` INT NULL,
  ADD COLUMN IF NOT EXISTS `platformId` INT NULL,
  ADD COLUMN IF NOT EXISTS `preferredLocale` VARCHAR(16) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS `dryRunCompletedAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `pausedAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `pauseReason` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `lastAutomationAt` BIGINT NULL;
