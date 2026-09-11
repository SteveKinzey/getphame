-- Additive, idempotent integration health observability migration
-- Stores aggregate status and latency only. Alert URLs are encrypted before storage.
-- Safe for the live MySQL/TiDB database.

CREATE TABLE IF NOT EXISTS `integration_health_samples` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `checkedAt` BIGINT NOT NULL,
  `durationMs` INT NOT NULL,
  `overallStatus` VARCHAR(20) NOT NULL,
  `databaseStatus` VARCHAR(20) NOT NULL,
  `databaseLatencyMs` INT NULL,
  `heartbeatStatus` VARCHAR(20) NOT NULL,
  `heartbeatLatencyMs` INT NULL,
  `stripeStatus` VARCHAR(20) NOT NULL,
  `stripeLatencyMs` INT NULL,
  `emailRelayStatus` VARCHAR(20) NOT NULL,
  `emailRelayLatencyMs` INT NULL,
  `sourcesStatus` VARCHAR(20) NOT NULL,
  `sourcesLatencyMs` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `integration_health_samples_checked_idx` (`checkedAt`)
);

CREATE TABLE IF NOT EXISTS `integration_health_alert_configs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `scopeKey` VARCHAR(32) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `provider` VARCHAR(16) NOT NULL,
  `encryptedWebhookUrl` TEXT NOT NULL,
  `latencyThresholdMs` INT NOT NULL DEFAULT 2500,
  `alertOnFailure` TINYINT(1) NOT NULL DEFAULT 1,
  `alertOnHighLatency` TINYINT(1) NOT NULL DEFAULT 1,
  `updatedByUserId` INT NOT NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `integration_health_alert_configs_scope_unique` (`scopeKey`)
);

CREATE TABLE IF NOT EXISTS `integration_health_alert_deliveries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `configId` INT NOT NULL,
  `eventKey` VARCHAR(96) NOT NULL,
  `category` VARCHAR(16) NOT NULL,
  `component` VARCHAR(32) NOT NULL,
  `componentStatus` VARCHAR(20) NOT NULL,
  `delivered` TINYINT(1) NOT NULL DEFAULT 0,
  `httpStatus` INT NULL,
  `failureCode` VARCHAR(48) NULL,
  `createdAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `integration_health_alert_deliveries_event_idx` (`configId`, `eventKey`, `createdAt`)
);

CREATE TABLE IF NOT EXISTS `integration_health_schedulers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `scheduleKey` VARCHAR(64) NOT NULL,
  `scheduleCronTaskUid` VARCHAR(128) NOT NULL,
  `cronExpression` VARCHAR(64) NOT NULL,
  `lastRunAt` BIGINT NULL,
  `lastRunStatus` VARCHAR(24) NULL,
  `lastRunErrorCode` VARCHAR(64) NULL,
  `createdAt` BIGINT NOT NULL,
  `updatedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `integration_health_schedulers_key_unique` (`scheduleKey`),
  UNIQUE KEY `integration_health_schedulers_task_unique` (`scheduleCronTaskUid`),
  KEY `integration_health_schedulers_task_idx` (`scheduleCronTaskUid`)
);
