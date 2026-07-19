CREATE TABLE `support_saved_queue_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_user_id` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`normalized_name` varchar(80) NOT NULL,
	`status` enum('open','in_progress','resolved'),
	`topic` enum('billing','onboarding','technical'),
	`priority` enum('low','normal','high','urgent'),
	`assignee_scope` enum('any','unassigned','specific') NOT NULL DEFAULT 'any',
	`assignee_user_id` int,
	`sla_window` enum('overdue','next_4_hours','next_24_hours'),
	`sort` enum('newest','oldest','priority','assignee','sla_soonest') NOT NULL DEFAULT 'newest',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_saved_queue_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_saved_queue_views_owner_name_unique` UNIQUE(`owner_user_id`,`normalized_name`)
);
--> statement-breakpoint
ALTER TABLE `support_ticket_alerts` MODIFY COLUMN `type` enum('assignment','escalation','mention','sla_breach') NOT NULL;--> statement-breakpoint
CREATE INDEX `support_saved_queue_views_owner_updated_idx` ON `support_saved_queue_views` (`owner_user_id`,`updated_at`);