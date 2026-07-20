CREATE TABLE `support_internal_note_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`mentioned_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_internal_note_mentions_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_note_mentions_note_user_unique` UNIQUE(`note_id`,`mentioned_user_id`)
);
--> statement-breakpoint
ALTER TABLE `support_ticket_alerts` MODIFY COLUMN `type` enum('assignment','escalation','mention') NOT NULL;--> statement-breakpoint
ALTER TABLE `support_internal_notes` ADD `body_plain_text` text;--> statement-breakpoint
ALTER TABLE `support_submissions` ADD `first_responded_at` timestamp;--> statement-breakpoint
CREATE INDEX `support_note_mentions_recipient_created_idx` ON `support_internal_note_mentions` (`mentioned_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `support_submissions_first_response_idx` ON `support_submissions` (`first_responded_at`,`created_at`);