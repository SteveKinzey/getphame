ALTER TABLE `business_profiles` MODIFY COLUMN `tier` enum('free','pro','annual','lifetime') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `planExpiresAt` bigint;