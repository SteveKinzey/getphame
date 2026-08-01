ALTER TABLE `quiet_hours_queued_sends` ADD `recipientEmail` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiet_hours_queued_sends` ADD `subject` varchar(500) NOT NULL;