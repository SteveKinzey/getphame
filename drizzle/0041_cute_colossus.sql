CREATE TABLE `admin_platform_email_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int NOT NULL,
	`recipient_user_id` int NOT NULL,
	`recipient_email` varchar(320) NOT NULL,
	`from_email` varchar(320) NOT NULL,
	`template` varchar(64) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body_text` text NOT NULL,
	`status` varchar(32) NOT NULL,
	`provider_message_id` varchar(255),
	`failure_code` varchar(64),
	`created_at` bigint NOT NULL,
	`sent_at` bigint,
	`expires_at` bigint NOT NULL,
	CONSTRAINT `admin_platform_email_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_user_lifecycle_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int NOT NULL,
	`target_user_id` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `admin_user_lifecycle_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `suspended_until` bigint;--> statement-breakpoint
CREATE INDEX `admin_platform_email_recipient_time_idx` ON `admin_platform_email_messages` (`recipient_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_platform_email_expiry_idx` ON `admin_platform_email_messages` (`expires_at`);--> statement-breakpoint
CREATE INDEX `admin_user_lifecycle_target_time_idx` ON `admin_user_lifecycle_audit_logs` (`target_user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `admin_user_lifecycle_actor_time_idx` ON `admin_user_lifecycle_audit_logs` (`actor_user_id`,`occurred_at`);