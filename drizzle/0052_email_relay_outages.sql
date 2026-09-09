CREATE TABLE IF NOT EXISTS `email_relay_outages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `started_at` bigint NOT NULL,
  `resolved_at` bigint,
  `cause` varchar(300) NOT NULL,
  `trigger_source` varchar(32) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `email_relay_outages_id` PRIMARY KEY(`id`)
);
CREATE INDEX `email_relay_outages_started_idx` ON `email_relay_outages` (`started_at`);
CREATE INDEX `email_relay_outages_resolved_idx` ON `email_relay_outages` (`resolved_at`);
