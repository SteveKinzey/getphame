CREATE TABLE IF NOT EXISTS `profile_preference_export_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `format` VARCHAR(8) NOT NULL,
  `exported_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `profile_preference_export_history_user_time_idx` (`user_id`, `exported_at`),
  CONSTRAINT `profile_preference_export_history_user_id_users_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
