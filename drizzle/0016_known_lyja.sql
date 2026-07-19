CREATE TABLE `support_escalation_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policy_key` varchar(64) NOT NULL,
	`breach_threshold_minutes` int NOT NULL DEFAULT 0,
	`include_assignee` boolean NOT NULL DEFAULT true,
	`include_all_admins_when_unassigned` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_escalation_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_escalation_policies_policy_key_unique` UNIQUE(`policy_key`)
);
--> statement-breakpoint
CREATE TABLE `support_escalation_policy_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policy_id` int NOT NULL,
	`recipient_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_escalation_policy_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_escalation_policy_recipients_policy_user_unique` UNIQUE(`policy_id`,`recipient_user_id`)
);
--> statement-breakpoint
ALTER TABLE `support_saved_queue_views` ADD `visibility` enum('private','team') DEFAULT 'private' NOT NULL;--> statement-breakpoint
CREATE INDEX `support_escalation_policy_recipients_recipient_idx` ON `support_escalation_policy_recipients` (`recipient_user_id`);--> statement-breakpoint
CREATE INDEX `support_saved_queue_views_visibility_updated_idx` ON `support_saved_queue_views` (`visibility`,`updated_at`);