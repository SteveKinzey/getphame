CREATE TABLE IF NOT EXISTS `activity_trend_export_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`normalized_name` varchar(80) NOT NULL,
	`range_key` enum('30','60','90','custom') NOT NULL,
	`custom_start_date` varchar(10),
	`custom_end_date` varchar(10),
	`include_sends` boolean NOT NULL DEFAULT true,
	`include_opens` boolean NOT NULL DEFAULT true,
	`include_clicks` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_trend_export_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_trend_presets_owner_name_unique` UNIQUE(`owner_user_id`,`normalized_name`)
);
--> statement-breakpoint
SET @preset_has_legacy_range = (
	SELECT COUNT(*)
	FROM information_schema.columns
	WHERE table_schema = DATABASE()
		AND table_name = 'activity_trend_export_presets'
		AND column_name = 'range'
);
--> statement-breakpoint
SET @preset_has_range_key = (
	SELECT COUNT(*)
	FROM information_schema.columns
	WHERE table_schema = DATABASE()
		AND table_name = 'activity_trend_export_presets'
		AND column_name = 'range_key'
);
--> statement-breakpoint
SET @preset_migrate_range = IF(
	@preset_has_legacy_range > 0 AND @preset_has_range_key = 0,
	'ALTER TABLE `activity_trend_export_presets` MODIFY COLUMN `range` varchar(10) NOT NULL',
	'SELECT 1'
);
--> statement-breakpoint
PREPARE preset_statement FROM @preset_migrate_range;
--> statement-breakpoint
EXECUTE preset_statement;
--> statement-breakpoint
DEALLOCATE PREPARE preset_statement;
--> statement-breakpoint
SET @preset_migrate_range_values = IF(
	@preset_has_legacy_range > 0 AND @preset_has_range_key = 0,
	'UPDATE `activity_trend_export_presets` SET `range` = CASE `range` WHEN ''days30'' THEN ''30'' WHEN ''days60'' THEN ''60'' WHEN ''days90'' THEN ''90'' ELSE ''custom'' END',
	'SELECT 1'
);
--> statement-breakpoint
PREPARE preset_statement FROM @preset_migrate_range_values;
--> statement-breakpoint
EXECUTE preset_statement;
--> statement-breakpoint
DEALLOCATE PREPARE preset_statement;
--> statement-breakpoint
SET @preset_finalize_range = IF(
	@preset_has_legacy_range > 0 AND @preset_has_range_key = 0,
	'ALTER TABLE `activity_trend_export_presets` CHANGE COLUMN `range` `range_key` enum(''30'',''60'',''90'',''custom'') NOT NULL',
	'SELECT 1'
);
--> statement-breakpoint
PREPARE preset_statement FROM @preset_finalize_range;
--> statement-breakpoint
EXECUTE preset_statement;
--> statement-breakpoint
DEALLOCATE PREPARE preset_statement;
--> statement-breakpoint
SET @preset_has_legacy_sent = (
	SELECT COUNT(*)
	FROM information_schema.columns
	WHERE table_schema = DATABASE()
		AND table_name = 'activity_trend_export_presets'
		AND column_name = 'include_sent'
);
--> statement-breakpoint
SET @preset_has_include_sends = (
	SELECT COUNT(*)
	FROM information_schema.columns
	WHERE table_schema = DATABASE()
		AND table_name = 'activity_trend_export_presets'
		AND column_name = 'include_sends'
);
--> statement-breakpoint
SET @preset_migrate_sent = IF(
	@preset_has_legacy_sent > 0 AND @preset_has_include_sends = 0,
	'ALTER TABLE `activity_trend_export_presets` CHANGE COLUMN `include_sent` `include_sends` boolean NOT NULL DEFAULT true',
	'SELECT 1'
);
--> statement-breakpoint
PREPARE preset_statement FROM @preset_migrate_sent;
--> statement-breakpoint
EXECUTE preset_statement;
--> statement-breakpoint
DEALLOCATE PREPARE preset_statement;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `activity_trend_presets_owner_name_unique` ON `activity_trend_export_presets` (`owner_user_id`,`normalized_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_trend_presets_owner_updated_idx` ON `activity_trend_export_presets` (`owner_user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_trend_presets_owner_sort_idx` ON `activity_trend_export_presets` (`owner_user_id`,`sort_order`,`id`);
