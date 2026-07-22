ALTER TABLE `auth_health_history_presets` ADD `sort_order` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX `auth_health_history_presets_owner_sort_idx` ON `auth_health_history_presets` (`owner_user_id`,`sort_order`,`id`);
