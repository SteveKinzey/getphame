CREATE TABLE `zoho_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `zoho_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `zohoCustomerId` varchar(64);