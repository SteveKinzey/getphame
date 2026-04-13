CREATE TABLE `woo_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`syncedAt` bigint NOT NULL,
	`daysWindow` int NOT NULL DEFAULT 30,
	`added` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`storeUrl` varchar(512),
	CONSTRAINT `woo_sync_logs_id` PRIMARY KEY(`id`)
);
