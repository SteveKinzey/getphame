CREATE TABLE `client_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewerName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text,
	`platform` enum('google','yelp','tripadvisor','bing','facebook','apple','other') NOT NULL DEFAULT 'google',
	`reviewedAt` bigint NOT NULL,
	`requestId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `client_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(100) NOT NULL,
	`headline` varchar(255),
	`bio` text,
	`logoUrl` text,
	`isPublic` int NOT NULL DEFAULT 1,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `public_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `public_profiles_slug_unique` UNIQUE(`slug`)
);
