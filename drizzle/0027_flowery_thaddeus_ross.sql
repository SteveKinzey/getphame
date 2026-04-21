CREATE TABLE `churn_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`reason` enum('too_expensive','not_using','switching_tools','missing_feature','other') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `churn_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`page` varchar(255) NOT NULL,
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(128),
	`referrer` varchar(2048),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_events_id` PRIMARY KEY(`id`)
);
