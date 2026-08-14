ALTER TABLE `email_templates` ADD COLUMN IF NOT EXISTS `familyPublicId` varchar(48);--> statement-breakpoint
ALTER TABLE `email_templates` ADD COLUMN IF NOT EXISTS `locale` varchar(16) NOT NULL DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `email_templates` ADD COLUMN IF NOT EXISTS `activeRevisionId` int;--> statement-breakpoint
ALTER TABLE `email_templates` ADD COLUMN IF NOT EXISTS `provenance` varchar(24) NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `email_templates` ADD COLUMN IF NOT EXISTS `approvedAt` bigint;
