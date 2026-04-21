ALTER TABLE `saved_contacts` ADD `optedOut` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `optedOutAt` bigint;--> statement-breakpoint
ALTER TABLE `woo_customers` ADD `optedOut` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `woo_customers` ADD `optedOutAt` bigint;