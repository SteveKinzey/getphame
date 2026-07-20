ALTER TABLE `business_profiles` ADD `followUpFirstEnabled` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `followUpSecondEnabled` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `firstDelayDaysSnapshot` int;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `secondDelayDaysSnapshot` int;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `firstStageEnabledSnapshot` int;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `secondStageEnabledSnapshot` int;