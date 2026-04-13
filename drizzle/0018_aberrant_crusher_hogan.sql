ALTER TABLE `saved_contacts` ADD `source` enum('manual','woocommerce','stripe') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `externalId` varchar(128);