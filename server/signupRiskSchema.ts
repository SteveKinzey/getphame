import { bigint, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Existing managed table mapping; intentionally excluded from migration schema. */
export const signupRiskEvents = mysqlTable("signup_risk_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 24 }).notNull(),
  outcome: varchar("outcome", { length: 24 }).notNull(),
  emailFingerprint: varchar("email_fingerprint", { length: 128 }).notNull(),
  emailDomain: varchar("email_domain", { length: 255 }).notNull(),
  ipHash: varchar("ip_hash", { length: 128 }),
  userAgentHash: varchar("user_agent_hash", { length: 128 }),
  deviceHash: varchar("device_hash", { length: 128 }),
  riskScore: int("risk_score").notNull(),
  riskReasonsJson: varchar("risk_reasons_json", { length: 1024 }).notNull(),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
});
