CREATE TABLE `bulk_sender_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('sendgrid','mailgun','postmark') NOT NULL,
	`apiKey` text NOT NULL,
	`fromEmail` varchar(320) NOT NULL,
	`fromName` varchar(255),
	`mailgunDomain` varchar(255),
	`mailgunRegion` enum('us','eu') DEFAULT 'us',
	`connected` int NOT NULL DEFAULT 1,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `bulk_sender_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `bulk_sender_credentials_userId_unique` UNIQUE(`userId`)
);
