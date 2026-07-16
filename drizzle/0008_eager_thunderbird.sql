CREATE TABLE `koalendar_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`connectionId` int NOT NULL,
	`externalBookingId` varchar(512) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`inviteeName` varchar(255) NOT NULL,
	`inviteeEmail` varchar(320) NOT NULL,
	`startsAt` bigint NOT NULL,
	`endsAt` bigint NOT NULL,
	`canceledAt` bigint,
	`importedAt` bigint,
	`contactId` int,
	`attempts` int NOT NULL DEFAULT 0,
	`nextAttemptAt` bigint NOT NULL,
	`lastError` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `koalendar_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `koalendar_bookings_user_external_unique` UNIQUE(`userId`,`externalBookingId`)
);
--> statement-breakpoint
CREATE TABLE `koalendar_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`webhookToken` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastEventAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `koalendar_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `koalendar_connections_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `koalendar_connections_webhookToken_unique` UNIQUE(`webhookToken`)
);
--> statement-breakpoint
ALTER TABLE `saved_contacts` MODIFY COLUMN `source` enum('manual','woocommerce','stripe','koalendar') NOT NULL DEFAULT 'manual';--> statement-breakpoint
CREATE INDEX `koalendar_bookings_due_idx` ON `koalendar_bookings` (`status`,`nextAttemptAt`);