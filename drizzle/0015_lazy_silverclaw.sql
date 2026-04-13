ALTER TABLE `smtp_credentials` ADD `lastHealthCheck` bigint;--> statement-breakpoint
ALTER TABLE `smtp_credentials` ADD `lastHealthStatus` enum('ok','fail');