CREATE TABLE `quiet_hours_queued_sends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerRequestId` int NOT NULL,
	`html` text NOT NULL,
	`source` varchar(32) NOT NULL,
	`sourceRecordId` int,
	`templateId` int,
	`scheduledAt` bigint NOT NULL,
	`status` enum('pending','sending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastError` varchar(1000),
	`claimedAt` bigint,
	`sentAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiet_hours_queued_sends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customer_requests` MODIFY COLUMN `sentAt` timestamp;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `physicalAddress` varchar(500);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `normalizedPhysicalAddress` varchar(500);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `businessTimeZone` varchar(100);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `quietHoursStartMinutes` int DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `quietHoursEndMinutes` int DEFAULT 480 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `quietHoursShorteningApproved` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `quietHoursShorteningApprovedAt` bigint;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `quietHoursShorteningApprovedByUserId` int;--> statement-breakpoint
CREATE INDEX `quiet_hours_queue_due_idx` ON `quiet_hours_queued_sends` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `quiet_hours_queue_request_idx` ON `quiet_hours_queued_sends` (`customerRequestId`);--> statement-breakpoint
CREATE INDEX `quiet_hours_queue_user_status_idx` ON `quiet_hours_queued_sends` (`userId`,`status`);