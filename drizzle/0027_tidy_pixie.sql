CREATE TABLE `webauthn_ceremonies` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`purpose` enum('registration','authentication') NOT NULL,
	`challenge_hash` varchar(64) NOT NULL,
	`rp_id` varchar(255) NOT NULL,
	`expected_origin` varchar(512) NOT NULL,
	`expires_at` bigint NOT NULL,
	`consumed_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `webauthn_ceremonies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webauthn_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`credential_id` text NOT NULL,
	`credential_id_hash` varchar(64) NOT NULL,
	`public_key` text NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	`transports_json` text,
	`device_type` varchar(32),
	`backed_up` boolean NOT NULL DEFAULT false,
	`aaguid` varchar(64),
	`display_name` varchar(80) NOT NULL DEFAULT 'Passkey',
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`created_at` bigint NOT NULL,
	`last_used_at` bigint,
	`revoked_at` bigint,
	`revoked_by_user_id` int,
	CONSTRAINT `webauthn_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `webauthn_credentials_credential_id_hash_unique` UNIQUE(`credential_id_hash`)
);
--> statement-breakpoint
CREATE INDEX `webauthn_ceremonies_expiry_idx` ON `webauthn_ceremonies` (`expires_at`,`consumed_at`);--> statement-breakpoint
CREATE INDEX `webauthn_ceremonies_user_idx` ON `webauthn_ceremonies` (`user_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `webauthn_credentials_user_idx` ON `webauthn_credentials` (`user_id`,`status`);