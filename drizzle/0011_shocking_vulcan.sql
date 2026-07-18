ALTER TABLE `support_submissions` ADD `priority` enum('low','normal','high','urgent') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `support_submissions` ADD `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `support_submissions` ADD `assignee_user_id` int;--> statement-breakpoint
CREATE INDEX `support_submissions_priority_status_created_idx` ON `support_submissions` (`priority`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_submissions_assignee_status_created_idx` ON `support_submissions` (`assignee_user_id`,`status`,`created_at`);
