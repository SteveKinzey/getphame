CREATE TABLE `email_preview_renderer_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reported_by_user_id` int NOT NULL,
	`template_key` varchar(64) NOT NULL,
	`viewport_mode` varchar(16) NOT NULL,
	`dark_mode` boolean NOT NULL DEFAULT false,
	`error_code` varchar(64) NOT NULL,
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `email_preview_renderer_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `route_audit_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggered_by_user_id` int NOT NULL,
	`routes_audited` int NOT NULL DEFAULT 0,
	`failure_count` int NOT NULL DEFAULT 0,
	`findings` text NOT NULL,
	`runner_error_code` varchar(64),
	`duration_ms` int NOT NULL,
	`audited_at` bigint NOT NULL,
	CONSTRAINT `route_audit_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_preview_renderer_errors_occurred_idx` ON `email_preview_renderer_errors` (`occurred_at`);
--> statement-breakpoint
CREATE INDEX `email_preview_renderer_errors_reporter_idx` ON `email_preview_renderer_errors` (`reported_by_user_id`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX `route_audit_runs_audited_idx` ON `route_audit_runs` (`audited_at`);
--> statement-breakpoint
CREATE INDEX `route_audit_runs_triggered_idx` ON `route_audit_runs` (`triggered_by_user_id`,`audited_at`);
