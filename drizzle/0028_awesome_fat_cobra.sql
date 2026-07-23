CREATE TABLE `recovery_drill_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drill_id` varchar(36) NOT NULL,
	`approver_user_id` int NOT NULL,
	`decision` enum('approved','rejected') NOT NULL,
	`note` varchar(500) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `recovery_drill_approvals_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_drill_approver_unique` UNIQUE(`drill_id`,`approver_user_id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_drill_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`environment` enum('staging','production') NOT NULL,
	`role` enum('recovery_custodian','independent_approver','observer') NOT NULL,
	`user_id` int,
	`display_label` varchar(120) NOT NULL,
	`assigned_by_user_id` int NOT NULL,
	`assigned_at` bigint NOT NULL,
	`revoked_at` bigint,
	CONSTRAINT `recovery_drill_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_drill_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drill_id` varchar(36) NOT NULL,
	`evidence_type` varchar(100) NOT NULL,
	`evidence_reference` varchar(255) NOT NULL,
	`outcome` varchar(100) NOT NULL,
	`recorded_by_user_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `recovery_drill_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_drills` (
	`id` varchar(36) NOT NULL,
	`environment` enum('staging','production') NOT NULL,
	`status` enum('draft','ready','in_progress','paused','completed','aborted') NOT NULL DEFAULT 'draft',
	`title` varchar(160) NOT NULL,
	`scheduled_at` bigint NOT NULL,
	`recovery_custodian_user_id` int NOT NULL,
	`independent_approver_user_id` int,
	`observer_user_id` int,
	`evidence_key` varchar(500),
	`notes` varchar(1000),
	`created_by_user_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	`started_at` bigint,
	`completed_at` bigint,
	CONSTRAINT `recovery_drills_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_drills_separated_duties` CHECK(`recovery_drills`.`independent_approver_user_id` is null or `recovery_drills`.`recovery_custodian_user_id` <> `recovery_drills`.`independent_approver_user_id`)
);
--> statement-breakpoint
CREATE INDEX `recovery_drill_approvals_drill_idx` ON `recovery_drill_approvals` (`drill_id`);--> statement-breakpoint
CREATE INDEX `recovery_assignments_environment_idx` ON `recovery_drill_assignments` (`environment`,`role`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `recovery_drill_evidence_drill_idx` ON `recovery_drill_evidence` (`drill_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `recovery_drills_environment_idx` ON `recovery_drills` (`environment`,`status`,`scheduled_at`);