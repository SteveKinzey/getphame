CREATE TABLE IF NOT EXISTS audit_retention_policy_changes (
  id SERIAL PRIMARY KEY,
  policy_key VARCHAR(32) NOT NULL,
  changed_by_user_id INTEGER NOT NULL,
  previous_route_audit_retention_days INTEGER NOT NULL,
  previous_renderer_error_retention_days INTEGER NOT NULL,
  route_audit_retention_days INTEGER NOT NULL,
  renderer_error_retention_days INTEGER NOT NULL,
  changed_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_retention_policy_changes_changed_idx ON audit_retention_policy_changes (changed_at);
CREATE INDEX IF NOT EXISTS audit_retention_policy_changes_actor_idx ON audit_retention_policy_changes (changed_by_user_id, changed_at);

CREATE TABLE IF NOT EXISTS release_history_export_schedules (
  id SERIAL PRIMARY KEY,
  schedule_key VARCHAR(32) NOT NULL UNIQUE DEFAULT 'global',
  schedule_cron_task_uid VARCHAR(65) UNIQUE,
  cron_expression VARCHAR(64) NOT NULL DEFAULT '0 0 9 * * 1',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status_filter VARCHAR(16) NOT NULL DEFAULT 'all',
  sort_by VARCHAR(32) NOT NULL DEFAULT 'recordedAt',
  sort_direction VARCHAR(8) NOT NULL DEFAULT 'desc',
  selected_columns TEXT NOT NULL,
  last_run_at BIGINT,
  last_run_status VARCHAR(20),
  last_run_error_code VARCHAR(64),
  last_run_row_count INTEGER,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS release_history_export_schedule_task_idx ON release_history_export_schedules (schedule_cron_task_uid);

CREATE TABLE IF NOT EXISTS release_history_export_runs (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL,
  schedule_cron_task_uid VARCHAR(65),
  status VARCHAR(20) NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  truncated BOOLEAN NOT NULL DEFAULT FALSE,
  filename VARCHAR(160),
  csv TEXT,
  generated_at BIGINT NOT NULL,
  error_code VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS release_history_export_runs_schedule_idx ON release_history_export_runs (schedule_id, generated_at);
CREATE INDEX IF NOT EXISTS release_history_export_runs_generated_idx ON release_history_export_runs (generated_at);

CREATE TABLE IF NOT EXISTS renderer_failure_alert_acknowledgements (
  id SERIAL PRIMARY KEY,
  signature VARCHAR(255) NOT NULL UNIQUE,
  template_key VARCHAR(64) NOT NULL,
  viewport_mode VARCHAR(16) NOT NULL,
  dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
  error_code VARCHAR(64) NOT NULL,
  acknowledged_latest_occurred_at BIGINT NOT NULL,
  acknowledged_by_user_id INTEGER NOT NULL,
  acknowledged_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS renderer_failure_alert_acknowledged_idx ON renderer_failure_alert_acknowledgements (acknowledged_at);
