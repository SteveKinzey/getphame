CREATE TABLE `support_internal_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`author_user_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_internal_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`recipient_user_id` int NOT NULL,
	`actor_user_id` int NOT NULL,
	`type` enum('assignment','escalation') NOT NULL,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `support_submissions` ADD `due_at` timestamp;--> statement-breakpoint
ALTER TABLE `support_submissions` ADD `sla_target_at` timestamp;--> statement-breakpoint
UPDATE `support_submissions`
SET `sla_target_at` = DATE_ADD(`created_at`, INTERVAL 24 HOUR)
WHERE `sla_target_at` IS NULL AND `status` <> 'resolved';--> statement-breakpoint
CREATE INDEX `support_internal_notes_ticket_created_idx` ON `support_internal_notes` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_internal_notes_author_created_idx` ON `support_internal_notes` (`author_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_ticket_alerts_recipient_read_created_idx` ON `support_ticket_alerts` (`recipient_user_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_ticket_alerts_ticket_type_created_idx` ON `support_ticket_alerts` (`ticket_id`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_submissions_sla_status_idx` ON `support_submissions` (`sla_target_at`,`status`);--> statement-breakpoint
CREATE INDEX `support_submissions_due_status_idx` ON `support_submissions` (`due_at`,`status`);
