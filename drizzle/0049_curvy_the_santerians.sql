CREATE TABLE `source_automation_schedulers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleKey` varchar(32) NOT NULL DEFAULT 'global',
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 */5 * * * *',
	`lastRunAt` bigint,
	`lastRunStatus` varchar(20),
	`lastRunErrorCode` varchar(64),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `source_automation_schedulers_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_automation_schedulers_scheduleKey_unique` UNIQUE(`scheduleKey`),
	CONSTRAINT `source_automation_schedulers_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
