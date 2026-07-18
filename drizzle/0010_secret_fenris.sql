CREATE TABLE `support_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120),
	`email` varchar(320) NOT NULL,
	`topic` enum('billing','onboarding','technical') NOT NULL,
	`subject` varchar(120) NOT NULL,
	`message` text NOT NULL,
	`status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
	`attachment_key` varchar(512),
	`attachment_filename` varchar(255),
	`attachment_mime_type` varchar(64),
	`attachment_size` int,
	`notification_sent_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `support_submissions_status_created_idx` ON `support_submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_submissions_topic_created_idx` ON `support_submissions` (`topic`,`created_at`);