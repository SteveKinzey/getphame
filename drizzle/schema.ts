import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// Keep the existing schema declarations readable while targeting the managed TiDB/MySQL database.
const integer = int;
const serial = (name: string) => int(name).autoincrement();
const pgTable = mysqlTable;
const pgEnum =
  <T extends [string, ...string[]]>(_typeName: string, values: T) =>
  (columnName: string) =>
    mysqlEnum(columnName, values);

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const tierEnum = pgEnum("tier", ["free", "pro", "annual", "lifetime"]);
export const methodEnum = pgEnum("method", ["email", "sms", "both"]);
export const requestStatusEnum = pgEnum("request_status", [
  "sent",
  "pending",
  "followed_up",
]);
export const quietHoursQueuedSendStatusEnum = pgEnum(
  "quiet_hours_queued_send_status",
  ["pending", "sending", "sent", "cancelled", "failed"]
);
export const contactSourceEnum = pgEnum("contact_source", [
  "manual",
  "woocommerce",
  "stripe",
  "koalendar",
  "api",
]);
export const reminderStatusEnum = pgEnum("reminder_status", [
  "pending",
  "sent",
  "cancelled",
]);
export const platformEnum = pgEnum("platform", [
  "google",
  "yelp",
  "tripadvisor",
  "bing",
  "facebook",
  "apple",
  "other",
]);
export const emailEventTypeEnum = pgEnum("email_event_type", ["open", "click"]);
export const churnReasonEnum = pgEnum("churn_reason", [
  "too_expensive",
  "not_using",
  "switching_tools",
  "missing_feature",
  "other",
]);
export const healthStatusEnum = pgEnum("health_status", ["ok", "fail"]);
export const bulkProviderEnum = pgEnum("bulk_provider", [
  "sendgrid",
  "amazon_ses",
  "mailgun",
  "mailjet",
  "mailersend",
  "smtp2go",
  "brevo",
  "postmark",
  "sparkpost",
  "elastic_email",
  "zoho_zeptomail",
  "socketlabs",
  "custom_smtp",
]);
export const outboundMailChannelEnum = pgEnum("outbound_mail_channel", [
  "personal",
  "bulk",
]);
export const mailgunRegionEnum = pgEnum("mailgun_region", ["us", "eu"]);
export const authDiagnosticEventTypeEnum = pgEnum(
  "auth_diagnostic_event_type",
  [
    "request_received",
    "token_created",
    "provider_accepted",
    "provider_failed",
    "verification_succeeded",
    "verification_failed",
  ]
);
export const authHealthTriggerEnum = pgEnum("auth_health_trigger", [
  "scheduled",
  "manual",
]);
export const automationEventKindEnum = pgEnum("automation_event_kind", [
  "drift_audit",
  "dependabot_merge",
]);
export const automationEventResultEnum = pgEnum("automation_event_result", [
  "success",
  "failure",
]);
export const activityTrendPresetRangeEnum = pgEnum(
  "activity_trend_preset_range",
  ["30", "60", "90", "custom"]
);
export const securityAuditOutcomeEnum = pgEnum("security_audit_outcome", [
  "clean",
  "attention",
  "failed",
]);
export const securityAuditValidationStatusEnum = pgEnum(
  "security_audit_validation_status",
  ["passed", "failed", "not_run"]
);
export const supportTopicEnum = pgEnum("support_topic", [
  "billing",
  "onboarding",
  "technical",
  "quiet_hours_exception",
]);
export const supportSubmissionStatusEnum = pgEnum("support_submission_status", [
  "open",
  "in_progress",
  "resolved",
]);
export const supportPriorityEnum = pgEnum("support_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const supportTicketAlertTypeEnum = pgEnum("support_ticket_alert_type", [
  "assignment",
  "escalation",
  "mention",
  "sla_breach",
]);
export const supportQueueAssigneeScopeEnum = pgEnum(
  "support_queue_assignee_scope",
  ["any", "unassigned", "specific"]
);
export const supportQueueSlaWindowEnum = pgEnum("support_queue_sla_window", [
  "overdue",
  "next_4_hours",
  "next_24_hours",
]);
export const supportQueueSortEnum = pgEnum("support_queue_sort", [
  "newest",
  "oldest",
  "priority",
  "assignee",
  "sla_soonest",
  "due_soonest",
]);
export const supportQueueViewVisibilityEnum = pgEnum(
  "support_queue_view_visibility",
  ["private", "team"]
);
export const complimentaryAccessDurationUnitEnum = pgEnum(
  "complimentary_access_duration_unit",
  ["day", "month", "year"]
);
export const securityRoleEnum = pgEnum("security_role", [
  "platform_owner",
  "security_administrator",
  "platform_operations_administrator",
  "billing_administrator",
  "support_manager",
  "support_agent",
  "organization_owner",
  "organization_administrator",
  "campaign_operator",
]);
export const securityScopeEnum = pgEnum("security_scope", [
  "platform",
  "organization",
]);
export const securityPermissionEffectEnum = pgEnum(
  "security_permission_effect",
  ["allow", "deny"]
);
export const securityActorTypeEnum = pgEnum("security_actor_type", [
  "human",
  "service",
]);
export const securityDecisionEnum = pgEnum("security_decision", [
  "allow",
  "deny",
]);
export const securityApprovalStatusEnum = pgEnum("security_approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "executed",
]);
export const securitySessionAuthMethodEnum = pgEnum(
  "security_session_auth_method",
  ["oauth", "magic_link", "passkey"]
);
export const securityAssuranceEnum = pgEnum("security_assurance", ["a1", "a2"]);
export const webauthnCeremonyTypeEnum = pgEnum("webauthn_ceremony_type", [
  "registration",
  "authentication",
]);
export const webauthnCredentialStatusEnum = pgEnum(
  "webauthn_credential_status",
  ["active", "revoked"]
);
export const recoveryEnvironmentEnum = pgEnum("recovery_environment", [
  "staging",
  "production",
]);
export const recoveryDrillStatusEnum = pgEnum("recovery_drill_status", [
  "draft",
  "ready",
  "in_progress",
  "paused",
  "completed",
  "aborted",
]);
export const recoveryDrillRoleEnum = pgEnum("recovery_drill_role", [
  "recovery_custodian",
  "independent_approver",
  "observer",
]);
export const recoveryApprovalDecisionEnum = pgEnum(
  "recovery_approval_decision",
  ["approved", "rejected"]
);
export const disposableDomainReviewStatusEnum = pgEnum(
  "disposable_domain_review_status",
  ["pending", "dismissed", "resolved"]
);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  // Auth additions
  passwordHash: text("password_hash"),
  defaultFromEmail: text("default_from_email"),
  defaultFromName: text("default_from_name"),
  avatarKey: text("avatar_key"),
  avatarMimeType: varchar("avatar_mime_type", { length: 64 }),
  avatarUpdatedAt: timestamp("avatar_updated_at"),
  /** Unix milliseconds; active only while in the future. */
  suspendedUntil: bigint("suspended_until", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Additional OAuth identities retained when duplicate user accounts are combined. */
export const userIdentityAliases = pgTable(
  "user_identity_aliases",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    loginMethod: varchar("loginMethod", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("user_identity_alias_user_idx").on(table.userId)]
);

export type UserIdentityAlias = typeof userIdentityAliases.$inferSelect;
export type InsertUserIdentityAlias = typeof userIdentityAliases.$inferInsert;

/** Magic link tokens for passwordless email login */
export const magicLinks = pgTable("magic_links", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLink = typeof magicLinks.$inferSelect;
export type InsertMagicLink = typeof magicLinks.$inferInsert;

/**
 * Privacy-bounded magic-link lifecycle diagnostics. Full recipients and raw
 * tokens are deliberately excluded; fingerprints are one-way HMAC values.
 */
export const authDiagnosticEvents = pgTable(
  "auth_diagnostic_events",
  {
    id: serial("id").primaryKey(),
    requestId: varchar("request_id", { length: 64 }).notNull(),
    eventType: authDiagnosticEventTypeEnum("event_type").notNull(),
    outcome: healthStatusEnum("outcome").notNull(),
    emailFingerprint: varchar("email_fingerprint", { length: 64 }),
    emailMasked: varchar("email_masked", { length: 320 }),
    tokenFingerprint: varchar("token_fingerprint", { length: 64 }),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    detailCode: varchar("detail_code", { length: 64 }),
    detailMessage: varchar("detail_message", { length: 500 }),
    durationMs: integer("duration_ms"),
    occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  },
  table => [
    index("auth_diag_request_idx").on(table.requestId),
    index("auth_diag_email_idx").on(table.emailFingerprint),
    index("auth_diag_occurred_idx").on(table.occurredAt),
  ]
);

export type AuthDiagnosticEvent = typeof authDiagnosticEvents.$inferSelect;
export type InsertAuthDiagnosticEvent =
  typeof authDiagnosticEvents.$inferInsert;

/** Results from deterministic, non-destructive production authentication checks. */
export const authHealthChecks = pgTable(
  "auth_health_checks",
  {
    id: serial("id").primaryKey(),
    triggerSource: authHealthTriggerEnum("trigger_source").notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    overallStatus: healthStatusEnum("overall_status").notNull(),
    configStatus: healthStatusEnum("config_status").notNull(),
    databaseStatus: healthStatusEnum("database_status").notNull(),
    userSchemaStatus: healthStatusEnum("user_schema_status").notNull(),
    magicLinkSchemaStatus: healthStatusEnum(
      "magic_link_schema_status"
    ).notNull(),
    sessionStatus: healthStatusEnum("session_status").notNull(),
    emailProviderStatus: healthStatusEnum("email_provider_status").notNull(),
    providerName: varchar("provider_name", { length: 64 }),
    failureCode: varchar("failure_code", { length: 64 }),
    failureDetail: varchar("failure_detail", { length: 500 }),
    durationMs: integer("duration_ms").notNull(),
    checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
  },
  table => [
    index("auth_health_checked_idx").on(table.checkedAt),
    index("auth_health_task_uid_idx").on(table.scheduleCronTaskUid),
  ]
);

export type AuthHealthCheck = typeof authHealthChecks.$inferSelect;
export type InsertAuthHealthCheck = typeof authHealthChecks.$inferInsert;

/**
 * Sanitized production-route audit outcomes triggered by administrators. The
 * findings payload contains only route paths, aggregate browser signal counts,
 * and render metrics; it deliberately excludes cookies, page markup, request
 * headers, and raw console output.
 */
export const routeAuditRuns = pgTable(
  "route_audit_runs",
  {
    id: serial("id").primaryKey(),
    triggeredByUserId: integer("triggered_by_user_id").notNull(),
    routesAudited: integer("routes_audited").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    findings: text("findings").notNull(),
    runnerErrorCode: varchar("runner_error_code", { length: 64 }),
    durationMs: integer("duration_ms").notNull(),
    auditedAt: bigint("audited_at", { mode: "number" }).notNull(),
  },
  table => [
    index("route_audit_runs_audited_idx").on(table.auditedAt),
    index("route_audit_runs_triggered_idx").on(
      table.triggeredByUserId,
      table.auditedAt
    ),
  ]
);

export type RouteAuditRun = typeof routeAuditRuns.$inferSelect;
export type InsertRouteAuditRun = typeof routeAuditRuns.$inferInsert;

/**
 * Minimal administrator-reported renderer failures. Do not retain email HTML,
 * recipient data, raw errors, or browser console content in this diagnostic log.
 */
export const emailPreviewRendererErrors = pgTable(
  "email_preview_renderer_errors",
  {
    id: serial("id").primaryKey(),
    reportedByUserId: integer("reported_by_user_id").notNull(),
    templateKey: varchar("template_key", { length: 64 }).notNull(),
    viewportMode: varchar("viewport_mode", { length: 16 }).notNull(),
    darkMode: boolean("dark_mode").notNull().default(false),
    errorCode: varchar("error_code", { length: 64 }).notNull(),
    occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  },
  table => [
    index("email_preview_renderer_errors_occurred_idx").on(table.occurredAt),
    index("email_preview_renderer_errors_reporter_idx").on(
      table.reportedByUserId,
      table.occurredAt
    ),
  ]
);

export type EmailPreviewRendererError =
  typeof emailPreviewRendererErrors.$inferSelect;
export type InsertEmailPreviewRendererError =
  typeof emailPreviewRendererErrors.$inferInsert;

/**
 * Global, administrator-only retention policy for the sanitized route-audit and
 * renderer-error logs. This contains configuration only; it never stores
 * customer content, message HTML, browser logs, or raw error details.
 */
export const auditRetentionPolicies = pgTable(
  "audit_retention_policies",
  {
    id: serial("id").primaryKey(),
    policyKey: varchar("policy_key", { length: 32 })
      .notNull()
      .default("global")
      .unique(),
    routeAuditRetentionDays: integer("route_audit_retention_days")
      .notNull()
      .default(180),
    rendererErrorRetentionDays: integer("renderer_error_retention_days")
      .notNull()
      .default(180),
    updatedByUserId: integer("updated_by_user_id").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  table => [index("audit_retention_policy_updated_idx").on(table.updatedAt)]
);

export type AuditRetentionPolicy = typeof auditRetentionPolicies.$inferSelect;
export type InsertAuditRetentionPolicy =
  typeof auditRetentionPolicies.$inferInsert;

/** Sanitized, administrator-only audit trail of global diagnostic retention policy changes. */
export const auditRetentionPolicyChanges = pgTable(
  "audit_retention_policy_changes",
  {
    id: serial("id").primaryKey(),
    policyKey: varchar("policy_key", { length: 32 }).notNull(),
    changedByUserId: integer("changed_by_user_id").notNull(),
    previousRouteAuditRetentionDays: integer("previous_route_audit_retention_days").notNull(),
    previousRendererErrorRetentionDays: integer("previous_renderer_error_retention_days").notNull(),
    routeAuditRetentionDays: integer("route_audit_retention_days").notNull(),
    rendererErrorRetentionDays: integer("renderer_error_retention_days").notNull(),
    changedAt: bigint("changed_at", { mode: "number" }).notNull(),
  },
  table => [
    index("audit_retention_policy_changes_changed_idx").on(table.changedAt),
    index("audit_retention_policy_changes_actor_idx").on(table.changedByUserId, table.changedAt),
  ]
);

/** Global administrator-owned schedule for sanitized release-history export snapshots. */
export const releaseHistoryExportSchedules = pgTable(
  "release_history_export_schedules",
  {
    id: serial("id").primaryKey(),
    scheduleKey: varchar("schedule_key", { length: 32 }).notNull().default("global").unique(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
    cronExpression: varchar("cron_expression", { length: 64 }).notNull().default("0 0 9 * * 1"),
    enabled: boolean("enabled").notNull().default(false),
    statusFilter: varchar("status_filter", { length: 16 }).notNull().default("all"),
    sortBy: varchar("sort_by", { length: 32 }).notNull().default("recordedAt"),
    sortDirection: varchar("sort_direction", { length: 8 }).notNull().default("desc"),
    selectedColumns: text("selected_columns").notNull(),
    lastRunAt: bigint("last_run_at", { mode: "number" }),
    lastRunStatus: varchar("last_run_status", { length: 20 }),
    lastRunErrorCode: varchar("last_run_error_code", { length: 64 }),
    lastRunRowCount: integer("last_run_row_count"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  table => [index("release_history_export_schedule_task_idx").on(table.scheduleCronTaskUid)]
);

/** Bounded metadata for completed scheduled exports. CSV content and identities are never stored here. */
export const releaseHistoryExportRuns = pgTable(
  "release_history_export_runs",
  {
    id: serial("id").primaryKey(),
    scheduleId: integer("schedule_id").notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    status: varchar("status", { length: 20 }).notNull(),
    rowCount: integer("row_count").notNull().default(0),
    truncated: boolean("truncated").notNull().default(false),
    filename: varchar("filename", { length: 160 }),
    csv: text("csv"),
    generatedAt: bigint("generated_at", { mode: "number" }).notNull(),
    errorCode: varchar("error_code", { length: 64 }),
  },
  table => [
    index("release_history_export_runs_schedule_idx").on(table.scheduleId, table.generatedAt),
    index("release_history_export_runs_generated_idx").on(table.generatedAt),
  ]
);

/** Global acknowledgement of one sanitized repeat-renderer signature until newer evidence arrives. */
export const rendererFailureAlertAcknowledgements = pgTable(
  "renderer_failure_alert_acknowledgements",
  {
    id: serial("id").primaryKey(),
    signature: varchar("signature", { length: 255 }).notNull().unique(),
    templateKey: varchar("template_key", { length: 64 }).notNull(),
    viewportMode: varchar("viewport_mode", { length: 16 }).notNull(),
    darkMode: boolean("dark_mode").notNull().default(false),
    errorCode: varchar("error_code", { length: 64 }).notNull(),
    acknowledgedLatestOccurredAt: bigint("acknowledged_latest_occurred_at", { mode: "number" }).notNull(),
    acknowledgedByUserId: integer("acknowledged_by_user_id").notNull(),
    acknowledgedAt: bigint("acknowledged_at", { mode: "number" }).notNull(),
  },
  table => [index("renderer_failure_alert_acknowledged_idx").on(table.acknowledgedAt)]
);

/**
 * Privacy-minimized GitHub automation outcomes received through verified OIDC.
 * Raw tokens, workflow payloads, logs, diffs, and pull-request bodies are excluded.
 */
export const automationEvents = pgTable(
  "automation_events",
  {
    id: serial("id").primaryKey(),
    eventKey: varchar("event_key", { length: 191 }).notNull(),
    oidcJtiHash: varchar("oidc_jti_hash", { length: 64 }).notNull(),
    kind: automationEventKindEnum("kind").notNull(),
    result: automationEventResultEnum("result").notNull(),
    repository: varchar("repository", { length: 255 }).notNull(),
    repositoryId: varchar("repository_id", { length: 32 }).notNull(),
    repositoryOwnerId: varchar("repository_owner_id", { length: 32 }).notNull(),
    ref: varchar("ref", { length: 255 }).notNull(),
    eventName: varchar("event_name", { length: 64 }).notNull(),
    workflow: varchar("workflow", { length: 255 }).notNull(),
    workflowRef: varchar("workflow_ref", { length: 512 }).notNull(),
    workflowSha: varchar("workflow_sha", { length: 40 }).notNull(),
    runId: varchar("run_id", { length: 32 }).notNull(),
    runNumber: integer("run_number").notNull(),
    runAttempt: integer("run_attempt").notNull(),
    runUrl: varchar("run_url", { length: 512 }).notNull(),
    eventAt: bigint("event_at", { mode: "number" }).notNull(),
    durationMs: integer("duration_ms"),
    pullRequestNumber: integer("pull_request_number"),
    pullRequestCreatedAt: bigint("pull_request_created_at", { mode: "number" }),
    pullRequestMergedAt: bigint("pull_request_merged_at", { mode: "number" }),
    failureCode: varchar("failure_code", { length: 64 }),
    failureSummary: varchar("failure_summary", { length: 300 }),
    receivedAt: bigint("received_at", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("automation_events_event_key_unique").on(table.eventKey),
    uniqueIndex("automation_events_oidc_jti_unique").on(table.oidcJtiHash),
    index("automation_events_kind_event_idx").on(table.kind, table.eventAt),
    index("automation_events_result_event_idx").on(table.result, table.eventAt),
  ]
);

export type AutomationEvent = typeof automationEvents.$inferSelect;
export type InsertAutomationEvent = typeof automationEvents.$inferInsert;

/**
 * Privacy-minimized monthly dependency-audit reports received from the trusted
 * Get Phame GitHub Actions workflow. Raw logs, package paths, advisory text,
 * and credentials are deliberately excluded from this administrator-only record.
 */
export const securityAuditReports = pgTable(
  "security_audit_reports",
  {
    id: serial("id").primaryKey(),
    eventKey: varchar("event_key", { length: 191 }).notNull(),
    oidcJtiHash: varchar("oidc_jti_hash", { length: 64 }).notNull(),
    outcome: securityAuditOutcomeEnum("outcome").notNull(),
    productionInfoCount: integer("production_info_count").notNull().default(0),
    productionLowCount: integer("production_low_count").notNull().default(0),
    productionModerateCount: integer("production_moderate_count")
      .notNull()
      .default(0),
    productionHighCount: integer("production_high_count").notNull().default(0),
    productionCriticalCount: integer("production_critical_count")
      .notNull()
      .default(0),
    fullInfoCount: integer("full_info_count").notNull().default(0),
    fullLowCount: integer("full_low_count").notNull().default(0),
    fullModerateCount: integer("full_moderate_count").notNull().default(0),
    fullHighCount: integer("full_high_count").notNull().default(0),
    fullCriticalCount: integer("full_critical_count").notNull().default(0),
    productionDependencyCount: integer("production_dependency_count")
      .notNull()
      .default(0),
    fullDependencyCount: integer("full_dependency_count").notNull().default(0),
    updatedPackageCount: integer("updated_package_count").notNull().default(0),
    testStatus: securityAuditValidationStatusEnum("test_status").notNull(),
    buildStatus: securityAuditValidationStatusEnum("build_status").notNull(),
    failureCode: varchar("failure_code", { length: 64 }),
    failureSummary: varchar("failure_summary", { length: 300 }),
    repository: varchar("repository", { length: 255 }).notNull(),
    repositoryId: varchar("repository_id", { length: 32 }).notNull(),
    repositoryOwnerId: varchar("repository_owner_id", { length: 32 }).notNull(),
    ref: varchar("ref", { length: 255 }).notNull(),
    eventName: varchar("event_name", { length: 64 }).notNull(),
    workflow: varchar("workflow", { length: 255 }).notNull(),
    workflowRef: varchar("workflow_ref", { length: 512 }).notNull(),
    workflowSha: varchar("workflow_sha", { length: 40 }).notNull(),
    runId: varchar("run_id", { length: 32 }).notNull(),
    runNumber: integer("run_number").notNull(),
    runAttempt: integer("run_attempt").notNull(),
    runUrl: varchar("run_url", { length: 512 }).notNull(),
    eventAt: bigint("event_at", { mode: "number" }).notNull(),
    durationMs: integer("duration_ms"),
    receivedAt: bigint("received_at", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("security_audit_reports_event_key_unique").on(table.eventKey),
    uniqueIndex("security_audit_reports_oidc_jti_unique").on(table.oidcJtiHash),
    index("security_audit_reports_event_idx").on(table.eventAt),
    index("security_audit_reports_outcome_event_idx").on(
      table.outcome,
      table.eventAt
    ),
  ]
);

export type SecurityAuditReport = typeof securityAuditReports.$inferSelect;
export type InsertSecurityAuditReport =
  typeof securityAuditReports.$inferInsert;

/** Per-administrator dismissal of one active drift-failure event. */
export const automationAlertAcknowledgements = pgTable(
  "automation_alert_acknowledgements",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull(),
    adminUserId: integer("admin_user_id").notNull(),
    acknowledgedAt: bigint("acknowledged_at", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("automation_alert_ack_event_admin_unique").on(
      table.eventId,
      table.adminUserId
    ),
    index("automation_alert_ack_admin_time_idx").on(
      table.adminUserId,
      table.acknowledgedAt
    ),
  ]
);

export type AutomationAlertAcknowledgement =
  typeof automationAlertAcknowledgements.$inferSelect;
export type InsertAutomationAlertAcknowledgement =
  typeof automationAlertAcknowledgements.$inferInsert;

/**
 * Administrator-owned auth-health history filter presets. Only validated filter
 * values are persisted; health-check rows and failure details are never copied.
 */
export const authHealthHistoryPresets = pgTable(
  "auth_health_history_presets",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 80 }).notNull(),
    status: healthStatusEnum("status"),
    triggerSource: authHealthTriggerEnum("trigger_source"),
    fromMs: bigint("from_ms", { mode: "number" }),
    toMs: bigint("to_ms", { mode: "number" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("auth_health_history_presets_owner_name_unique").on(
      table.ownerUserId,
      table.normalizedName
    ),
    index("auth_health_history_presets_owner_updated_idx").on(
      table.ownerUserId,
      table.updatedAt
    ),
    index("auth_health_history_presets_owner_sort_idx").on(
      table.ownerUserId,
      table.sortOrder,
      table.id
    ),
  ]
);

export type AuthHealthHistoryPreset =
  typeof authHealthHistoryPresets.$inferSelect;
export type InsertAuthHealthHistoryPreset =
  typeof authHealthHistoryPresets.$inferInsert;

/**
 * Authenticated-user-owned Activity Trend export presets. Presets persist only
 * bounded range configuration and canonical series flags; activity rows are
 * never copied into a preset record.
 */
export const activityTrendExportPresets = pgTable(
  "activity_trend_export_presets",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 80 }).notNull(),
    rangeKey: activityTrendPresetRangeEnum("range_key").notNull(),
    customStartDate: varchar("custom_start_date", { length: 10 }),
    customEndDate: varchar("custom_end_date", { length: 10 }),
    includeSends: boolean("include_sends").notNull().default(true),
    includeOpens: boolean("include_opens").notNull().default(true),
    includeClicks: boolean("include_clicks").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("activity_trend_presets_owner_name_unique").on(
      table.ownerUserId,
      table.normalizedName
    ),
    index("activity_trend_presets_owner_updated_idx").on(
      table.ownerUserId,
      table.updatedAt
    ),
    index("activity_trend_presets_owner_sort_idx").on(
      table.ownerUserId,
      table.sortOrder,
      table.id
    ),
  ]
);

export type ActivityTrendExportPreset =
  typeof activityTrendExportPresets.$inferSelect;
export type InsertActivityTrendExportPreset =
  typeof activityTrendExportPresets.$inferInsert;

/** Privacy-safe fleet SMTP health aggregates captured by the managed scheduler. */
export const smtpHealthSnapshots = pgTable(
  "smtp_health_snapshot",
  {
    id: serial("id").primaryKey(),
    triggerSource: authHealthTriggerEnum("trigger_source").notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    totalAccounts: integer("total_accounts").notNull(),
    healthyAccounts: integer("healthy_accounts").notNull(),
    failedAccounts: integer("failed_accounts").notNull(),
    durationMs: integer("duration_ms").notNull(),
    checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
  },
  table => [
    index("smtp_health_checked_idx").on(table.checkedAt),
    index("smtp_health_task_uid_idx").on(table.scheduleCronTaskUid),
  ]
);

export type SmtpHealthSnapshot = typeof smtpHealthSnapshots.$inferSelect;
export type InsertSmtpHealthSnapshot = typeof smtpHealthSnapshots.$inferInsert;

/** Stores Gmail OAuth tokens for each business owner */
export const gmailTokens = pgTable("gmail_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms
  gmailEmail: varchar("gmailEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GmailToken = typeof gmailTokens.$inferSelect;
export type InsertGmailToken = typeof gmailTokens.$inferInsert;

/** Business profile for each Phame user */
export const businessProfiles = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  reviewLink: text("reviewLink").notNull(),
  tier: tierEnum("tier").default("free").notNull(),
  planExpiresAt: bigint("planExpiresAt", { mode: "number" }), // Unix ms — null for lifetime, set for monthly/annual
  monthlyCount: integer("monthlyCount").default(0).notNull(),
  monthlyResetDate: varchar("monthlyResetDate", { length: 7 }).notNull(), // "YYYY-MM"
  // Stripe customer ID — stored for creating checkout sessions and portal links
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // Email sender display name — shown as "From: <name>" in outgoing review request emails
  fromName: varchar("fromName", { length: 255 }),
  // Reply-To address — if set, replies go here instead of the connected email address
  replyTo: varchar("replyTo", { length: 320 }),
  // Onboarding wizard dismissed flag — 1 = user has dismissed or completed the wizard
  onboardingDismissed: integer("onboardingDismissed").default(0).notNull(),
  // Monthly review goal — number of responded requests the user aims to reach each month
  reviewGoal: integer("reviewGoal").default(0).notNull(),
  // Last time Stripe customers were synced into saved_contacts (Unix ms)
  stripeLastSyncedAt: bigint("stripeLastSyncedAt", { mode: "number" }),
  // Max emails to send per day during bulk sends (default 50, max 500)
  dailySendLimit: integer("dailySendLimit").default(50).notNull(),
  // Follow-up reminder settings — 1 = enabled (default), 0 = disabled
  followUpEnabled: integer("followUpEnabled").default(1).notNull(),
  // Stage-specific follow-up switches — enabled by default for backward compatibility
  followUpFirstEnabled: integer("followUpFirstEnabled").default(1).notNull(),
  followUpSecondEnabled: integer("followUpSecondEnabled").default(1).notNull(),
  // Days after initial send before step-1 follow-up (default 3, range 1-14)
  followUpDelayDays: integer("followUpDelayDays").default(3).notNull(),
  // Days after step-1 before the step-2 follow-up (default 7, range 1-14)
  followUpSecondDelayDays: integer("followUpSecondDelayDays")
    .default(7)
    .notNull(),
  // Re-engagement email — 1 = enabled (default), 0 = disabled
  reEngagementEnabled: integer("reEngagementEnabled").default(1).notNull(),
  // Referral code — unique 8-char code used to generate share links (getphame.app?ref=CODE)
  referralCode: varchar("referralCode", { length: 32 }),
  // Inactive user re-engagement email — Unix ms when sent (null = not yet sent)
  inactiveEmailSentAt: bigint("inactiveEmailSentAt", { mode: "number" }),
  // Physical location and derived IANA timezone are used for safe local-time delivery.
  physicalAddress: varchar("physicalAddress", { length: 500 }),
  normalizedPhysicalAddress: varchar("normalizedPhysicalAddress", { length: 500 }),
  businessTimeZone: varchar("businessTimeZone", { length: 100 }),
  // Business-local quiet period; default is 8:00 PM through 8:00 AM.
  quietHoursStartMinutes: integer("quietHoursStartMinutes")
    .default(20 * 60)
    .notNull(),
  quietHoursEndMinutes: integer("quietHoursEndMinutes")
    .default(8 * 60)
    .notNull(),
  // A shorter-than-default quiet period requires a documented support approval.
  quietHoursShorteningApproved: integer("quietHoursShorteningApproved")
    .default(0)
    .notNull(),
  quietHoursShorteningApprovedAt: bigint("quietHoursShorteningApprovedAt", {
    mode: "number",
  }),
  quietHoursShorteningApprovedByUserId: integer(
    "quietHoursShorteningApprovedByUserId"
  ),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  // Consent acknowledgment — Unix ms when the user acknowledged the consent checkbox requirement during onboarding
  consentAcknowledgedAt: bigint("consentAcknowledgedAt", { mode: "number" }),
  // Optional custom name for the consent checkbox label (defaults to businessName)
  consentLabelName: varchar("consentLabelName", { length: 255 }),
});
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

/** Each review request sent by a business owner to their customer */
export const customerRequests = pgTable("customer_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 30 }),
  method: methodEnum("method").notNull(),
  status: requestStatusEnum("status").default("sent").notNull(),
  respondedAt: bigint("respondedAt", { mode: "number" }), // Unix ms when customer left a review (null = not yet)
  // Null while delivery is held in the quiet-hours queue; populated only after SMTP accepts it.
  sentAt: timestamp("sentAt"),
  followUpAt: timestamp("followUpAt"),
  platformId: integer("platformId"), // FK to review_platforms.id — which platform was linked in this request
  sourceConnectionId: integer("sourceConnectionId"),
  sourceEventId: varchar("sourceEventId", { length: 191 }),
  preferredLocale: varchar("preferredLocale", { length: 16 }).default("en").notNull(),
  templateRevisionId: integer("templateRevisionId"),
  englishTemplateRevisionId: integer("englishTemplateRevisionId"),
  emailSubject: varchar("emailSubject", { length: 500 }), // Subject line of the sent email
  emailBody: text("emailBody"), // HTML body of the sent email (stored for client detail view)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("customer_requests_source_event_unique").on(
    table.userId,
    table.sourceConnectionId,
    table.sourceEventId,
  ),
]);
export type CustomerRequest = typeof customerRequests.$inferSelect;
export type InsertCustomerRequest = typeof customerRequests.$inferInsert;

/**
 * Durable delivery queue for review requests held until the business's local
 * quiet period ends. It stores only the pre-rendered outbound message needed
 * for later delivery, plus operational status—not customer response content.
 */
export const quietHoursQueuedSends = pgTable(
  "quiet_hours_queued_sends",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    customerRequestId: integer("customerRequestId").notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    html: text("html").notNull(),
    source: varchar("source", { length: 32 }).notNull(),
    sourceRecordId: integer("sourceRecordId"),
    templateId: integer("templateId"),
    scheduleFollowUps: integer("scheduleFollowUps").default(0).notNull(),
    scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(),
    status: quietHoursQueuedSendStatusEnum("status").default("pending").notNull(),
    attemptCount: integer("attemptCount").default(0).notNull(),
    lastError: varchar("lastError", { length: 1000 }),
    claimedAt: bigint("claimedAt", { mode: "number" }),
    sentAt: bigint("sentAt", { mode: "number" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("quiet_hours_queue_due_idx").on(table.status, table.scheduledAt),
    index("quiet_hours_queue_request_idx").on(table.customerRequestId),
    index("quiet_hours_queue_user_status_idx").on(table.userId, table.status),
  ]
);
export type QuietHoursQueuedSend = typeof quietHoursQueuedSends.$inferSelect;
export type InsertQuietHoursQueuedSend =
  typeof quietHoursQueuedSends.$inferInsert;

/**
 * Tracks active Stripe subscriptions.
 * We store only the Stripe IDs — all other data (amount, status, period)
 * is fetched from Stripe API on demand or updated via webhooks.
 */
export const stripeSubscriptions = pgTable("stripe_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // one active sub per user
  stripeSubscriptionId: varchar("stripeSubscriptionId", {
    length: 64,
  }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // active, canceled, past_due, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
export type InsertStripeSubscription = typeof stripeSubscriptions.$inferInsert;

/**
 * Administrator-issued paid-access grants for registered or future users.
 * Plaintext recipient email addresses are deliberately excluded: lookups use a
 * one-way HMAC fingerprint and administrator views receive only the mask.
 */
export const complimentaryAccessGrants = pgTable(
  "complimentary_access_grants",
  {
    id: serial("id").primaryKey(),
    emailFingerprint: varchar("email_fingerprint", { length: 64 }).notNull(),
    emailMasked: varchar("email_masked", { length: 320 }).notNull(),
    userId: integer("user_id"),
    durationValue: integer("duration_value").notNull(),
    durationUnit:
      complimentaryAccessDurationUnitEnum("duration_unit").notNull(),
    startsAt: bigint("starts_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdByUserId: integer("created_by_user_id").notNull(),
    note: varchar("note", { length: 500 }),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    revokedByUserId: integer("revoked_by_user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  table => [
    index("complimentary_access_email_expiry_idx").on(
      table.emailFingerprint,
      table.expiresAt
    ),
    index("complimentary_access_user_expiry_idx").on(
      table.userId,
      table.expiresAt
    ),
    index("complimentary_access_created_idx").on(table.createdAt),
  ]
);

export type ComplimentaryAccessGrant =
  typeof complimentaryAccessGrants.$inferSelect;
export type InsertComplimentaryAccessGrant =
  typeof complimentaryAccessGrants.$inferInsert;

/** WooCommerce store credentials per user */
export const wooCredentials = pgTable("woo_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  storeUrl: varchar("storeUrl", { length: 512 }).notNull(),
  consumerKey: text("consumerKey").notNull(),
  consumerSecret: text("consumerSecret").notNull(),
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }), // Unix ms
  lastSyncCount: integer("lastSyncCount").default(0), // number of orders staged in the last sync
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WooCredentials = typeof wooCredentials.$inferSelect;
export type InsertWooCredentials = typeof wooCredentials.$inferInsert;

/** Customers imported from WooCommerce orders */
export const wooCustomers = pgTable("woo_customers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // Phame user (business owner)
  wooOrderId: varchar("wooOrderId", { length: 64 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  productName: varchar("productName", { length: 512 }),
  orderDate: bigint("orderDate", { mode: "number" }).notNull(), // Unix ms
  reviewRequestSentAt: bigint("reviewRequestSentAt", { mode: "number" }), // null = not yet sent
  lastStatusChangedAt: bigint("lastStatusChangedAt", { mode: "number" }), // Unix ms of last manual status change
  // Opt-out / unsubscribe tracking
  optedOut: integer("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WooCustomer = typeof wooCustomers.$inferSelect;
export type InsertWooCustomer = typeof wooCustomers.$inferInsert;

/** WooCommerce sync history log — one row per sync run */
export const wooSyncLogs = pgTable("woo_sync_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  syncedAt: bigint("syncedAt", { mode: "number" }).notNull(), // Unix ms
  daysWindow: integer("daysWindow").notNull().default(30),
  added: integer("added").notNull().default(0),
  total: integer("total").notNull().default(0),
  storeUrl: varchar("storeUrl", { length: 512 }),
});
export type WooSyncLog = typeof wooSyncLogs.$inferSelect;
export type InsertWooSyncLog = typeof wooSyncLogs.$inferInsert;

/** Saved contacts for repeat review request sending */
export const savedContacts = pgTable("saved_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  lastSentAt: bigint("lastSentAt", { mode: "number" }), // Unix ms of last review request
  totalSent: integer("totalSent").default(0).notNull(),
  tags: text("tags"), // JSON array of tag strings e.g. ["plumbing","new"]
  // Source tracking — where this contact came from
  source: contactSourceEnum("source").default("manual").notNull(),
  externalId: varchar("externalId", { length: 128 }), // Stripe customer ID or WooCommerce order ID for dedup
  sourceApp: varchar("sourceApp", { length: 64 }),
  importedViaApiKeyId: integer("importedViaApiKeyId"),
  consentBasis: varchar("consentBasis", { length: 32 }),
  consentCapturedAt: bigint("consentCapturedAt", { mode: "number" }),
  consentSource: varchar("consentSource", { length: 255 }),
  consentPurpose: varchar("consentPurpose", { length: 32 }),
  consentChannel: varchar("consentChannel", { length: 16 }),
  consentTextHash: varchar("consentTextHash", { length: 64 }),
  consentVersion: varchar("consentVersion", { length: 64 }),
  privacyPolicyUrl: text("privacyPolicyUrl"),
  sourceFormId: varchar("sourceFormId", { length: 191 }),
  sourceSubmissionId: varchar("sourceSubmissionId", { length: 191 }),
  preferredLocale: varchar("preferredLocale", { length: 16 }).default("en").notNull(),
  // Opt-out / unsubscribe tracking
  optedOut: integer("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SavedContact = typeof savedContacts.$inferSelect;
export type InsertSavedContact = typeof savedContacts.$inferInsert;

/** Custom email templates per user */
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(), // Supports {{customer_name}}, {{business_name}}, {{review_link}}
  familyPublicId: varchar("familyPublicId", { length: 48 }),
  locale: varchar("locale", { length: 16 }).default("en").notNull(),
  activeRevisionId: integer("activeRevisionId"),
  provenance: varchar("provenance", { length: 24 }).default("manual").notNull(),
  approvedAt: bigint("approvedAt", { mode: "number" }),
  isDefault: integer("isDefault").default(0).notNull(), // 1 = default template for this user
  usageCount: integer("usageCount").default(0).notNull(), // incremented each time this template is used to send a request
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/** Immutable, tenant-scoped template revisions with a canonical English counterpart. */
export const emailTemplateRevisions = pgTable(
  "email_template_revisions",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("publicId", { length: 48 }).notNull().unique(),
    userId: integer("userId").notNull(),
    templateId: integer("templateId").notNull(),
    familyPublicId: varchar("familyPublicId", { length: 48 }).notNull(),
    version: integer("version").notNull(),
    locale: varchar("locale", { length: 16 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    body: text("body").notNull(),
    englishSubject: varchar("englishSubject", { length: 512 }).notNull(),
    englishBody: text("englishBody").notNull(),
    englishRevisionId: integer("englishRevisionId"),
    provenance: varchar("provenance", { length: 24 }).notNull(),
    modelId: varchar("modelId", { length: 100 }),
    inputHash: varchar("inputHash", { length: 64 }),
    status: varchar("status", { length: 24 }).default("draft").notNull(),
    approvedAt: bigint("approvedAt", { mode: "number" }),
    approvedByUserId: integer("approvedByUserId"),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("email_template_revisions_family_version_unique").on(
      table.userId,
      table.familyPublicId,
      table.locale,
      table.version,
    ),
    index("email_template_revisions_template_status_idx").on(
      table.templateId,
      table.status,
    ),
  ],
);
export type EmailTemplateRevision = typeof emailTemplateRevisions.$inferSelect;
export type InsertEmailTemplateRevision = typeof emailTemplateRevisions.$inferInsert;

/** Follow-up reminders — scheduled follow-ups with immutable timing snapshots for reporting */
export const followUpReminders = pgTable("follow_up_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  customerRequestId: integer("customerRequestId").notNull(), // FK to customer_requests
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // Unix ms when to send
  sentAt: bigint("sentAt", { mode: "number" }), // null = not yet sent
  status: reminderStatusEnum("status").default("pending").notNull(),
  /** 1 = first follow-up, 2 = second follow-up */
  sequenceStep: integer("sequenceStep").default(1).notNull(),
  // Immutable configuration snapshot. Null identifies legacy rows excluded from timing reports.
  firstDelayDaysSnapshot: integer("firstDelayDaysSnapshot"),
  secondDelayDaysSnapshot: integer("secondDelayDaysSnapshot"),
  firstStageEnabledSnapshot: integer("firstStageEnabledSnapshot"),
  secondStageEnabledSnapshot: integer("secondStageEnabledSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpReminder = typeof followUpReminders.$inferSelect;
export type InsertFollowUpReminder = typeof followUpReminders.$inferInsert;

/**
 * Beta / promo access codes — created by the owner, redeemed by users for free Pro access.
 * Supports single-use, multi-use, and unlimited-use codes with optional expiry.
 */
export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(), // the code users enter
  note: varchar("note", { length: 255 }), // internal label e.g. "Beta cohort Jan 2026"
  maxUses: integer("maxUses"), // null = unlimited
  usedCount: integer("usedCount").default(0).notNull(),
  active: integer("active").default(1).notNull(), // 1 = active, 0 = revoked
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms, null = never expires
  grantDurationValue: integer("grant_duration_value"), // null only for lifetime or legacy codes
  grantDurationUnit: varchar("grant_duration_unit", { length: 16 }), // day | month | lifetime
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = typeof accessCodes.$inferInsert;

/** Records each time a user redeems an access code */
export const accessCodeRedemptions = pgTable("access_code_redemptions", {
  id: serial("id").primaryKey(),
  codeId: integer("codeId").notNull(),
  userId: integer("userId").notNull().unique(), // one redemption per user
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type AccessCodeRedemption = typeof accessCodeRedemptions.$inferSelect;
export type InsertAccessCodeRedemption =
  typeof accessCodeRedemptions.$inferInsert;

/**
 * Review platform URLs per user — Google, Yelp, TripAdvisor, Bing, Facebook, Other.
 * Each user can have multiple platforms; one is marked as default.
 * The URL is pasted by the business owner (public review page link).
 */
export const reviewPlatforms = pgTable("review_platforms", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  platform: platformEnum("platform").notNull(),
  label: varchar("label", { length: 255 }), // custom label for "Other" or override
  url: text("url").notNull(), // public review page URL
  isDefault: integer("isDefault").default(0).notNull(), // 1 = default platform for this user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReviewPlatform = typeof reviewPlatforms.$inferSelect;
export type InsertReviewPlatform = typeof reviewPlatforms.$inferInsert;

/** SMTP credentials for each user — used to send review request emails from their own email account */
export const smtpCredentials = pgTable("smtp_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(587),
  secure: integer("secure").notNull().default(0), // 0 = STARTTLS (port 587), 1 = SSL (port 465)
  user: varchar("user", { length: 320 }).notNull(), // email address / SMTP username
  encryptedPass: text("encryptedPass").notNull(), // AES-256 encrypted password
  fromName: varchar("fromName", { length: 255 }), // display name in From header
  replyTo: varchar("replyTo", { length: 320 }), // optional reply-to override
  verified: integer("verified").notNull().default(0), // 1 = test send succeeded
  lastHealthCheck: bigint("lastHealthCheck", { mode: "number" }), // Unix ms of last automated health check
  lastHealthStatus: healthStatusEnum("lastHealthStatus"), // null = never checked
  lastHealthError: varchar("lastHealthError", { length: 500 }), // error message from last failed check (null = ok)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SmtpCredential = typeof smtpCredentials.$inferSelect;
export type InsertSmtpCredential = typeof smtpCredentials.$inferInsert;

/**
 * Tenant-owned, privacy-minimized diagnostic test-email outcomes. The full
 * recipient, message content, SMTP endpoint, credentials, and raw transport
 * errors are intentionally excluded.
 */
export const smtpTestEmailAttempts = pgTable(
  "smtp_test_email_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    recipientMasked: varchar("recipient_masked", { length: 320 }).notNull(),
    outcome: healthStatusEnum("outcome").notNull(),
    errorSummary: varchar("error_summary", { length: 500 }),
    attemptedAt: bigint("attempted_at", { mode: "number" }).notNull(),
  },
  table => [
    index("smtp_test_email_attempts_user_time_idx").on(table.userId, table.attemptedAt),
    index("smtp_test_email_attempts_time_idx").on(table.attemptedAt),
  ]
);
export type SmtpTestEmailAttempt = typeof smtpTestEmailAttempts.$inferSelect;
export type InsertSmtpTestEmailAttempt = typeof smtpTestEmailAttempts.$inferInsert;

/**
 * Privacy-minimized, tenant-owned evidence of profile and preference downloads.
 * The generated payload, browser/device data, credentials, and customer records
 * are intentionally never persisted.
 */
export const profilePreferenceExportHistory = pgTable(
  "profile_preference_export_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    format: varchar("format", { length: 8 }).notNull(),
    exportedAt: bigint("exported_at", { mode: "number" }).notNull(),
  },
  table => [
    index("profile_preference_export_history_user_time_idx").on(table.userId, table.exportedAt),
  ]
);
export type ProfilePreferenceExportHistory = typeof profilePreferenceExportHistory.$inferSelect;
export type InsertProfilePreferenceExportHistory = typeof profilePreferenceExportHistory.$inferInsert;

/**
 * The user-selected, tenant-owned delivery channel for review outreach. Platform
 * mail infrastructure is deliberately not represented in this table.
 */
export const outboundMailPreferences = pgTable("outbound_mail_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  selectedChannel: outboundMailChannelEnum("selected_channel").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type OutboundMailPreference = typeof outboundMailPreferences.$inferSelect;
export type InsertOutboundMailPreference = typeof outboundMailPreferences.$inferInsert;

/**
 * Durable snapshots of administrator-initiated SMTP removals. Identity fields
 * are intentionally denormalized so the audit trail survives account deletion.
 */
export const smtpAdminAuditLogs = pgTable(
  "smtp_admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").notNull(),
    actorName: varchar("actor_name", { length: 255 }),
    actorEmail: varchar("actor_email", { length: 320 }),
    targetUserId: integer("target_user_id").notNull(),
    targetName: varchar("target_name", { length: 255 }),
    targetEmail: varchar("target_email", { length: 320 }),
    smtpUser: varchar("smtp_user", { length: 320 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 32 }).notNull(),
    occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  },
  table => [
    index("smtp_admin_audit_occurred_idx").on(table.occurredAt),
    index("smtp_admin_audit_actor_idx").on(table.actorUserId),
    index("smtp_admin_audit_target_idx").on(table.targetUserId),
  ]
);

export type SmtpAdminAuditLog = typeof smtpAdminAuditLogs.$inferSelect;
export type InsertSmtpAdminAuditLog = typeof smtpAdminAuditLogs.$inferInsert;

/**
 * Minimal, durable evidence for administrator-initiated account lifecycle
 * actions. It never stores credentials, message bodies, or customer data.
 */
export const adminUserLifecycleAuditLogs = pgTable(
  "admin_user_lifecycle_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").notNull(),
    targetUserId: integer("target_user_id").notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  },
  table => [
    index("admin_user_lifecycle_target_time_idx").on(table.targetUserId, table.occurredAt),
    index("admin_user_lifecycle_actor_time_idx").on(table.actorUserId, table.occurredAt),
  ]
);

export type AdminUserLifecycleAuditLog = typeof adminUserLifecycleAuditLogs.$inferSelect;
export type InsertAdminUserLifecycleAuditLog = typeof adminUserLifecycleAuditLogs.$inferInsert;

/**
 * Retention-bounded records for messages sent through the administrator-only
 * Get Phame general-communication workflow. This is an outbox, not a mirror of
 * private Google Workspace inboxes or user-owned SMTP mailboxes.
 */
export const adminPlatformEmailMessages = pgTable(
  "admin_platform_email_messages",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").notNull(),
    recipientUserId: integer("recipient_user_id").notNull(),
    recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
    fromEmail: varchar("from_email", { length: 320 }).notNull(),
    template: varchar("template", { length: 64 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    bodyText: text("body_text").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    failureCode: varchar("failure_code", { length: 64 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    sentAt: bigint("sent_at", { mode: "number" }),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  table => [
    index("admin_platform_email_recipient_time_idx").on(table.recipientUserId, table.createdAt),
    index("admin_platform_email_expiry_idx").on(table.expiresAt),
  ]
);

export type AdminPlatformEmailMessage = typeof adminPlatformEmailMessages.$inferSelect;
export type InsertAdminPlatformEmailMessage = typeof adminPlatformEmailMessages.$inferInsert;

/**
 * Tracks email open and click events for review request emails.
 * Each row represents one open (pixel load) or one click (redirect through tracking link).
 * requestId links back to customer_requests; templateId is nullable (null = no template used).
 */
export const emailEvents = pgTable("email_events", {
  id: serial("id").primaryKey(),
  requestId: integer("requestId").notNull(), // FK to customer_requests.id
  userId: integer("userId").notNull(), // denormalised for fast per-user queries
  templateId: integer("templateId"), // FK to email_templates.id (nullable)
  type: emailEventTypeEnum("type").notNull(),
  url: varchar("url", { length: 2048 }), // destination URL (click events only)
  userAgent: varchar("userAgent", { length: 512 }),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

/**
 * Public product-support submissions. Attachment bytes remain in object storage;
 * this table stores only the metadata necessary for durable support operations.
 */
export const supportSubmissions = pgTable(
  "support_submissions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }),
    email: varchar("email", { length: 320 }).notNull(),
    topic: supportTopicEnum("topic").notNull(),
    subject: varchar("subject", { length: 120 }).notNull(),
    message: text("message").notNull(),
    status: supportSubmissionStatusEnum("status").notNull().default("open"),
    // New and existing tickets start at Normal; only internal administrators can alter priority.
    priority: supportPriorityEnum("priority").notNull().default("normal"),
    // Nullable explicitly represents an unassigned ticket; eligibility is enforced by admin mutations.
    assigneeUserId: integer("assignee_user_id"),
    // A manual operator-set business deadline remains distinct from the server-derived SLA target.
    dueAt: timestamp("due_at"),
    slaTargetAt: timestamp("sla_target_at"),
    // The first recorded administrator action; used for honest first-response reporting.
    firstRespondedAt: timestamp("first_responded_at"),
    attachmentKey: varchar("attachment_key", { length: 512 }),
    attachmentFilename: varchar("attachment_filename", { length: 255 }),
    attachmentMimeType: varchar("attachment_mime_type", { length: 64 }),
    attachmentSize: integer("attachment_size"),
    notificationSentAt: timestamp("notification_sent_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  table => [
    index("support_submissions_status_created_idx").on(
      table.status,
      table.createdAt
    ),
    index("support_submissions_topic_created_idx").on(
      table.topic,
      table.createdAt
    ),
    index("support_submissions_priority_status_created_idx").on(
      table.priority,
      table.status,
      table.createdAt
    ),
    index("support_submissions_assignee_status_created_idx").on(
      table.assigneeUserId,
      table.status,
      table.createdAt
    ),
    index("support_submissions_sla_status_idx").on(
      table.slaTargetAt,
      table.status
    ),
    index("support_submissions_due_status_idx").on(table.dueAt, table.status),
    index("support_submissions_first_response_idx").on(
      table.firstRespondedAt,
      table.createdAt
    ),
  ]
);

export type SupportSubmission = typeof supportSubmissions.$inferSelect;
export type InsertSupportSubmission = typeof supportSubmissions.$inferInsert;

/**
 * Private operator collaboration. Notes are never returned to public support routes.
 */
export const supportInternalNotes = pgTable(
  "support_internal_notes",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull(),
    authorUserId: integer("author_user_id").notNull(),
    // Stores sanitized, constrained rich HTML. Existing plain notes remain safe text.
    body: text("body").notNull(),
    // Plain-text derivative for accessible fallbacks and future internal search/export.
    bodyPlainText: text("body_plain_text"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    index("support_internal_notes_ticket_created_idx").on(
      table.ticketId,
      table.createdAt
    ),
    index("support_internal_notes_author_created_idx").on(
      table.authorUserId,
      table.createdAt
    ),
  ]
);

export type SupportInternalNote = typeof supportInternalNotes.$inferSelect;
export type InsertSupportInternalNote =
  typeof supportInternalNotes.$inferInsert;

/**
 * Authorized internal recipients selected from the administrator directory.
 * Mention relationships are intentionally separate from the note display text.
 */
export const supportInternalNoteMentions = pgTable(
  "support_internal_note_mentions",
  {
    id: serial("id").primaryKey(),
    noteId: integer("note_id").notNull(),
    mentionedUserId: integer("mentioned_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("support_note_mentions_note_user_unique").on(
      table.noteId,
      table.mentionedUserId
    ),
    index("support_note_mentions_recipient_created_idx").on(
      table.mentionedUserId,
      table.createdAt
    ),
  ]
);

export type SupportInternalNoteMention =
  typeof supportInternalNoteMentions.$inferSelect;
export type InsertSupportInternalNoteMention =
  typeof supportInternalNoteMentions.$inferInsert;

/**
 * Recipient-scoped in-app events for ticket ownership and escalation only.
 * Customer content stays in the ticket, never in the notification payload.
 */
export const supportTicketAlerts = pgTable(
  "support_ticket_alerts",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull(),
    recipientUserId: integer("recipient_user_id").notNull(),
    actorUserId: integer("actor_user_id").notNull(),
    type: supportTicketAlertTypeEnum("type").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    index("support_ticket_alerts_recipient_read_created_idx").on(
      table.recipientUserId,
      table.readAt,
      table.createdAt
    ),
    index("support_ticket_alerts_ticket_type_created_idx").on(
      table.ticketId,
      table.type,
      table.createdAt
    ),
  ]
);

export type SupportTicketAlert = typeof supportTicketAlerts.$inferSelect;
export type InsertSupportTicketAlert = typeof supportTicketAlerts.$inferInsert;

/**
 * Administrator-owned saved support queue controls. Only validated filter and
 * sort fields are persisted; customer or ticket content is never stored here.
 */
export const supportSavedQueueViews = pgTable(
  "support_saved_queue_views",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("owner_user_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 80 }).notNull(),
    // Private views stay owner-only; team views are discoverable by other support administrators.
    visibility: supportQueueViewVisibilityEnum("visibility")
      .notNull()
      .default("private"),
    status: supportSubmissionStatusEnum("status"),
    topic: supportTopicEnum("topic"),
    priority: supportPriorityEnum("priority"),
    assigneeScope: supportQueueAssigneeScopeEnum("assignee_scope")
      .notNull()
      .default("any"),
    assigneeUserId: integer("assignee_user_id"),
    slaWindow: supportQueueSlaWindowEnum("sla_window"),
    sort: supportQueueSortEnum("sort").notNull().default("newest"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("support_saved_queue_views_owner_name_unique").on(
      table.ownerUserId,
      table.normalizedName
    ),
    index("support_saved_queue_views_owner_updated_idx").on(
      table.ownerUserId,
      table.updatedAt
    ),
    index("support_saved_queue_views_visibility_updated_idx").on(
      table.visibility,
      table.updatedAt
    ),
  ]
);

export type SupportSavedQueueView = typeof supportSavedQueueViews.$inferSelect;
export type InsertSupportSavedQueueView =
  typeof supportSavedQueueViews.$inferInsert;

/**
 * Singleton configuration for private, recipient-scoped urgent SLA escalation.
 * Ticket/customer data is intentionally not copied into the policy tables.
 */
export const supportEscalationPolicies = pgTable(
  "support_escalation_policies",
  {
    id: serial("id").primaryKey(),
    policyKey: varchar("policy_key", { length: 64 }).notNull().unique(),
    breachThresholdMinutes: integer("breach_threshold_minutes")
      .notNull()
      .default(0),
    includeAssignee: boolean("include_assignee").notNull().default(true),
    includeAllAdminsWhenUnassigned: boolean(
      "include_all_admins_when_unassigned"
    )
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export type SupportEscalationPolicy =
  typeof supportEscalationPolicies.$inferSelect;
export type InsertSupportEscalationPolicy =
  typeof supportEscalationPolicies.$inferInsert;

/** Explicit administrators who receive an urgent SLA-breach alert under the singleton policy. */
export const supportEscalationPolicyRecipients = pgTable(
  "support_escalation_policy_recipients",
  {
    id: serial("id").primaryKey(),
    policyId: integer("policy_id").notNull(),
    recipientUserId: integer("recipient_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    uniqueIndex("support_escalation_policy_recipients_policy_user_unique").on(
      table.policyId,
      table.recipientUserId
    ),
    index("support_escalation_policy_recipients_recipient_idx").on(
      table.recipientUserId
    ),
  ]
);

export type SupportEscalationPolicyRecipient =
  typeof supportEscalationPolicyRecipients.$inferSelect;
export type InsertSupportEscalationPolicyRecipient =
  typeof supportEscalationPolicyRecipients.$inferInsert;

/**
 * Churn survey responses — one row per cancellation.
 * Stored before the user is redirected to the Stripe cancel flow.
 */
export const churnSurveys = pgTable("churn_surveys", {
  id: serial("id").primaryKey(),
  userId: integer("userId"), // null = anonymous / not logged in
  email: varchar("email", { length: 320 }), // captured from query param if available
  reason: churnReasonEnum("reason").notNull(),
  comment: text("comment"), // optional free-text
  offerValidUntil: bigint("offerValidUntil", { mode: "number" }), // UTC ms — STAY40 offer expires 7 days after survey
  reEngagementSentAt: bigint("reEngagementSentAt", { mode: "number" }), // UTC ms — when 2nd re-engagement email was sent
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }), // hex token for one-click unsubscribe from re-engagement emails
  reEngagementOptedOut: integer("reEngagementOptedOut").notNull().default(0), // 1 = user clicked unsubscribe
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChurnSurvey = typeof churnSurveys.$inferSelect;
export type InsertChurnSurvey = typeof churnSurveys.$inferInsert;

/**
 * Page-level analytics events — lightweight UTM / referral tracking.
 * Used to measure powered-by footer upsell click-throughs.
 */
export const pageEvents = pgTable("page_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId"), // null = not logged in
  page: varchar("page", { length: 255 }).notNull(), // e.g. "/upgrade"
  utmSource: varchar("utmSource", { length: 128 }),
  utmMedium: varchar("utmMedium", { length: 128 }),
  utmCampaign: varchar("utmCampaign", { length: 128 }),
  referrer: varchar("referrer", { length: 2048 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageEvent = typeof pageEvents.$inferSelect;
export type InsertPageEvent = typeof pageEvents.$inferInsert;

/**
 * Daily, aggregate-only PWA update-notice interactions. This table deliberately
 * has no user, visitor, device, route, referrer, user-agent, or event-time
 * columns: one row represents the total for one allowlisted interaction/day.
 */
export const pwaUpdateEventTotals = pgTable(
  "pwa_update_event_totals",
  {
    id: serial("id").primaryKey(),
    eventDay: varchar("event_day", { length: 10 }).notNull(),
    event: varchar("event", { length: 48 }).notNull(),
    total: integer("total").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  table => [
    uniqueIndex("pwa_update_event_totals_day_event_unique").on(
      table.eventDay,
      table.event
    ),
    index("pwa_update_event_totals_day_idx").on(table.eventDay),
  ]
);
export type PwaUpdateEventTotal = typeof pwaUpdateEventTotals.$inferSelect;
export type InsertPwaUpdateEventTotal =
  typeof pwaUpdateEventTotals.$inferInsert;

/**
 * Privacy-bounded zero-result Manual searches.
 * Raw rows are never exposed to administrators; reporting returns aggregates only.
 */
export const manualSearchEvents = pgTable(
  "manual_search_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    query: varchar("query", { length: 100 }).notNull(),
    queryFingerprint: varchar("query_fingerprint", { length: 64 }).notNull(),
    manualRole: roleEnum("manual_role").notNull(),
    locale: varchar("locale", { length: 10 }).notNull(),
    manualVersion: varchar("manual_version", { length: 20 }).notNull(),
    dedupeKey: varchar("dedupe_key", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("manual_search_events_dedupe_unique").on(table.dedupeKey),
    index("manual_search_events_created_idx").on(table.createdAt),
    index("manual_search_events_role_locale_created_idx").on(
      table.manualRole,
      table.locale,
      table.createdAt
    ),
    index("manual_search_events_query_created_idx").on(
      table.queryFingerprint,
      table.createdAt
    ),
  ]
);
export type ManualSearchEvent = typeof manualSearchEvents.$inferSelect;
export type InsertManualSearchEvent = typeof manualSearchEvents.$inferInsert;

/**
 * API keys — per-user keys for the public REST API (e.g. contacts import from website forms).
 * The raw key is only shown once at creation time; only the SHA-256 hash is stored.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    keyHash: varchar("keyHash", { length: 64 }).notNull().unique(), // SHA-256 hex of the raw key
    label: varchar("label", { length: 100 }).notNull().default("My API Key"),
    keyHint: varchar("keyHint", { length: 24 }).notNull().default("rl_••••"),
    scopes: text("scopes").notNull(),
    expiresAt: bigint("expiresAt", { mode: "number" }),
    rotatedFromId: integer("rotatedFromId"),
    usageCount: integer("usageCount").notNull().default(0),
    lastUsedAt: bigint("lastUsedAt", { mode: "number" }), // Unix ms
    suspendedAt: bigint("suspendedAt", { mode: "number" }), // Unix ms — temporary abuse suspension
    suspensionExpiresAt: bigint("suspensionExpiresAt", { mode: "number" }),
    suspensionReason: varchar("suspensionReason", { length: 64 }),
    revokedAt: bigint("revokedAt", { mode: "number" }), // Unix ms — null = active
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("api_keys_user_created_idx").on(table.userId, table.createdAt),
    index("api_keys_expiry_idx").on(table.expiresAt),
    index("api_keys_suspension_idx").on(table.suspensionExpiresAt),
  ]
);
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/** User-owned no-code Sources connections bound to one active contacts:write API key. */
export const sourceConnections = pgTable(
  "source_connections",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("publicId", { length: 48 }).notNull().unique(),
    userId: integer("userId").notNull(),
    apiKeyId: integer("apiKeyId").notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    expectedIntervalMinutes: integer("expectedIntervalMinutes")
      .notNull()
      .default(1_440),
    monitoringEnabled: boolean("monitoringEnabled").notNull().default(true),
    status: varchar("status", { length: 20 }).notNull().default("setup"),
    automationEnabled: boolean("automationEnabled").notNull().default(false),
    automationMode: varchar("automationMode", { length: 24 })
      .notNull()
      .default("import_only"),
    dryRun: boolean("dryRun").notNull().default(true),
    sendDelayMinutes: integer("sendDelayMinutes").notNull().default(0),
    templateId: integer("templateId"),
    platformId: integer("platformId"),
    preferredLocale: varchar("preferredLocale", { length: 16 }).default("en").notNull(),
    dryRunCompletedAt: bigint("dryRunCompletedAt", { mode: "number" }),
    pausedAt: bigint("pausedAt", { mode: "number" }),
    pauseReason: varchar("pauseReason", { length: 255 }),
    lastAutomationAt: bigint("lastAutomationAt", { mode: "number" }),
    lastEvaluatedAt: bigint("lastEvaluatedAt", { mode: "number" }),
    nextEvaluationAt: bigint("nextEvaluationAt", { mode: "number" }),
    lastEventAt: bigint("lastEventAt", { mode: "number" }),
    lastSuccessAt: bigint("lastSuccessAt", { mode: "number" }),
    lastFailureAt: bigint("lastFailureAt", { mode: "number" }),
    lastErrorCode: varchar("lastErrorCode", { length: 64 }),
    consecutiveFailures: integer("consecutiveFailures").notNull().default(0),
    failureAlertOpen: boolean("failureAlertOpen").notNull().default(false),
    lastFailureAlertAt: bigint("lastFailureAlertAt", { mode: "number" }),
    lastRecoveryAlertAt: bigint("lastRecoveryAlertAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    archivedAt: bigint("archivedAt", { mode: "number" }),
  },
  table => [
    index("source_connections_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    index("source_connections_key_active_idx").on(
      table.apiKeyId,
      table.archivedAt
    ),
    index("source_connections_due_idx").on(
      table.monitoringEnabled,
      table.nextEvaluationAt
    ),
  ]
);
export type SourceConnection = typeof sourceConnections.$inferSelect;
export type InsertSourceConnection = typeof sourceConnections.$inferInsert;

/** Immutable, privacy-bounded proof of permission captured by a source integration. */
export const contactConsentEvidence = pgTable(
  "contact_consent_evidence",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("publicId", { length: 48 }).notNull().unique(),
    userId: integer("userId").notNull(),
    contactId: integer("contactId"),
    sourceConnectionId: integer("sourceConnectionId"),
    sourceSubmissionId: varchar("sourceSubmissionId", { length: 191 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    channel: varchar("channel", { length: 16 }).notNull(),
    basis: varchar("basis", { length: 32 }).notNull(),
    confirmed: boolean("confirmed").notNull(),
    capturedAt: bigint("capturedAt", { mode: "number" }).notNull(),
    source: varchar("source", { length: 255 }).notNull(),
    consentText: text("consentText").notNull(),
    consentTextHash: varchar("consentTextHash", { length: 64 }).notNull(),
    consentVersion: varchar("consentVersion", { length: 64 }).notNull(),
    privacyPolicyUrl: text("privacyPolicyUrl").notNull(),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("contact_consent_evidence_source_unique").on(
      table.userId,
      table.sourceSubmissionId,
      table.purpose,
    ),
    index("contact_consent_evidence_contact_idx").on(table.userId, table.contactId),
  ],
);
export type ContactConsentEvidence = typeof contactConsentEvidence.$inferSelect;
export type InsertContactConsentEvidence = typeof contactConsentEvidence.$inferInsert;

/** Idempotency and audit ledger for source events that may create review outreach. */
export const sourceAutomationEvents = pgTable(
  "source_automation_events",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("publicId", { length: 48 }).notNull().unique(),
    userId: integer("userId").notNull(),
    sourceConnectionId: integer("sourceConnectionId").notNull(),
    apiKeyId: integer("apiKeyId").notNull(),
    sourceEventId: varchar("sourceEventId", { length: 191 }).notNull(),
    requestHash: varchar("requestHash", { length: 64 }).notNull(),
    eventType: varchar("eventType", { length: 32 }).notNull().default("review_request"),
    contactId: integer("contactId"),
    templateId: integer("templateId"),
    platformId: integer("platformId"),
    preferredLocale: varchar("preferredLocale", { length: 16 }).notNull().default("en"),
    customerRequestId: integer("customerRequestId"),
    status: varchar("status", { length: 24 }).notNull(),
    errorCode: varchar("errorCode", { length: 64 }),
    scheduledAt: bigint("scheduledAt", { mode: "number" }),
    attemptCount: integer("attemptCount").notNull().default(0),
    lastAttemptAt: bigint("lastAttemptAt", { mode: "number" }),
    claimExpiresAt: bigint("claimExpiresAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    completedAt: bigint("completedAt", { mode: "number" }),
  },
  table => [
    uniqueIndex("source_automation_events_source_event_unique").on(
      table.userId,
      table.sourceConnectionId,
      table.sourceEventId,
    ),
    index("source_automation_events_status_idx").on(table.userId, table.status),
    index("source_automation_events_due_idx").on(table.status, table.scheduledAt),
  ],
);
export type SourceAutomationEvent = typeof sourceAutomationEvents.$inferSelect;
export type InsertSourceAutomationEvent = typeof sourceAutomationEvents.$inferInsert;

/** Durable registration for the source-automation recurring job. */
export const sourceAutomationSchedulers = pgTable("source_automation_schedulers", {
  id: serial("id").primaryKey(),
  scheduleKey: varchar("scheduleKey", { length: 32 })
    .notNull()
    .default("global")
    .unique(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  cronExpression: varchar("cronExpression", { length: 64 })
    .notNull()
    .default("0 */5 * * * *"),
  lastRunAt: bigint("lastRunAt", { mode: "number" }),
  lastRunStatus: varchar("lastRunStatus", { length: 20 }),
  lastRunErrorCode: varchar("lastRunErrorCode", { length: 64 }),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type SourceAutomationScheduler = typeof sourceAutomationSchedulers.$inferSelect;
export type InsertSourceAutomationScheduler = typeof sourceAutomationSchedulers.$inferInsert;

/**
 * Short-lived device-style pairing requests used by the WordPress connector.
 * The WordPress site owns the high-entropy pairing secret; Get Phame stores only
 * its hash. The raw API key is encrypted only between account approval and the
 * single credential claim, then cleared permanently.
 */
export const wordpressPairings = pgTable(
  "wordpress_pairings",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("publicId", { length: 64 }).notNull().unique(),
    secretHash: varchar("secretHash", { length: 64 }).notNull(),
    siteUrl: varchar("siteUrl", { length: 2048 }).notNull(),
    siteHost: varchar("siteHost", { length: 255 }).notNull(),
    siteLabel: varchar("siteLabel", { length: 100 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    userId: integer("userId"),
    apiKeyId: integer("apiKeyId"),
    sourceConnectionId: integer("sourceConnectionId"),
    encryptedApiKey: text("encryptedApiKey"),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    approvedAt: bigint("approvedAt", { mode: "number" }),
    claimedAt: bigint("claimedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    index("wordpress_pairings_status_expiry_idx").on(
      table.status,
      table.expiresAt
    ),
    index("wordpress_pairings_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    uniqueIndex("wordpress_pairings_source_unique").on(
      table.sourceConnectionId
    ),
  ]
);
export type WordPressPairing = typeof wordpressPairings.$inferSelect;
export type InsertWordPressPairing = typeof wordpressPairings.$inferInsert;

/** Bounded 90-day source health timeline used for user diagnostics and alert decisions. */
export const sourceHealthHistory = pgTable(
  "source_health_history",
  {
    id: serial("id").primaryKey(),
    sourceConnectionId: integer("sourceConnectionId").notNull(),
    userId: integer("userId").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    reasonCode: varchar("reasonCode", { length: 48 }).notNull(),
    attemptsInWindow: integer("attemptsInWindow").notNull().default(0),
    failuresInWindow: integer("failuresInWindow").notNull().default(0),
    lastEventAt: bigint("lastEventAt", { mode: "number" }),
    lastSuccessAt: bigint("lastSuccessAt", { mode: "number" }),
    checkedAt: bigint("checkedAt", { mode: "number" }).notNull(),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  },
  table => [
    index("source_health_connection_checked_idx").on(
      table.sourceConnectionId,
      table.checkedAt
    ),
    index("source_health_user_checked_idx").on(table.userId, table.checkedAt),
    index("source_health_expiry_idx").on(table.expiresAt),
  ]
);
export type SourceHealthHistory = typeof sourceHealthHistory.$inferSelect;
export type InsertSourceHealthHistory = typeof sourceHealthHistory.$inferInsert;

/** Durable singleton state for reconciling and observing the global source-health heartbeat job. */
export const sourceHealthSchedulers = pgTable("source_health_schedulers", {
  id: serial("id").primaryKey(),
  scheduleKey: varchar("scheduleKey", { length: 32 })
    .notNull()
    .default("global")
    .unique(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  cronExpression: varchar("cronExpression", { length: 64 })
    .notNull()
    .default("0 */15 * * * *"),
  lastRunAt: bigint("lastRunAt", { mode: "number" }),
  lastRunStatus: varchar("lastRunStatus", { length: 20 }),
  lastRunErrorCode: varchar("lastRunErrorCode", { length: 64 }),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type SourceHealthScheduler = typeof sourceHealthSchedulers.$inferSelect;
export type InsertSourceHealthScheduler =
  typeof sourceHealthSchedulers.$inferInsert;

/**
 * Global disposable-email domain intelligence sourced from approved public feeds.
 * The catalog stores only domain-level evidence; no email-address content belongs here.
 */
export const disposableEmailDomains = pgTable(
  "disposable_email_domains",
  {
    id: serial("id").primaryKey(),
    domain: varchar("domain", { length: 253 }).notNull().unique(),
    sourceEvidenceJson: text("sourceEvidenceJson").notNull(),
    confidenceScore: integer("confidenceScore").notNull().default(0),
    active: boolean("active").notNull().default(true),
    firstSeenAt: bigint("firstSeenAt", { mode: "number" }).notNull(),
    lastSeenAt: bigint("lastSeenAt", { mode: "number" }).notNull(),
    lastDnsCheckedAt: bigint("lastDnsCheckedAt", { mode: "number" }),
    mxExists: boolean("mxExists"),
    dnsErrorCode: varchar("dnsErrorCode", { length: 64 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    index("disposable_domain_active_confidence_idx").on(
      table.active,
      table.confidenceScore
    ),
    index("disposable_domain_last_seen_idx").on(table.lastSeenAt),
    index("disposable_domain_dns_checked_idx").on(table.lastDnsCheckedAt),
  ]
);
export type DisposableEmailDomain = typeof disposableEmailDomains.$inferSelect;
export type InsertDisposableEmailDomain =
  typeof disposableEmailDomains.$inferInsert;

/** Durable singleton state for the project-owned disposable-domain Heartbeat. */
export const disposableDomainSchedulers = pgTable(
  "disposable_domain_schedulers",
  {
    id: serial("id").primaryKey(),
    scheduleKey: varchar("scheduleKey", { length: 32 })
      .notNull()
      .default("global")
      .unique(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
    cronExpression: varchar("cronExpression", { length: 64 })
      .notNull()
      .default("0 0 9,10 * * *"),
    lastRunDateKey: varchar("lastRunDateKey", { length: 16 }),
    lastRunAt: bigint("lastRunAt", { mode: "number" }),
    lastRunStatus: varchar("lastRunStatus", { length: 20 }),
    lastRunErrorCode: varchar("lastRunErrorCode", { length: 64 }),
    lastRunSummaryJson: text("lastRunSummaryJson"),
    reviewCursorUserId: integer("reviewCursorUserId").notNull().default(0),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [index("disposable_domain_scheduler_task_idx").on(table.scheduleCronTaskUid)]
);
export type DisposableDomainScheduler = typeof disposableDomainSchedulers.$inferSelect;
export type InsertDisposableDomainScheduler =
  typeof disposableDomainSchedulers.$inferInsert;

/**
 * Administrator-only review queue for existing accounts whose current domain
 * later appears in the high-confidence catalog. No automated restriction or
 * deletion is attached to this record.
 */
export const disposableDomainAccountReviews = pgTable(
  "disposable_domain_account_reviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().unique(),
    domain: varchar("domain", { length: 253 }).notNull(),
    confidenceScore: integer("confidenceScore").notNull(),
    status: disposableDomainReviewStatusEnum("status").notNull().default("pending"),
    detectedAt: bigint("detectedAt", { mode: "number" }).notNull(),
    lastDetectedAt: bigint("lastDetectedAt", { mode: "number" }).notNull(),
    resolvedAt: bigint("resolvedAt", { mode: "number" }),
    resolvedByUserId: integer("resolvedByUserId"),
    adminNote: varchar("adminNote", { length: 500 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    index("disposable_domain_review_status_detected_idx").on(
      table.status,
      table.lastDetectedAt
    ),
    index("disposable_domain_review_domain_idx").on(table.domain),
  ]
);
export type DisposableDomainAccountReview =
  typeof disposableDomainAccountReviews.$inferSelect;
export type InsertDisposableDomainAccountReview =
  typeof disposableDomainAccountReviews.$inferInsert;

/**
 * Developer API enrollment — one privacy-minimized record per authenticated account.
 * Records versioned API Terms/AUP acceptance and the business-use review required
 * before the higher-risk review-request sending scope can be issued or exercised.
 */
export const developerApiEnrollments = pgTable(
  "developer_api_enrollments",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().unique(),
    termsVersion: varchar("termsVersion", { length: 32 }),
    acceptableUseVersion: varchar("acceptableUseVersion", { length: 32 }),
    termsAcceptedAt: bigint("termsAcceptedAt", { mode: "number" }),
    acceptanceFingerprint: varchar("acceptanceFingerprint", { length: 64 }),
    businessName: varchar("businessName", { length: 160 }),
    websiteUrl: varchar("websiteUrl", { length: 512 }),
    useCase: text("useCase"),
    expectedMonthlySendVolume: integer("expectedMonthlySendVolume"),
    consentProcess: text("consentProcess"),
    sendScopeStatus: varchar("sendScopeStatus", { length: 32 })
      .notNull()
      .default("not_requested"),
    sendScopeRequestedAt: bigint("sendScopeRequestedAt", { mode: "number" }),
    sendScopeReviewedAt: bigint("sendScopeReviewedAt", { mode: "number" }),
    sendScopeReviewedByUserId: integer("sendScopeReviewedByUserId"),
    sendScopeReviewNote: varchar("sendScopeReviewNote", { length: 500 }),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    index("developer_api_enrollment_status_idx").on(
      table.sendScopeStatus,
      table.sendScopeRequestedAt
    ),
  ]
);
export type DeveloperApiEnrollment =
  typeof developerApiEnrollments.$inferSelect;
export type InsertDeveloperApiEnrollment =
  typeof developerApiEnrollments.$inferInsert;

/**
 * API import events — log of each contact pushed via the public REST API.
 * Used to show the "Recent Imports" feed in the API Keys settings card.
 */
export const apiImportEvents = pgTable(
  "api_import_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    apiKeyId: integer("apiKeyId"), // null if key was deleted
    sourceConnectionId: integer("sourceConnectionId"),
    keyLabel: varchar("keyLabel", { length: 100 }).notNull().default("API Key"),
    eventType: varchar("eventType", { length: 32 })
      .notNull()
      .default("contact_import"),
    contactId: integer("contactId"), // null if contact was deleted
    email: varchar("email", { length: 320 }).notNull(),
    emailMasked: varchar("emailMasked", { length: 320 }),
    emailFingerprint: varchar("emailFingerprint", { length: 64 }),
    sourceApp: varchar("sourceApp", { length: 64 }),
    externalId: varchar("externalId", { length: 128 }),
    consentBasis: varchar("consentBasis", { length: 32 }),
    outcome: varchar("outcome", { length: 32 }).notNull().default("created"),
    errorCode: varchar("errorCode", { length: 64 }),
    idempotencyHash: varchar("idempotencyHash", { length: 64 }),
    created: boolean("created").notNull().default(true), // true = new contact, false = updated
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    index("api_import_events_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    index("api_import_events_key_created_idx").on(
      table.apiKeyId,
      table.createdAt
    ),
    index("api_import_events_source_created_idx").on(
      table.sourceConnectionId,
      table.createdAt
    ),
  ]
);
export type ApiImportEvent = typeof apiImportEvents.$inferSelect;
export type InsertApiImportEvent = typeof apiImportEvents.$inferInsert;

/** Request-level idempotency records; only hashes and bounded response metadata are retained. */
export const apiIdempotencyRecords = pgTable(
  "api_idempotency_records",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    apiKeyId: integer("apiKeyId").notNull(),
    idempotencyHash: varchar("idempotencyHash", { length: 64 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 64 }).notNull(),
    contactId: integer("contactId"),
    created: boolean("created").notNull().default(true),
    responseJson: text("responseJson").notNull(),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("api_idempotency_key_hash_unique").on(
      table.apiKeyId,
      table.idempotencyHash
    ),
    index("api_idempotency_expiry_idx").on(table.expiresAt),
  ]
);
export type ApiIdempotencyRecord = typeof apiIdempotencyRecords.$inferSelect;
export type InsertApiIdempotencyRecord =
  typeof apiIdempotencyRecords.$inferInsert;

/** Per-key rolling request windows used for deterministic API rate limiting. */
export const apiRateLimitWindows = pgTable(
  "api_rate_limit_windows",
  {
    id: serial("id").primaryKey(),
    apiKeyId: integer("apiKeyId").notNull(),
    windowStartedAt: bigint("windowStartedAt", { mode: "number" }).notNull(),
    requestCount: integer("requestCount").notNull().default(0),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("api_rate_limit_key_window_unique").on(
      table.apiKeyId,
      table.windowStartedAt
    ),
    index("api_rate_limit_expiry_idx").on(table.expiresAt),
  ]
);
export type ApiRateLimitWindow = typeof apiRateLimitWindows.$inferSelect;
export type InsertApiRateLimitWindow = typeof apiRateLimitWindows.$inferInsert;

/** Shared per-IP windows for unauthenticated WordPress pairing starts across Autoscale instances. */
export const wordpressPairingRateLimitWindows = pgTable(
  "wordpress_pairing_rate_limit_windows",
  {
    id: serial("id").primaryKey(),
    dimensionHash: varchar("dimensionHash", { length: 64 }).notNull(),
    windowStartedAt: bigint("windowStartedAt", { mode: "number" }).notNull(),
    requestCount: integer("requestCount").notNull().default(0),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("wordpress_pairing_rate_limit_dimension_window_unique").on(
      table.dimensionHash,
      table.windowStartedAt
    ),
    index("wordpress_pairing_rate_limit_expiry_idx").on(table.expiresAt),
  ]
);
export type WordPressPairingRateLimitWindow =
  typeof wordpressPairingRateLimitWindows.$inferSelect;
export type InsertWordPressPairingRateLimitWindow =
  typeof wordpressPairingRateLimitWindows.$inferInsert;

/**
 * Persistent abuse windows for public API side effects. Dimensions are stored
 * only as keyed hashes, never raw IP addresses or recipient email addresses.
 */
export const apiAbuseLimitWindows = pgTable(
  "api_abuse_limit_windows",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    apiKeyId: integer("apiKeyId"),
    action: varchar("action", { length: 32 }).notNull(),
    dimension: varchar("dimension", { length: 24 }).notNull(),
    dimensionHash: varchar("dimensionHash", { length: 64 }).notNull(),
    windowStartedAt: bigint("windowStartedAt", { mode: "number" }).notNull(),
    requestCount: integer("requestCount").notNull().default(0),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("api_abuse_dimension_window_unique").on(
      table.action,
      table.dimensionHash,
      table.windowStartedAt
    ),
    index("api_abuse_user_action_idx").on(
      table.userId,
      table.action,
      table.expiresAt
    ),
    index("api_abuse_key_action_idx").on(
      table.apiKeyId,
      table.action,
      table.expiresAt
    ),
    index("api_abuse_expiry_idx").on(table.expiresAt),
  ]
);
export type ApiAbuseLimitWindow = typeof apiAbuseLimitWindows.$inferSelect;
export type InsertApiAbuseLimitWindow =
  typeof apiAbuseLimitWindows.$inferInsert;

/**
 * Durable counters for adaptive review-request sending limits. Account scopes
 * enforce the non-bypassable ceiling even when a user changes delivery provider;
 * channel scopes apply the provider-aware warm-up policy.
 */
export const outboundSendLimitWindows = pgTable(
  "outbound_send_limit_windows",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    scopeKey: varchar("scopeKey", { length: 96 }).notNull(),
    windowType: varchar("windowType", { length: 8 }).notNull(),
    windowStartedAt: bigint("windowStartedAt", { mode: "number" }).notNull(),
    sendCount: integer("sendCount").notNull().default(0),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("outbound_send_limit_scope_window_unique").on(
      table.userId,
      table.scopeKey,
      table.windowType,
      table.windowStartedAt
    ),
    index("outbound_send_limit_user_expiry_idx").on(
      table.userId,
      table.expiresAt
    ),
    index("outbound_send_limit_expiry_idx").on(table.expiresAt),
  ]
);
export type OutboundSendLimitWindow =
  typeof outboundSendLimitWindows.$inferSelect;
export type InsertOutboundSendLimitWindow =
  typeof outboundSendLimitWindows.$inferInsert;

/** One private Koalendar webhook endpoint per Get Phame account. */
export const koalendarConnections = pgTable("koalendar_connections", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  webhookToken: varchar("webhookToken", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  lastEventAt: bigint("lastEventAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type KoalendarConnection = typeof koalendarConnections.$inferSelect;
export type InsertKoalendarConnection =
  typeof koalendarConnections.$inferInsert;

/**
 * Koalendar booking state. Only the invitee identity and fields required to
 * schedule, cancel, reschedule, deduplicate, and retry the eventual import are retained.
 */
export const koalendarBookings = pgTable(
  "koalendar_bookings",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    connectionId: integer("connectionId").notNull(),
    externalBookingId: varchar("externalBookingId", { length: 512 }).notNull(),
    eventType: varchar("eventType", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    inviteeName: varchar("inviteeName", { length: 255 }).notNull(),
    inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(),
    startsAt: bigint("startsAt", { mode: "number" }).notNull(),
    endsAt: bigint("endsAt", { mode: "number" }).notNull(),
    canceledAt: bigint("canceledAt", { mode: "number" }),
    importedAt: bigint("importedAt", { mode: "number" }),
    contactId: integer("contactId"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: bigint("nextAttemptAt", { mode: "number" }).notNull(),
    lastError: text("lastError"),
    createdAt: bigint("createdAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  table => [
    uniqueIndex("koalendar_bookings_user_external_unique").on(
      table.userId,
      table.externalBookingId
    ),
    index("koalendar_bookings_due_idx").on(table.status, table.nextAttemptAt),
  ]
);
export type KoalendarBooking = typeof koalendarBookings.$inferSelect;
export type InsertKoalendarBooking = typeof koalendarBookings.$inferInsert;

/**
 * Outbound webhook configurations — per-user webhook URLs fired on contact events.
 */
export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 64 }), // HMAC-SHA256 signing secret (optional)
  events: varchar("events", { length: 500 })
    .notNull()
    .default("contact.created"), // comma-separated event names
  active: boolean("active").notNull().default(true),
  label: varchar("label", { length: 100 }).notNull().default("Webhook"),
  lastFiredAt: bigint("lastFiredAt", { mode: "number" }),
  lastStatus: integer("lastStatus"), // HTTP status of last delivery
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

/**
 * WooCommerce pending imports — holds WooCommerce customers fetched but not yet imported.
 * Cleared when the user manually imports or when the auto-import scheduler runs.
 */
export const wooPendingImports = pgTable("woo_pending_imports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  orderId: varchar("orderId", { length: 64 }),
  orderDate: bigint("orderDate", { mode: "number" }), // Unix ms of WooCommerce order date
  fetchedAt: bigint("fetchedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type WooPendingImport = typeof wooPendingImports.$inferSelect;
export type InsertWooPendingImport = typeof wooPendingImports.$inferInsert;

/**
 * Webhook delivery logs — records each outbound webhook attempt.
 * Keeps the last N deliveries per webhook for debugging in Settings.
 */
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").notNull(),
  userId: integer("userId").notNull(),
  event: varchar("event", { length: 64 }).notNull(),
  url: text("url").notNull(),
  statusCode: integer("statusCode"), // null if network error
  success: boolean("success").notNull().default(false),
  responseBody: text("responseBody"), // truncated to 500 chars
  errorMessage: text("errorMessage"), // set on network/timeout error
  durationMs: integer("durationMs"), // round-trip time in ms
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;
export type InsertWebhookDeliveryLog = typeof webhookDeliveryLogs.$inferInsert;

/**
 * User notification preferences — stores per-user toggles for in-app notifications.
 */
export const notificationPrefs = pgTable("notification_prefs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  wooAutoImportNotify: boolean("wooAutoImportNotify").notNull().default(true),
  notifyOnEmailOpen: boolean("notifyOnEmailOpen").notNull().default(false),
  onboardingTipsEnabled: boolean("onboardingTipsEnabled")
    .notNull()
    .default(true),
  updatedAt: bigint("updatedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type NotificationPref = typeof notificationPrefs.$inferSelect;
export type InsertNotificationPref = typeof notificationPrefs.$inferInsert;

/**
 * Client reviews — reviews manually logged by the business owner after a customer leaves one.
 * Stores the reviewer's name, star rating, review text, platform, and date.
 */
export const clientReviews = pgTable("client_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK to users.id (the business owner)
  reviewerName: varchar("reviewerName", { length: 255 }).notNull(),
  rating: integer("rating").notNull(), // 1–5 stars
  reviewText: text("reviewText"), // nullable — some reviews are rating-only
  platform: platformEnum("platform").notNull().default("google"),
  reviewedAt: bigint("reviewedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()), // Unix ms
  // Optional link back to the customer request that triggered this review
  requestId: integer("requestId"),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type ClientReview = typeof clientReviews.$inferSelect;
export type InsertClientReview = typeof clientReviews.$inferInsert;

/** Bulk sender credentials — Pro-only feature for high-volume sending through verified SMTP relays. */
export const bulkSenderCredentials = pgTable("bulk_sender_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  provider: bulkProviderEnum("provider").notNull(),
  apiKey: text("apiKey").notNull(), // AES-256-GCM encrypted
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  // Mailgun-specific: sending domain (e.g. mg.yourdomain.com)
  mailgunDomain: varchar("mailgunDomain", { length: 255 }),
  // Mailgun-specific: EU region flag
  mailgunRegion: mailgunRegionEnum("mailgunRegion").default("us"),
  // Additive SMTP metadata. apiKey remains the encrypted secret column for backward compatibility.
  smtpHost: varchar("smtpHost", { length: 255 }),
  smtpPort: integer("smtpPort"),
  smtpSecure: integer("smtpSecure").default(0), // 0 = STARTTLS, 1 = implicit TLS
  smtpUsername: varchar("smtpUsername", { length: 320 }),
  providerRegion: varchar("providerRegion", { length: 64 }),
  connected: integer("connected").default(1).notNull(), // 1 = active
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type BulkSenderCredential = typeof bulkSenderCredentials.$inferSelect;
export type InsertBulkSenderCredential =
  typeof bulkSenderCredentials.$inferInsert;

/**
 * Referral / affiliate tracking.
 * Each user gets a unique referral code. When a new user signs up via a referral link
 * (?ref=CODE) and later converts to any paid plan (≥ 1 month), the referrer earns
 * one free month added to their planExpiresAt.
 */
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrerUserId").notNull(), // the user who shared the link
  referredUserId: integer("referredUserId").notNull().unique(), // the new user who signed up
  referralCode: varchar("referralCode", { length: 32 }).notNull(), // code used at signup
  convertedAt: bigint("convertedAt", { mode: "number" }), // Unix ms — null until paid conversion
  rewardedAt: bigint("rewardedAt", { mode: "number" }), // Unix ms — null until reward applied
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Magic link tokens — one-time passwordless sign-in tokens sent via email.
 * Each row represents a pending or consumed token.
 * Tokens expire after 15 minutes and can only be used once.
 */
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  usedAt: bigint("usedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

/**
 * One-time Turnstile verification attempts bound into signed provider OAuth state.
 * No raw Turnstile token, browser fingerprint, IP address, or provider credential is stored.
 */
export const providerHumanVerificationAttempts = pgTable(
  "provider_human_verification_attempts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    provider: mysqlEnum("provider", ["google", "apple"]).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    consumedAt: bigint("consumed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  table => [
    index("provider_human_verification_expiry_idx").on(table.expiresAt),
    index("provider_human_verification_consumed_idx").on(table.consumedAt),
  ]
);
export type ProviderHumanVerificationAttempt =
  typeof providerHumanVerificationAttempts.$inferSelect;
export type InsertProviderHumanVerificationAttempt =
  typeof providerHumanVerificationAttempts.$inferInsert;

/**
 * Landing page lead captures — stores emails from the free guide form.
 * guideSentAt is null until the system email with the PDF link is successfully sent.
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: bigint("createdAt", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
  guideSentAt: bigint("guideSentAt", { mode: "number" }),
  consentGivenAt: bigint("consentGivenAt", { mode: "number" }),
  unsubscribedAt: bigint("unsubscribedAt", { mode: "number" }),
  unsubscribeReason: varchar("unsubscribeReason", { length: 100 }),
});
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Opaque, revocable security sessions used by passkeys and future step-up paths.
 * Existing OAuth and magic-link JWT sessions remain valid during observe-mode rollout.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: integer("user_id").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    authMethod: securitySessionAuthMethodEnum("auth_method").notNull(),
    assurance: securityAssuranceEnum("assurance").notNull().default("a1"),
    authenticatedAt: bigint("authenticated_at", { mode: "number" }).notNull(),
    lastStepUpAt: bigint("last_step_up_at", { mode: "number" }),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull(),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    revocationReason: varchar("revocation_reason", { length: 255 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgentHash: varchar("user_agent_hash", { length: 64 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  table => [
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_expiry_idx").on(table.expiresAt, table.revokedAt),
  ]
);
export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = typeof authSessions.$inferInsert;

/** Registered passkey material. Private keys never leave the authenticator. */
export const webauthnCredentials = pgTable(
  "webauthn_credentials",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    credentialId: text("credential_id").notNull(),
    credentialIdHash: varchar("credential_id_hash", { length: 64 })
      .notNull()
      .unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transportsJson: text("transports_json"),
    deviceType: varchar("device_type", { length: 32 }),
    backedUp: boolean("backed_up").notNull().default(false),
    aaguid: varchar("aaguid", { length: 64 }),
    displayName: varchar("display_name", { length: 80 })
      .notNull()
      .default("Passkey"),
    status: webauthnCredentialStatusEnum("status").notNull().default("active"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    revokedByUserId: integer("revoked_by_user_id"),
  },
  table => [
    index("webauthn_credentials_user_idx").on(table.userId, table.status),
  ]
);
export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebauthnCredential = typeof webauthnCredentials.$inferInsert;

/** Short-lived, one-time WebAuthn challenge bindings; raw challenges are not persisted. */
export const webauthnCeremonies = pgTable(
  "webauthn_ceremonies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id").notNull(),
    purpose: webauthnCeremonyTypeEnum("purpose").notNull(),
    challengeHash: varchar("challenge_hash", { length: 64 }).notNull(),
    rpId: varchar("rp_id", { length: 255 }).notNull(),
    expectedOrigin: varchar("expected_origin", { length: 512 }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    consumedAt: bigint("consumed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  table => [
    index("webauthn_ceremonies_expiry_idx").on(
      table.expiresAt,
      table.consumedAt
    ),
    index("webauthn_ceremonies_user_idx").on(table.userId, table.purpose),
  ]
);
export type WebauthnCeremony = typeof webauthnCeremonies.$inferSelect;
export type InsertWebauthnCeremony = typeof webauthnCeremonies.$inferInsert;

/** Server-enforced platform or organization role grants. */
export const securityRoleGrants = pgTable(
  "security_role_grants",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    role: securityRoleEnum("role").notNull(),
    scopeType: securityScopeEnum("scope_type").notNull(),
    organizationId: integer("organization_id"),
    grantedByUserId: integer("granted_by_user_id").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    grantedAt: bigint("granted_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    revokedByUserId: integer("revoked_by_user_id"),
    revokeReason: varchar("revoke_reason", { length: 500 }),
  },
  table => [
    index("security_role_grants_user_idx").on(table.userId),
    index("security_role_grants_scope_idx").on(
      table.scopeType,
      table.organizationId
    ),
    index("security_role_grants_active_idx").on(
      table.userId,
      table.revokedAt,
      table.expiresAt
    ),
  ]
);
export type SecurityRoleGrant = typeof securityRoleGrants.$inferSelect;
export type InsertSecurityRoleGrant = typeof securityRoleGrants.$inferInsert;

/** Time-bounded explicit permission grants or denials; deny always wins. */
export const securityPermissionOverrides = pgTable(
  "security_permission_overrides",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    permission: varchar("permission", { length: 128 }).notNull(),
    effect: securityPermissionEffectEnum("effect").notNull(),
    scopeType: securityScopeEnum("scope_type").notNull(),
    organizationId: integer("organization_id"),
    reason: varchar("reason", { length: 500 }).notNull(),
    grantedByUserId: integer("granted_by_user_id").notNull(),
    grantedAt: bigint("granted_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    revokedByUserId: integer("revoked_by_user_id"),
  },
  table => [
    index("security_permission_overrides_user_idx").on(table.userId),
    index("security_permission_overrides_permission_idx").on(table.permission),
  ]
);
export type SecurityPermissionOverride =
  typeof securityPermissionOverrides.$inferSelect;
export type InsertSecurityPermissionOverride =
  typeof securityPermissionOverrides.$inferInsert;

/** Immutable authorization and sensitive-action evidence without secrets or raw tokens. */
export const securityAuditEvents = pgTable(
  "security_audit_events",
  {
    id: serial("id").primaryKey(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    actorType: securityActorTypeEnum("actor_type").notNull(),
    actorUserId: integer("actor_user_id"),
    serviceIdentityId: varchar("service_identity_id", { length: 36 }),
    sessionId: varchar("session_id", { length: 36 }),
    organizationId: integer("organization_id"),
    permission: varchar("permission", { length: 128 }),
    decision: securityDecisionEnum("decision"),
    reasonCode: varchar("reason_code", { length: 80 }).notNull(),
    actionKey: varchar("action_key", { length: 128 }),
    resourceType: varchar("resource_type", { length: 80 }),
    resourceId: varchar("resource_id", { length: 128 }),
    metadataJson: text("metadata_json"),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgentHash: varchar("user_agent_hash", { length: 64 }),
    occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
  },
  table => [
    index("security_audit_events_type_idx").on(
      table.eventType,
      table.occurredAt
    ),
    index("security_audit_events_actor_idx").on(
      table.actorUserId,
      table.occurredAt
    ),
    index("security_audit_events_org_idx").on(
      table.organizationId,
      table.occurredAt
    ),
  ]
);
export type SecurityAuditEvent = typeof securityAuditEvents.$inferSelect;
export type InsertSecurityAuditEvent = typeof securityAuditEvents.$inferInsert;

/** Dual-control evidence for owner, export, billing, and recovery-sensitive actions. */
export const securityActionApprovals = pgTable(
  "security_action_approvals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actionKey: varchar("action_key", { length: 128 }).notNull(),
    requesterUserId: integer("requester_user_id").notNull(),
    approverUserId: integer("approver_user_id"),
    organizationId: integer("organization_id"),
    resourceType: varchar("resource_type", { length: 80 }),
    resourceId: varchar("resource_id", { length: 128 }),
    status: securityApprovalStatusEnum("status").notNull().default("pending"),
    evidenceReference: varchar("evidence_reference", { length: 500 }),
    requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    decidedAt: bigint("decided_at", { mode: "number" }),
    executedAt: bigint("executed_at", { mode: "number" }),
  },
  table => [
    index("security_action_approvals_action_idx").on(
      table.actionKey,
      table.status
    ),
    index("security_action_approvals_requester_idx").on(table.requesterUserId),
  ]
);
export type SecurityActionApproval =
  typeof securityActionApprovals.$inferSelect;
export type InsertSecurityActionApproval =
  typeof securityActionApprovals.$inferInsert;

/** Staging-first owner recovery exercises. Production execution is not exposed by the application. */
export const recoveryDrills = pgTable(
  "recovery_drills",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    environment: recoveryEnvironmentEnum("environment").notNull(),
    status: recoveryDrillStatusEnum("status").notNull().default("draft"),
    title: varchar("title", { length: 160 }).notNull(),
    scheduledAt: bigint("scheduled_at", { mode: "number" }).notNull(),
    recoveryCustodianUserId: integer("recovery_custodian_user_id").notNull(),
    independentApproverUserId: integer("independent_approver_user_id"),
    observerUserId: integer("observer_user_id"),
    evidenceKey: varchar("evidence_key", { length: 500 }),
    notes: varchar("notes", { length: 1000 }),
    createdByUserId: integer("created_by_user_id").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    startedAt: bigint("started_at", { mode: "number" }),
    completedAt: bigint("completed_at", { mode: "number" }),
  },
  table => [
    index("recovery_drills_environment_idx").on(
      table.environment,
      table.status,
      table.scheduledAt
    ),
    check(
      "recovery_drills_separated_duties",
      sql`${table.independentApproverUserId} is null or ${table.recoveryCustodianUserId} <> ${table.independentApproverUserId}`
    ),
  ]
);
export type RecoveryDrill = typeof recoveryDrills.$inferSelect;
export type InsertRecoveryDrill = typeof recoveryDrills.$inferInsert;

/**
 * Drill-bound duty assignments. The two unique indexes enforce one actor per
 * role and one role per actor without relying on CHECK constraints, which the
 * managed TiDB dialect parses but does not retain.
 */
export const recoveryDrillParticipants = pgTable(
  "recovery_drill_participants",
  {
    id: serial("id").primaryKey(),
    drillId: varchar("drill_id", { length: 36 }).notNull(),
    role: recoveryDrillRoleEnum("role").notNull(),
    userId: integer("user_id").notNull(),
    assignedByUserId: integer("assigned_by_user_id").notNull(),
    assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
  },
  table => [
    uniqueIndex("recovery_participants_drill_role_unique").on(
      table.drillId,
      table.role
    ),
    uniqueIndex("recovery_participants_drill_user_unique").on(
      table.drillId,
      table.userId
    ),
    index("recovery_participants_user_idx").on(table.userId, table.drillId),
  ]
);
export type RecoveryDrillParticipant =
  typeof recoveryDrillParticipants.$inferSelect;
export type InsertRecoveryDrillParticipant =
  typeof recoveryDrillParticipants.$inferInsert;

/** Named staging recovery responsibilities; revoked rows remain as evidence. */
export const recoveryDrillAssignments = pgTable(
  "recovery_drill_assignments",
  {
    id: serial("id").primaryKey(),
    environment: recoveryEnvironmentEnum("environment").notNull(),
    role: recoveryDrillRoleEnum("role").notNull(),
    userId: integer("user_id"),
    displayLabel: varchar("display_label", { length: 120 }).notNull(),
    assignedByUserId: integer("assigned_by_user_id").notNull(),
    assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
    revokedAt: bigint("revoked_at", { mode: "number" }),
  },
  table => [
    index("recovery_assignments_environment_idx").on(
      table.environment,
      table.role,
      table.revokedAt
    ),
  ]
);
export type RecoveryDrillAssignment =
  typeof recoveryDrillAssignments.$inferSelect;
export type InsertRecoveryDrillAssignment =
  typeof recoveryDrillAssignments.$inferInsert;

/** Independent approval evidence; an approver can decide a drill only once. */
export const recoveryDrillApprovals = pgTable(
  "recovery_drill_approvals",
  {
    id: serial("id").primaryKey(),
    drillId: varchar("drill_id", { length: 36 }).notNull(),
    approverUserId: integer("approver_user_id").notNull(),
    decision: recoveryApprovalDecisionEnum("decision").notNull(),
    note: varchar("note", { length: 500 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  table => [
    index("recovery_drill_approvals_drill_idx").on(table.drillId),
    uniqueIndex("recovery_drill_approver_unique").on(
      table.drillId,
      table.approverUserId
    ),
  ]
);
export type RecoveryDrillApproval = typeof recoveryDrillApprovals.$inferSelect;
export type InsertRecoveryDrillApproval =
  typeof recoveryDrillApprovals.$inferInsert;

/** Redacted references and outcomes only; credentials, tokens, customer data, and secrets are prohibited. */
export const recoveryDrillEvidence = pgTable(
  "recovery_drill_evidence",
  {
    id: serial("id").primaryKey(),
    drillId: varchar("drill_id", { length: 36 }).notNull(),
    evidenceType: varchar("evidence_type", { length: 100 }).notNull(),
    evidenceReference: varchar("evidence_reference", { length: 255 }).notNull(),
    outcome: varchar("outcome", { length: 100 }).notNull(),
    recordedByUserId: integer("recorded_by_user_id").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  table => [
    index("recovery_drill_evidence_drill_idx").on(
      table.drillId,
      table.createdAt
    ),
  ]
);
export type RecoveryDrillEvidence = typeof recoveryDrillEvidence.$inferSelect;
export type InsertRecoveryDrillEvidence =
  typeof recoveryDrillEvidence.$inferInsert;

/** Redacted release lineage only; credentials, customer data, logs, and source diffs are prohibited. */
export const releaseParityRecords = pgTable(
  "release_parity_records",
  {
    id: serial("id").primaryKey(),
    checkpointId: varchar("checkpoint_id", { length: 64 }).notNull(),
    protectedMainCommit: varchar("protected_main_commit", { length: 64 }).notNull(),
    protectedMainTree: varchar("protected_main_tree", { length: 64 }).notNull(),
    managedTree: varchar("managed_tree", { length: 64 }).notNull(),
    parityStatus: varchar("parity_status", { length: 16 }).notNull(),
    recordedAt: bigint("recorded_at", { mode: "number" }).notNull(),
  },
  table => [index("release_parity_recorded_idx").on(table.recordedAt)]
);
