CREATE TABLE `activity_trend_export_presets` (
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
CREATE INDEX `activity_trend_presets_owner_updated_idx` ON `activity_trend_export_presets` (`owner_user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `activity_trend_presets_owner_sort_idx` ON `activity_trend_export_presets` (`owner_user_id`,`sort_order`,`id`);