CREATE TABLE `source_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceType` enum('csv','woocommerce','api','shopify','square','hubspot','pipedrive','stripe','koalendar') NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`status` enum('connected','disconnected','setup_required','error') NOT NULL DEFAULT 'setup_required',
	`encryptedSecrets` text,
	`settingsJson` text,
	`lastTestedAt` bigint,
	`lastImportedAt` bigint,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_connections_user_type_unique` UNIQUE(`userId`,`sourceType`)
);
--> statement-breakpoint
CREATE TABLE `source_import_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceImportId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`actorType` varchar(32) NOT NULL DEFAULT 'user',
	`detailJson` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `source_import_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceConnectionId` int,
	`sourceType` enum('csv','woocommerce','api','shopify','square','hubspot','pipedrive','stripe','koalendar') NOT NULL,
	`idempotencyKeyHash` varchar(64) NOT NULL,
	`payloadHash` varchar(64) NOT NULL,
	`status` enum('previewed','committed','dismissed','failed') NOT NULL DEFAULT 'previewed',
	`requestedRowCount` int NOT NULL DEFAULT 0,
	`validRowCount` int NOT NULL DEFAULT 0,
	`duplicateRowCount` int NOT NULL DEFAULT 0,
	`rejectedRowCount` int NOT NULL DEFAULT 0,
	`importedCount` int NOT NULL DEFAULT 0,
	`skippedCount` int NOT NULL DEFAULT 0,
	`consentBasis` varchar(32) NOT NULL,
	`consentSource` varchar(255) NOT NULL,
	`consentAttestedAt` bigint NOT NULL,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_imports_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_imports_user_type_idempotency_unique` UNIQUE(`userId`,`sourceType`,`idempotencyKeyHash`)
);
--> statement-breakpoint
CREATE INDEX `source_connections_user_status_idx` ON `source_connections` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `source_import_events_import_created_idx` ON `source_import_events` (`sourceImportId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_import_events_user_created_idx` ON `source_import_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_imports_user_created_idx` ON `source_imports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_imports_connection_created_idx` ON `source_imports` (`sourceConnectionId`,`createdAt`);