-- Additive migration for administrator-controlled send burst caps and on-demand diagnostics.
-- Existing monthly export history is preserved while its idempotency invariant gains a run key.

CREATE TABLE IF NOT EXISTS `adaptive_send_burst_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policyKey` VARCHAR(32) NOT NULL,
  `freeBurstCap` INT NOT NULL DEFAULT 10,
  `proBurstCap` INT NOT NULL DEFAULT 25,
  `annualBurstCap` INT NOT NULL DEFAULT 50,
  `lifetimeBurstCap` INT NOT NULL DEFAULT 100,
  `updatedByUserId` INT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adaptive_send_burst_policy_key_unique` (`policyKey`)
);

ALTER TABLE `monthly_diagnostic_export_runs`
  ADD COLUMN IF NOT EXISTS `snapshot_key` VARCHAR(96) NULL AFTER `report_month_key`;

UPDATE `monthly_diagnostic_export_runs`
  SET `snapshot_key` = CONCAT('monthly:', `report_month_key`)
  WHERE `snapshot_key` IS NULL OR `snapshot_key` = '';

ALTER TABLE `monthly_diagnostic_export_runs`
  MODIFY COLUMN `snapshot_key` VARCHAR(96) NOT NULL;

ALTER TABLE `monthly_diagnostic_export_runs`
  DROP INDEX `monthly_diagnostic_export_run_month_unique`,
  ADD UNIQUE KEY `monthly_diagnostic_export_run_snapshot_unique` (`schedule_id`, `snapshot_key`);
