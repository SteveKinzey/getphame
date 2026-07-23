CREATE TABLE `recovery_drill_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drill_id` varchar(36) NOT NULL,
	`role` enum('recovery_custodian','independent_approver','observer') NOT NULL,
	`user_id` int NOT NULL,
	`assigned_by_user_id` int NOT NULL,
	`assigned_at` bigint NOT NULL,
	CONSTRAINT `recovery_drill_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_participants_drill_role_unique` UNIQUE(`drill_id`,`role`),
	CONSTRAINT `recovery_participants_drill_user_unique` UNIQUE(`drill_id`,`user_id`)
);
--> statement-breakpoint
CREATE INDEX `recovery_participants_user_idx` ON `recovery_drill_participants` (`user_id`,`drill_id`);