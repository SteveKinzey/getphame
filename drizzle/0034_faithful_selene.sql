CREATE TABLE `wordpress_pairing_rate_limit_windows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dimensionHash` varchar(64) NOT NULL,
	`windowStartedAt` bigint NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `wordpress_pairing_rate_limit_windows_id` PRIMARY KEY(`id`),
	CONSTRAINT `wordpress_pairing_rate_limit_dimension_window_unique` UNIQUE(`dimensionHash`,`windowStartedAt`)
);
--> statement-breakpoint
CREATE INDEX `wordpress_pairing_rate_limit_expiry_idx` ON `wordpress_pairing_rate_limit_windows` (`expiresAt`);--> statement-breakpoint
