ALTER TABLE `business_profiles` ADD `followUpEnabled` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `followUpDelayDays` int DEFAULT 3 NOT NULL;