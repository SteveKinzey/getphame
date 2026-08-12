CREATE TABLE `audit_retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policy_key` varchar(32) NOT NULL DEFAULT 'global',
	`route_audit_retention_days` int NOT NULL DEFAULT 180,
	`renderer_error_retention_days` int NOT NULL DEFAULT 180,
	`updated_by_user_id` int NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `audit_retention_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_retention_policies_policy_key_unique` UNIQUE(`policy_key`)
);
--> statement-breakpoint
CREATE INDEX `audit_retention_policy_updated_idx` ON `audit_retention_policies` (`updated_at`);
