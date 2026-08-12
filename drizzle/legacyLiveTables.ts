/**
 * Read-only declaration evidence for tables present in the live database but
 * not queried by the active application contract. This module is deliberately
 * excluded from the active generator schema until a dedicated lifecycle plan
 * exists for each legacy table.
 */
import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const authDiagnosticEventsLegacy20260712 = mysqlTable("auth_diagnostic_events_legacy_20260712", {
	id: int().autoincrement().notNull(),
	requestId: varchar({ length: 36 }).notNull(),
	magicLinkId: int(),
	eventType: mysqlEnum(['request_created','delivery_succeeded','delivery_failed','verification_succeeded','verification_failed','request_received','token_created','provider_accepted','provider_failed']).notNull(),
	status: mysqlEnum(['ok','fail']).notNull(),
	emailFingerprint: varchar({ length: 64 }),
	recipientMasked: varchar({ length: 320 }),
	provider: varchar({ length: 64 }),
	providerMessageId: varchar({ length: 255 }),
	failureCode: varchar({ length: 64 }),
	failureDetail: varchar({ length: 500 }),
	durationMs: int(),
	createdAt: bigint({ mode: "number" }).notNull(),
});

export const authHealthChecksLegacy20260712 = mysqlTable("auth_health_checks_legacy_20260712", {
	id: int().autoincrement().notNull(),
	trigger: mysqlEnum(['heartbeat','manual']).notNull(),
	status: mysqlEnum(['ok','fail']).notNull(),
	configStatus: mysqlEnum(['ok','fail']).notNull(),
	databaseStatus: mysqlEnum(['ok','fail']).notNull(),
	schemaStatus: mysqlEnum(['ok','fail']).notNull(),
	sessionStatus: mysqlEnum(['ok','fail']).notNull(),
	emailProviderStatus: mysqlEnum(['ok','fail']).notNull(),
	provider: varchar({ length: 64 }),
	failureCode: varchar({ length: 64 }),
	failureDetail: varchar({ length: 500 }),
	durationMs: int().notNull(),
	scheduleTaskUid: varchar({ length: 128 }),
	checkedAt: bigint({ mode: "number" }).notNull(),
});

export const contactSourceDeliveries = mysqlTable("contact_source_deliveries", {
	id: int().autoincrement().notNull(),
	sourceId: int().notNull(),
	userId: int().notNull(),
	eventFingerprint: varchar({ length: 64 }).notNull(),
	payloadHash: varchar({ length: 64 }).notNull(),
	outcome: varchar({ length: 32 }).notNull(),
	errorCode: varchar({ length: 64 }),
	contactId: int(),
	emailMasked: varchar({ length: 320 }),
	emailFingerprint: varchar({ length: 64 }),
	receivedAt: bigint({ mode: "number" }).notNull(),
	expiresAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("contact_source_delivery_event_uq").on(table.sourceId, table.eventFingerprint),
	index("contact_source_delivery_user_received_idx").on(table.userId, table.receivedAt),
	index("contact_source_delivery_expiry_idx").on(table.expiresAt),
]);

export const contactSourceRateWindows = mysqlTable("contact_source_rate_windows", {
	id: int().autoincrement().notNull(),
	sourceId: int().notNull(),
	userId: int().notNull(),
	windowStartedAt: bigint({ mode: "number" }).notNull(),
	requestCount: int().default(0).notNull(),
	expiresAt: bigint({ mode: "number" }).notNull(),
	createdAt: bigint({ mode: "number" }).notNull(),
	updatedAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("contact_source_rate_window_uq").on(table.sourceId, table.windowStartedAt),
	index("contact_source_rate_window_expiry_idx").on(table.expiresAt),
]);

export const contactSources = mysqlTable("contact_sources", {
	id: int().autoincrement().notNull(),
	publicId: varchar({ length: 64 }).notNull(),
	userId: int().notNull(),
	provider: varchar({ length: 48 }).notNull(),
	name: varchar({ length: 160 }).notNull(),
	endpointTokenHash: varchar({ length: 64 }).notNull(),
	endpointTokenHint: varchar({ length: 16 }).notNull(),
	status: varchar({ length: 32 }).default('awaiting_sample').notNull(),
	enabled: tinyint().default(1).notNull(),
	mappingJson: text(),
	consentBasis: varchar({ length: 64 }),
	consentSource: varchar({ length: 255 }),
	sampleFieldCatalogJson: text(),
	lastEventAt: bigint({ mode: "number" }),
	lastSuccessAt: bigint({ mode: "number" }),
	lastErrorCode: varchar({ length: 64 }),
	receivedCount: int().default(0).notNull(),
	importedCount: int().default(0).notNull(),
	duplicateCount: int().default(0).notNull(),
	rejectedCount: int().default(0).notNull(),
	createdAt: bigint({ mode: "number" }).notNull(),
	updatedAt: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("contact_sources_publicId_unique").on(table.publicId),
	index("contact_sources_endpointTokenHash_unique").on(table.endpointTokenHash),
	index("contact_sources_user_provider_idx").on(table.userId, table.provider),
	index("contact_sources_user_status_idx").on(table.userId, table.status),
]);

export const releaseCheckpoints = mysqlTable("release_checkpoints", {
	id: int().autoincrement().notNull(),
	checkpointId: varchar("checkpoint_id", { length: 64 }).notNull(),
	sourceCommit: varchar("source_commit", { length: 64 }).notNull(),
	publishedAt: bigint("published_at", { mode: "number" }).notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("release_checkpoints_published_idx").on(table.publishedAt),
]);

export const securityServiceIdentities = mysqlTable("security_service_identities", {
	id: varchar({ length: 36 }).notNull(),
	identityClass: mysqlEnum("identity_class", ['scheduled_job','integration_webhook']).notNull(),
	name: varchar({ length: 120 }).notNull(),
	ownerUserId: int("owner_user_id").notNull(),
	organizationId: int("organization_id"),
	purpose: varchar({ length: 500 }).notNull(),
	allowedProceduresJson: text("allowed_procedures_json").notNull(),
	credentialHash: varchar("credential_hash", { length: 64 }).notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }),
	lastUsedAt: bigint("last_used_at", { mode: "number" }),
	revokedAt: bigint("revoked_at", { mode: "number" }),
},
(table) => [
	index("security_service_identities_credential_hash_unique").on(table.credentialHash),
	index("security_service_identity_owner_idx").on(table.ownerUserId),
	index("security_service_identity_scope_idx").on(table.organizationId, table.revokedAt),
]);

export const securitySupportAccessGrants = mysqlTable("security_support_access_grants", {
	id: varchar({ length: 36 }).notNull(),
	ticketReference: varchar("ticket_reference", { length: 128 }).notNull(),
	organizationId: int("organization_id").notNull(),
	actorUserId: int("actor_user_id").notNull(),
	tier: mysqlEnum(['metadata_only','read_only_customer_context','assisted_write','incident_break_glass']).notNull(),
	allowedProceduresJson: text("allowed_procedures_json").notNull(),
	allowedFieldsJson: text("allowed_fields_json"),
	reason: varchar({ length: 500 }).notNull(),
	consentEvidenceReference: varchar("consent_evidence_reference", { length: 500 }),
	approvedByUserId: int("approved_by_user_id").notNull(),
	startsAt: bigint("starts_at", { mode: "number" }).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
	revokedAt: bigint("revoked_at", { mode: "number" }),
	revokedByUserId: int("revoked_by_user_id"),
},
(table) => [
	index("security_support_grants_actor_idx").on(table.actorUserId, table.expiresAt),
	index("security_support_grants_org_idx").on(table.organizationId, table.expiresAt),
]);

export const signupRateLimitWindows = mysqlTable("signup_rate_limit_windows", {
	id: int().autoincrement().notNull(),
	dimension: varchar({ length: 24 }).notNull(),
	dimensionHash: varchar("dimension_hash", { length: 64 }).notNull(),
	windowStartedAt: bigint("window_started_at", { mode: "number" }).notNull(),
	requestCount: int("request_count").default(0).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
},
(table) => [
	index("signup_rate_limit_dimension_window_unique").on(table.dimension, table.dimensionHash, table.windowStartedAt),
	index("signup_rate_limit_expiry_idx").on(table.expiresAt),
]);

export const signupRiskEvents = mysqlTable("signup_risk_events", {
	id: int().autoincrement().notNull(),
	userId: int(),
	provider: varchar({ length: 32 }).notNull(),
	outcome: mysqlEnum(['allowed','restricted','blocked','verified']).notNull(),
	emailFingerprint: varchar("email_fingerprint", { length: 64 }).notNull(),
	emailDomain: varchar("email_domain", { length: 255 }).notNull(),
	ipHash: varchar("ip_hash", { length: 64 }),
	userAgentHash: varchar("user_agent_hash", { length: 64 }),
	deviceHash: varchar("device_hash", { length: 64 }),
	riskScore: int("risk_score").notNull(),
	riskReasonsJson: text("risk_reasons_json").notNull(),
	occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
},
(table) => [
	index("signup_risk_event_user_occurred_idx").on(table.userId, table.occurredAt),
	index("signup_risk_event_email_occurred_idx").on(table.emailFingerprint, table.occurredAt),
	index("signup_risk_event_ip_occurred_idx").on(table.ipHash, table.occurredAt),
	index("signup_risk_event_device_occurred_idx").on(table.deviceHash, table.occurredAt),
]);

export const signupRiskProfiles = mysqlTable("signup_risk_profiles", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	emailFingerprint: varchar("email_fingerprint", { length: 64 }).notNull(),
	emailDomain: varchar("email_domain", { length: 255 }).notNull(),
	ipHash: varchar("ip_hash", { length: 64 }),
	userAgentHash: varchar("user_agent_hash", { length: 64 }),
	deviceHash: varchar("device_hash", { length: 64 }),
	riskScore: int("risk_score").default(0).notNull(),
	riskReasonsJson: text("risk_reasons_json").notNull(),
	status: mysqlEnum(['clear','restricted','high_risk','blocked']).default('restricted').notNull(),
	emailVerifiedAt: bigint("email_verified_at", { mode: "number" }),
	reviewedAt: bigint("reviewed_at", { mode: "number" }),
	reviewedByUserId: int("reviewed_by_user_id"),
	reviewNote: varchar("review_note", { length: 500 }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("signup_risk_profile_user_unique").on(table.userId),
	index("signup_risk_profile_status_score_idx").on(table.status, table.riskScore),
	index("signup_risk_profile_ip_idx").on(table.ipHash),
	index("signup_risk_profile_device_idx").on(table.deviceHash),
]);

export const signupRiskRateWindows = mysqlTable("signup_risk_rate_windows", {
	id: int().autoincrement().notNull(),
	fingerprint: varchar({ length: 64 }).notNull(),
	action: varchar({ length: 64 }).notNull(),
	windowStartedAt: bigint("window_started_at", { mode: "number" }).notNull(),
	requestCount: int("request_count").default(0).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
},
(table) => [
	index("signup_risk_rate_window_unique").on(table.fingerprint, table.action, table.windowStartedAt),
	index("signup_risk_rate_expiry_idx").on(table.expiresAt),
]);

export const smtpHealthSnapshots = mysqlTable("smtp_health_snapshots", {
	id: int().autoincrement().notNull(),
	triggerSource: mysqlEnum("trigger_source", ['scheduled','manual']).notNull(),
	scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
	overallStatus: mysqlEnum("overall_status", ['ok','fail']).notNull(),
	totalAccounts: int("total_accounts").notNull(),
	healthyAccounts: int("healthy_accounts").notNull(),
	failingAccounts: int("failing_accounts").notNull(),
	untestedAccounts: int("untested_accounts").notNull(),
	healthRateBasisPoints: int("health_rate_basis_points"),
	durationMs: int("duration_ms").notNull(),
	checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
},
(table) => [
	index("smtp_health_snapshot_checked_idx").on(table.checkedAt),
	index("smtp_health_snapshot_task_uid_idx").on(table.scheduleCronTaskUid),
]);

export const webauthnChallenges = mysqlTable("webauthn_challenges", {
	id: varchar({ length: 36 }).notNull(),
	userId: int("user_id").notNull(),
	ceremony: mysqlEnum(['registration','authentication']).notNull(),
	challengeHash: varchar("challenge_hash", { length: 64 }).notNull(),
	rpId: varchar("rp_id", { length: 255 }).notNull(),
	origin: varchar({ length: 500 }).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
	consumedAt: bigint("consumed_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("webauthn_challenges_challenge_hash_unique").on(table.challengeHash),
	index("webauthn_challenges_user_idx").on(table.userId, table.ceremony),
	index("webauthn_challenges_expiry_idx").on(table.expiresAt, table.consumedAt),
]);
