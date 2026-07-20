CREATE TABLE `auth_diagnostic_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`event_type` enum('request_received','token_created','provider_accepted','provider_failed','verification_succeeded','verification_failed') NOT NULL,
	`outcome` enum('ok','fail') NOT NULL,
	`email_fingerprint` varchar(64),
	`email_masked` varchar(320),
	`token_fingerprint` varchar(64),
	`provider_message_id` varchar(128),
	`detail_code` varchar(64),
	`detail_message` varchar(500),
	`duration_ms` int,
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `auth_diagnostic_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_source` enum('scheduled','manual') NOT NULL,
	`schedule_cron_task_uid` varchar(65),
	`overall_status` enum('ok','fail') NOT NULL,
	`config_status` enum('ok','fail') NOT NULL,
	`database_status` enum('ok','fail') NOT NULL,
	`user_schema_status` enum('ok','fail') NOT NULL,
	`magic_link_schema_status` enum('ok','fail') NOT NULL,
	`session_status` enum('ok','fail') NOT NULL,
	`email_provider_status` enum('ok','fail') NOT NULL,
	`provider_name` varchar(64),
	`failure_code` varchar(64),
	`failure_detail` varchar(500),
	`duration_ms` int NOT NULL,
	`checked_at` bigint NOT NULL,
	CONSTRAINT `auth_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auth_diag_request_idx` ON `auth_diagnostic_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `auth_diag_email_idx` ON `auth_diagnostic_events` (`email_fingerprint`);--> statement-breakpoint
CREATE INDEX `auth_diag_occurred_idx` ON `auth_diagnostic_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `auth_health_checked_idx` ON `auth_health_checks` (`checked_at`);--> statement-breakpoint
CREATE INDEX `auth_health_task_uid_idx` ON `auth_health_checks` (`schedule_cron_task_uid`);