CREATE TABLE `email_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`templateId` int,
	`type` enum('open','click') NOT NULL,
	`url` varchar(2048),
	`userAgent` varchar(512),
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_events_id` PRIMARY KEY(`id`)
);
