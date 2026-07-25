CREATE TABLE `source_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(48) NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`label` varchar(100) NOT NULL,
	`expectedIntervalMinutes` int NOT NULL DEFAULT 1440,
	`monitoringEnabled` boolean NOT NULL DEFAULT true,
	`status` varchar(20) NOT NULL DEFAULT 'setup',
	`lastEvaluatedAt` bigint,
	`nextEvaluationAt` bigint,
	`lastEventAt` bigint,
	`lastSuccessAt` bigint,
	`lastFailureAt` bigint,
	`lastErrorCode` varchar(64),
	`consecutiveFailures` int NOT NULL DEFAULT 0,
	`failureAlertOpen` boolean NOT NULL DEFAULT false,
	`lastFailureAlertAt` bigint,
	`lastRecoveryAlertAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`archivedAt` bigint,
	CONSTRAINT `source_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_connections_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `source_health_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceConnectionId` int NOT NULL,
	`userId` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`reasonCode` varchar(48) NOT NULL,
	`attemptsInWindow` int NOT NULL DEFAULT 0,
	`failuresInWindow` int NOT NULL DEFAULT 0,
	`lastEventAt` bigint,
	`lastSuccessAt` bigint,
	`checkedAt` bigint NOT NULL,
	`expiresAt` bigint NOT NULL,
	CONSTRAINT `source_health_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_health_schedulers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleKey` varchar(32) NOT NULL DEFAULT 'global',
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 */15 * * * *',
	`lastRunAt` bigint,
	`lastRunStatus` varchar(20),
	`lastRunErrorCode` varchar(64),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `source_health_schedulers_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_health_schedulers_scheduleKey_unique` UNIQUE(`scheduleKey`),
	CONSTRAINT `source_health_schedulers_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `sourceConnectionId` int;--> statement-breakpoint
CREATE INDEX `source_connections_user_created_idx` ON `source_connections` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_connections_key_active_idx` ON `source_connections` (`apiKeyId`,`archivedAt`);--> statement-breakpoint
CREATE INDEX `source_connections_due_idx` ON `source_connections` (`monitoringEnabled`,`nextEvaluationAt`);--> statement-breakpoint
CREATE INDEX `source_health_connection_checked_idx` ON `source_health_history` (`sourceConnectionId`,`checkedAt`);--> statement-breakpoint
CREATE INDEX `source_health_user_checked_idx` ON `source_health_history` (`userId`,`checkedAt`);--> statement-breakpoint
CREATE INDEX `source_health_expiry_idx` ON `source_health_history` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_import_events_source_created_idx` ON `api_import_events` (`sourceConnectionId`,`createdAt`);