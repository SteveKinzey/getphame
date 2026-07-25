CREATE TABLE `manual_search_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`query` varchar(100) NOT NULL,
	`query_fingerprint` varchar(64) NOT NULL,
	`manual_role` enum('user','admin') NOT NULL,
	`locale` varchar(10) NOT NULL,
	`manual_version` varchar(20) NOT NULL,
	`dedupe_key` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manual_search_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `manual_search_events_dedupe_unique` UNIQUE(`dedupe_key`)
);
--> statement-breakpoint
CREATE INDEX `manual_search_events_created_idx` ON `manual_search_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `manual_search_events_role_locale_created_idx` ON `manual_search_events` (`manual_role`,`locale`,`created_at`);--> statement-breakpoint
CREATE INDEX `manual_search_events_query_created_idx` ON `manual_search_events` (`query_fingerprint`,`created_at`);