CREATE TABLE IF NOT EXISTS `smtp_test_email_attempts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `recipient_masked` VARCHAR(320) NOT NULL,
  `outcome` ENUM('ok', 'fail') NOT NULL,
  `error_summary` VARCHAR(500) NULL,
  `attempted_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `smtp_test_email_attempts_user_time_idx` (`user_id`, `attempted_at`),
  KEY `smtp_test_email_attempts_time_idx` (`attempted_at`)
);
