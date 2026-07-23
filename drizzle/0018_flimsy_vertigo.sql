CREATE TABLE `auth_health_history_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`normalized_name` varchar(80) NOT NULL,
	`status` enum('ok','fail'),
	`trigger_source` enum('scheduled','manual'),
	`from_ms` bigint,
	`to_ms` bigint,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_health_history_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_health_history_presets_owner_name_unique` UNIQUE(`owner_user_id`,`normalized_name`)
);
--> statement-breakpoint
CREATE INDEX `auth_health_history_presets_owner_updated_idx` ON `auth_health_history_presets` (`owner_user_id`,`updated_at`);