CREATE TABLE `wordpress_pairings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(64) NOT NULL,
	`secretHash` varchar(64) NOT NULL,
	`siteUrl` varchar(2048) NOT NULL,
	`siteHost` varchar(255) NOT NULL,
	`siteLabel` varchar(100) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'pending',
	`userId` int,
	`apiKeyId` int,
	`sourceConnectionId` int,
	`encryptedApiKey` text,
	`expiresAt` bigint NOT NULL,
	`approvedAt` bigint,
	`claimedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `wordpress_pairings_id` PRIMARY KEY(`id`),
	CONSTRAINT `wordpress_pairings_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `wordpress_pairings_sourceConnectionId_unique` UNIQUE(`sourceConnectionId`)
);
--> statement-breakpoint
CREATE INDEX `wordpress_pairings_status_expiry_idx` ON `wordpress_pairings` (`status`,`expiresAt`);
--> statement-breakpoint
CREATE INDEX `wordpress_pairings_user_created_idx` ON `wordpress_pairings` (`userId`,`createdAt`);
