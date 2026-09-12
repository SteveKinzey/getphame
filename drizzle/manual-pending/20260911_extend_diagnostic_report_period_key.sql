-- Expand the metadata-only reporting-period key for administrator-selected UTC ranges.
-- Existing YYYY-MM monthly keys remain valid; no report contents or recipient identities are stored.

ALTER TABLE `monthly_diagnostic_export_runs`
  MODIFY COLUMN `report_month_key` VARCHAR(32) NOT NULL;
