CREATE TABLE `outbound_send_limit_windows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scopeKey` varchar(96) NOT NULL,
	`windowType` varchar(8) NOT NULL,
	`windowStartedAt` bigint NOT NULL,
	`sendCount` int NOT NULL DEFAULT 0,
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `outbound_send_limit_windows_id` PRIMARY KEY(`id`),
	CONSTRAINT `outbound_send_limit_scope_window_unique` UNIQUE(`userId`,`scopeKey`,`windowType`,`windowStartedAt`)
);
--> statement-breakpoint
CREATE INDEX `outbound_send_limit_user_expiry_idx` ON `outbound_send_limit_windows` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `outbound_send_limit_expiry_idx` ON `outbound_send_limit_windows` (`expiresAt`);