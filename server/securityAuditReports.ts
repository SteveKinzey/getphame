import { and, desc, eq, gte, lt, lte } from "drizzle-orm";
import {
  securityAuditReports,
  type InsertSecurityAuditReport,
} from "../drizzle/schema";
import {
  SECURITY_AUDIT_REPORT_RETENTION_MS,
  type SecurityAuditOutcome,
} from "./securityAuditReporting";
import { getDb } from "./db";

export class SecurityAuditReplayError extends Error {
  constructor() {
    super("The GitHub OIDC token has already been used.");
    this.name = "SecurityAuditReplayError";
  }
}

export type SecurityAuditHistoryFilters = {
  fromMs: number;
  toMs: number;
  limit: number;
  outcome?: SecurityAuditOutcome;
};

export async function ingestSecurityAuditReport(
  input: InsertSecurityAuditReport
): Promise<{ reportId: number; duplicate: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async tx => {
    const [existing] = await tx
      .select({ id: securityAuditReports.id })
      .from(securityAuditReports)
      .where(eq(securityAuditReports.eventKey, input.eventKey))
      .limit(1);
    if (existing) return { reportId: existing.id, duplicate: true };

    const [replayed] = await tx
      .select({ id: securityAuditReports.id })
      .from(securityAuditReports)
      .where(eq(securityAuditReports.oidcJtiHash, input.oidcJtiHash))
      .limit(1);
    if (replayed) throw new SecurityAuditReplayError();

    let insertId: number;
    try {
      const result = await tx.insert(securityAuditReports).values(input);
      insertId = Number(result[0].insertId);
    } catch (error) {
      const [sameEvent] = await tx
        .select({ id: securityAuditReports.id })
        .from(securityAuditReports)
        .where(eq(securityAuditReports.eventKey, input.eventKey))
        .limit(1);
      if (sameEvent) return { reportId: sameEvent.id, duplicate: true };
      const [sameToken] = await tx
        .select({ id: securityAuditReports.id })
        .from(securityAuditReports)
        .where(eq(securityAuditReports.oidcJtiHash, input.oidcJtiHash))
        .limit(1);
      if (sameToken) throw new SecurityAuditReplayError();
      throw error;
    }

    const expiredRows = await tx
      .select({ id: securityAuditReports.id })
      .from(securityAuditReports)
      .where(
        lt(
          securityAuditReports.eventAt,
          input.receivedAt - SECURITY_AUDIT_REPORT_RETENTION_MS
        )
      )
      .limit(500);
    if (expiredRows.length > 0) {
      await tx
        .delete(securityAuditReports)
        .where(eq(securityAuditReports.id, expiredRows[0].id));
      for (const row of expiredRows.slice(1)) {
        await tx
          .delete(securityAuditReports)
          .where(eq(securityAuditReports.id, row.id));
      }
    }

    return { reportId: insertId, duplicate: false };
  });
}

export async function getSecurityAuditDashboard(
  filters: SecurityAuditHistoryFilters
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const conditions = [
    gte(securityAuditReports.eventAt, filters.fromMs),
    lte(securityAuditReports.eventAt, filters.toMs),
  ];
  if (filters.outcome) {
    conditions.push(eq(securityAuditReports.outcome, filters.outcome));
  }

  const condition = and(...conditions);
  const [history, latestRows, allRangeRows] = await Promise.all([
    db
      .select()
      .from(securityAuditReports)
      .where(condition)
      .orderBy(
        desc(securityAuditReports.eventAt),
        desc(securityAuditReports.id)
      )
      .limit(filters.limit),
    db
      .select()
      .from(securityAuditReports)
      .orderBy(
        desc(securityAuditReports.eventAt),
        desc(securityAuditReports.id)
      )
      .limit(1),
    db
      .select({ outcome: securityAuditReports.outcome })
      .from(securityAuditReports)
      .where(condition),
  ]);

  const counts = allRangeRows.reduce(
    (summary, row) => {
      summary.total += 1;
      const outcome = row.outcome as SecurityAuditOutcome;
      summary[outcome] += 1;
      return summary;
    },
    {
      total: 0,
      clean: 0,
      attention: 0,
      failed: 0,
    } as {
      total: number;
      clean: number;
      attention: number;
      failed: number;
    }
  );

  return {
    range: { fromMs: filters.fromMs, toMs: filters.toMs },
    latest: latestRows[0] ?? null,
    history,
    counts,
  };
}
