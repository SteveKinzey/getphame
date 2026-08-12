CREATE TABLE `release_parity_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkpoint_id` varchar(64) NOT NULL,
	`protected_main_commit` varchar(64) NOT NULL,
	`protected_main_tree` varchar(64) NOT NULL,
	`managed_tree` varchar(64) NOT NULL,
	`parity_status` varchar(16) NOT NULL,
	`recorded_at` bigint NOT NULL,
	CONSTRAINT `release_parity_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `release_parity_recorded_idx` ON `release_parity_records` (`recorded_at`);
