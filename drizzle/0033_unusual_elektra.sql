CREATE TABLE `notification_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wooAutoImportNotify` boolean NOT NULL DEFAULT true,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `notification_prefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_prefs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_delivery_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`userId` int NOT NULL,
	`event` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`statusCode` int,
	`success` boolean NOT NULL DEFAULT false,
	`responseBody` text,
	`errorMessage` text,
	`durationMs` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `webhook_delivery_logs_id` PRIMARY KEY(`id`)
);
