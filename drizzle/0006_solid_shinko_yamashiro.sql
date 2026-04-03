ALTER TABLE `customer_requests` ADD `respondedAt` bigint;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `tags` text DEFAULT ('[]') NOT NULL;