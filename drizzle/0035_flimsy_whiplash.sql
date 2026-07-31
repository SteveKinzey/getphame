CREATE TABLE `automation_alert_acknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`admin_user_id` int NOT NULL,
	`acknowledged_at` bigint NOT NULL,
	CONSTRAINT `automation_alert_acknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_alert_ack_event_admin_unique` UNIQUE(`event_id`,`admin_user_id`)
);
--> statement-breakpoint
CREATE TABLE `automation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_key` varchar(191) NOT NULL,
	`oidc_jti_hash` varchar(64) NOT NULL,
	`kind` enum('drift_audit','dependabot_merge') NOT NULL,
	`result` enum('success','failure') NOT NULL,
	`repository` varchar(255) NOT NULL,
	`repository_id` varchar(32) NOT NULL,
	`repository_owner_id` varchar(32) NOT NULL,
	`ref` varchar(255) NOT NULL,
	`event_name` varchar(64) NOT NULL,
	`workflow` varchar(255) NOT NULL,
	`workflow_ref` varchar(512) NOT NULL,
	`workflow_sha` varchar(40) NOT NULL,
	`run_id` varchar(32) NOT NULL,
	`run_number` int NOT NULL,
	`run_attempt` int NOT NULL,
	`run_url` varchar(512) NOT NULL,
	`event_at` bigint NOT NULL,
	`duration_ms` int,
	`pull_request_number` int,
	`pull_request_created_at` bigint,
	`pull_request_merged_at` bigint,
	`failure_code` varchar(64),
	`failure_summary` varchar(300),
	`received_at` bigint NOT NULL,
	CONSTRAINT `automation_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_events_event_key_unique` UNIQUE(`event_key`),
	CONSTRAINT `automation_events_oidc_jti_unique` UNIQUE(`oidc_jti_hash`)
);
--> statement-breakpoint
CREATE INDEX `automation_alert_ack_admin_time_idx` ON `automation_alert_acknowledgements` (`admin_user_id`,`acknowledged_at`);--> statement-breakpoint
CREATE INDEX `automation_events_kind_event_idx` ON `automation_events` (`kind`,`event_at`);--> statement-breakpoint
CREATE INDEX `automation_events_result_event_idx` ON `automation_events` (`result`,`event_at`);