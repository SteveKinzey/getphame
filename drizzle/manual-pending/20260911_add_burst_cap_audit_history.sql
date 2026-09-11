-- Add immutable administrator audit history for adaptive send burst-cap changes.
-- This table contains only tier values, actor IDs, and timestamps; it never stores
-- recipients, email content, review activity, credentials, or customer data.

CREATE TABLE IF NOT EXISTS `adaptive_send_burst_policy_changes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policyKey` VARCHAR(32) NOT NULL,
  `changedByUserId` INT NOT NULL,
  `previousFreeBurstCap` INT NOT NULL,
  `previousProBurstCap` INT NOT NULL,
  `previousAnnualBurstCap` INT NOT NULL,
  `previousLifetimeBurstCap` INT NOT NULL,
  `freeBurstCap` INT NOT NULL,
  `proBurstCap` INT NOT NULL,
  `annualBurstCap` INT NOT NULL,
  `lifetimeBurstCap` INT NOT NULL,
  `changedAt` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adaptive_send_burst_policy_changes_changed_idx` (`policyKey`, `changedAt`),
  KEY `adaptive_send_burst_policy_changes_actor_idx` (`changedByUserId`, `changedAt`)
);
