-- Additive, idempotent schema migration for consent-tracking columns and indexes
-- Verified against live production schema and Drizzle definitions

ALTER TABLE `business_profiles`
  ADD COLUMN IF NOT EXISTS `consentAcknowledgedAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `consentLabelName` VARCHAR(255) NULL;

ALTER TABLE `leads`
  ADD COLUMN IF NOT EXISTS `consentGivenAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `unsubscribedAt` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `unsubscribeReason` VARCHAR(100) NULL;
