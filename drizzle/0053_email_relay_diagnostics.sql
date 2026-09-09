CREATE TABLE IF NOT EXISTS `email_relay_diagnostics` (
  `id` int AUTO_INCREMENT NOT NULL,
  `checked_at` bigint NOT NULL,
  `source` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL,
  `active_relay` varchar(32) NOT NULL,
  `primary_healthy` boolean NOT NULL,
  `backup_configured` boolean NOT NULL,
  `duration_ms` int NOT NULL,
  `alert_type` varchar(16),
  `slack_alert_sent` boolean NOT NULL DEFAULT false,
  `email_fallback_attempted` boolean NOT NULL DEFAULT false,
  `email_fallback_delivered` boolean NOT NULL DEFAULT false,
  `diagnostic` varchar(300) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `email_relay_diagnostics_id` PRIMARY KEY(`id`)
);
CREATE INDEX `email_relay_diagnostics_checked_idx` ON `email_relay_diagnostics` (`checked_at`);
