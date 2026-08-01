CREATE TABLE `disposable_domain_account_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`domain` varchar(253) NOT NULL,
	`confidenceScore` int NOT NULL,
	`status` enum('pending','dismissed','resolved') NOT NULL DEFAULT 'pending',
	`detectedAt` bigint NOT NULL,
	`lastDetectedAt` bigint NOT NULL,
	`resolvedAt` bigint,
	`resolvedByUserId` int,
	`adminNote` varchar(500),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `disposable_domain_account_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `disposable_domain_account_reviews_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `disposable_domain_schedulers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleKey` varchar(32) NOT NULL DEFAULT 'global',
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 9,10 * * *',
	`lastRunDateKey` varchar(16),
	`lastRunAt` bigint,
	`lastRunStatus` varchar(20),
	`lastRunErrorCode` varchar(64),
	`lastRunSummaryJson` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `disposable_domain_schedulers_id` PRIMARY KEY(`id`),
	CONSTRAINT `disposable_domain_schedulers_scheduleKey_unique` UNIQUE(`scheduleKey`),
	CONSTRAINT `disposable_domain_schedulers_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `disposable_email_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(253) NOT NULL,
	`sourceEvidenceJson` text NOT NULL,
	`confidenceScore` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`firstSeenAt` bigint NOT NULL,
	`lastSeenAt` bigint NOT NULL,
	`lastDnsCheckedAt` bigint,
	`mxExists` boolean,
	`dnsErrorCode` varchar(64),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `disposable_email_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `disposable_email_domains_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE INDEX `disposable_domain_review_status_detected_idx` ON `disposable_domain_account_reviews` (`status`,`lastDetectedAt`);--> statement-breakpoint
CREATE INDEX `disposable_domain_review_domain_idx` ON `disposable_domain_account_reviews` (`domain`);--> statement-breakpoint
CREATE INDEX `disposable_domain_scheduler_task_idx` ON `disposable_domain_schedulers` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `disposable_domain_active_confidence_idx` ON `disposable_email_domains` (`active`,`confidenceScore`);--> statement-breakpoint
CREATE INDEX `disposable_domain_last_seen_idx` ON `disposable_email_domains` (`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `disposable_domain_dns_checked_idx` ON `disposable_email_domains` (`lastDnsCheckedAt`);