CREATE TABLE `access_code_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeId` int NOT NULL,
	`userId` int NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_code_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_code_redemptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `access_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`note` varchar(255),
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	`expiresAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_codes_code_unique` UNIQUE(`code`)
);
