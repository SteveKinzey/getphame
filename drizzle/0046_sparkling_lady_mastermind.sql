CREATE TABLE `pwa_update_event_totals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_day` varchar(10) NOT NULL,
	`event` varchar(48) NOT NULL,
	`total` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pwa_update_event_totals_id` PRIMARY KEY(`id`),
	CONSTRAINT `pwa_update_event_totals_day_event_unique` UNIQUE(`event_day`,`event`)
);
--> statement-breakpoint
CREATE INDEX `pwa_update_event_totals_day_idx` ON `pwa_update_event_totals` (`event_day`);