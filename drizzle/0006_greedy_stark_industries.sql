CREATE TABLE `smtp_health_snapshot` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_source` enum('scheduled','manual') NOT NULL,
	`schedule_cron_task_uid` varchar(65),
	`total_accounts` int NOT NULL,
	`healthy_accounts` int NOT NULL,
	`failed_accounts` int NOT NULL,
	`duration_ms` int NOT NULL,
	`checked_at` bigint NOT NULL,
	CONSTRAINT `smtp_health_snapshot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `smtp_health_checked_idx` ON `smtp_health_snapshot` (`checked_at`);--> statement-breakpoint
CREATE INDEX `smtp_health_task_uid_idx` ON `smtp_health_snapshot` (`schedule_cron_task_uid`);