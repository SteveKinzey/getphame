CREATE TABLE `smtp_admin_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int NOT NULL,
	`actor_name` varchar(255),
	`actor_email` varchar(320),
	`target_user_id` int NOT NULL,
	`target_name` varchar(255),
	`target_email` varchar(320),
	`smtp_user` varchar(320) NOT NULL,
	`action` varchar(64) NOT NULL,
	`outcome` varchar(32) NOT NULL,
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `smtp_admin_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `smtp_admin_audit_occurred_idx` ON `smtp_admin_audit_logs` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `smtp_admin_audit_actor_idx` ON `smtp_admin_audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `smtp_admin_audit_target_idx` ON `smtp_admin_audit_logs` (`target_user_id`);