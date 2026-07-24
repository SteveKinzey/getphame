CREATE TABLE `api_abuse_limit_windows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int,
	`action` varchar(32) NOT NULL,
	`dimension` varchar(24) NOT NULL,
	`dimensionHash` varchar(64) NOT NULL,
	`windowStartedAt` bigint NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`expiresAt` bigint NOT NULL,
	CONSTRAINT `api_abuse_limit_windows_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_abuse_dimension_window_unique` UNIQUE(`action`,`dimensionHash`,`windowStartedAt`)
);
--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `eventType` varchar(32) DEFAULT 'contact_import' NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `suspendedAt` bigint;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `suspensionExpiresAt` bigint;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `suspensionReason` varchar(64);--> statement-breakpoint
CREATE INDEX `api_abuse_user_action_idx` ON `api_abuse_limit_windows` (`userId`,`action`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_abuse_key_action_idx` ON `api_abuse_limit_windows` (`apiKeyId`,`action`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_abuse_expiry_idx` ON `api_abuse_limit_windows` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_keys_suspension_idx` ON `api_keys` (`suspensionExpiresAt`);