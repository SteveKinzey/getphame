CREATE TABLE `api_import_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int,
	`keyLabel` varchar(100) NOT NULL DEFAULT 'API Key',
	`contactId` int,
	`email` varchar(320) NOT NULL,
	`created` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `api_import_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(64),
	`events` text NOT NULL DEFAULT ('contact.created'),
	`active` boolean NOT NULL DEFAULT true,
	`label` varchar(100) NOT NULL DEFAULT 'Webhook',
	`lastFiredAt` bigint,
	`lastStatus` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `woo_pending_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`phone` varchar(30),
	`orderId` varchar(64),
	`orderDate` bigint,
	`fetchedAt` bigint NOT NULL,
	CONSTRAINT `woo_pending_imports_id` PRIMARY KEY(`id`)
);
