CREATE TABLE `auth_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`auth_method` enum('oauth','magic_link','passkey') NOT NULL,
	`assurance` enum('a1','a2') NOT NULL DEFAULT 'a1',
	`authenticated_at` bigint NOT NULL,
	`last_step_up_at` bigint,
	`expires_at` bigint NOT NULL,
	`last_seen_at` bigint NOT NULL,
	`revoked_at` bigint,
	`revocation_reason` varchar(255),
	`ip_hash` varchar(64),
	`user_agent_hash` varchar(64),
	`created_at` bigint NOT NULL,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `security_action_approvals` (
	`id` varchar(36) NOT NULL,
	`action_key` varchar(128) NOT NULL,
	`requester_user_id` int NOT NULL,
	`approver_user_id` int,
	`organization_id` int,
	`resource_type` varchar(80),
	`resource_id` varchar(128),
	`status` enum('pending','approved','rejected','expired','executed') NOT NULL DEFAULT 'pending',
	`evidence_reference` varchar(500),
	`requested_at` bigint NOT NULL,
	`expires_at` bigint NOT NULL,
	`decided_at` bigint,
	`executed_at` bigint,
	CONSTRAINT `security_action_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`actor_type` enum('human','service') NOT NULL,
	`actor_user_id` int,
	`service_identity_id` varchar(36),
	`session_id` varchar(36),
	`organization_id` int,
	`permission` varchar(128),
	`decision` enum('allow','deny'),
	`reason_code` varchar(80) NOT NULL,
	`action_key` varchar(128),
	`resource_type` varchar(80),
	`resource_id` varchar(128),
	`metadata_json` text,
	`ip_hash` varchar(64),
	`user_agent_hash` varchar(64),
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `security_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_permission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`permission` varchar(128) NOT NULL,
	`effect` enum('allow','deny') NOT NULL,
	`scope_type` enum('platform','organization') NOT NULL,
	`organization_id` int,
	`reason` varchar(500) NOT NULL,
	`granted_by_user_id` int NOT NULL,
	`granted_at` bigint NOT NULL,
	`expires_at` bigint,
	`revoked_at` bigint,
	`revoked_by_user_id` int,
	CONSTRAINT `security_permission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_role_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('platform_owner','security_administrator','platform_operations_administrator','billing_administrator','support_manager','support_agent','organization_owner','organization_administrator','campaign_operator') NOT NULL,
	`scope_type` enum('platform','organization') NOT NULL,
	`organization_id` int,
	`granted_by_user_id` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`granted_at` bigint NOT NULL,
	`expires_at` bigint,
	`revoked_at` bigint,
	`revoked_by_user_id` int,
	`revoke_reason` varchar(500),
	CONSTRAINT `security_role_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `security_action_approvals_action_idx` ON `security_action_approvals` (`action_key`,`status`);--> statement-breakpoint
CREATE INDEX `security_action_approvals_requester_idx` ON `security_action_approvals` (`requester_user_id`);--> statement-breakpoint
CREATE INDEX `security_audit_events_type_idx` ON `security_audit_events` (`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `security_audit_events_actor_idx` ON `security_audit_events` (`actor_user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `security_audit_events_org_idx` ON `security_audit_events` (`organization_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `security_permission_overrides_user_idx` ON `security_permission_overrides` (`user_id`);--> statement-breakpoint
CREATE INDEX `security_permission_overrides_permission_idx` ON `security_permission_overrides` (`permission`);--> statement-breakpoint
CREATE INDEX `security_role_grants_user_idx` ON `security_role_grants` (`user_id`);--> statement-breakpoint
CREATE INDEX `security_role_grants_scope_idx` ON `security_role_grants` (`scope_type`,`organization_id`);--> statement-breakpoint
CREATE INDEX `security_role_grants_active_idx` ON `security_role_grants` (`user_id`,`revoked_at`,`expires_at`);