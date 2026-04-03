CREATE TABLE `woo_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeUrl` varchar(512) NOT NULL,
	`consumerKey` text NOT NULL,
	`consumerSecret` text NOT NULL,
	`lastSyncedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `woo_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `woo_credentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `woo_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wooOrderId` varchar(64) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`productName` varchar(512),
	`orderDate` bigint NOT NULL,
	`reviewRequestSentAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `woo_customers_id` PRIMARY KEY(`id`)
);
