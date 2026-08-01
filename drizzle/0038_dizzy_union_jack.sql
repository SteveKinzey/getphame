CREATE TABLE `provider_human_verification_attempts` (
	`id` varchar(36) NOT NULL,
	`provider` enum('google','apple') NOT NULL,
	`expires_at` bigint NOT NULL,
	`consumed_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `provider_human_verification_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `provider_human_verification_expiry_idx` ON `provider_human_verification_attempts` (`expires_at`);--> statement-breakpoint
CREATE INDEX `provider_human_verification_consumed_idx` ON `provider_human_verification_attempts` (`consumed_at`);