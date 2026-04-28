/**
 * Weekly digest.
 * Every Sunday at 08:00 UTC:
 *  - SMTP health summary (failing accounts)
 *  - Cancellations this week (churn_surveys grouped by reason)
 * Sends via notifyOwner(). Always fires so the owner gets a weekly pulse.
 */
import { getDb } from "./db";
import { smtpCredentials, churnSurveys } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { gte } from "drizzle-orm";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const REASON_LABELS: Record<string, string> = {
  too_expensive: "Too expensive",
  not_using: "Not using it",
  switching_tools: "Switching tools",
  missing_feature: "Missing a feature",
  other: "Other",
};

/**
 * Build and send the weekly digest.
 * Returns true if sent, false if DB unavailable.
 */
export async function sendSmtpWeeklyDigest(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[SmtpWeeklyDigest] DB unavailable — skipping digest.");
    return false;
  }

  // ── SMTP health ──────────────────────────────────────────────────────────
  const smtpRows = await db.select().from(smtpCredentials);
  const failing = smtpRows.filter((r) => r.lastHealthStatus === "fail");
  const total = smtpRows.length;

  const byHost: Record<string, { count: number; errors: string[] }> = {};
  for (const row of failing) {
    const host = row.host || "(unknown)";
    if (!byHost[host]) byHost[host] = { count: 0, errors: [] };
    byHost[host].count++;
    if (row.lastHealthError && byHost[host].errors.length < 3) {
      byHost[host].errors.push(row.lastHealthError);
    }
  }

  const failRate = Math.round((failing.length / total) * 100);
  const lastRunAt = smtpRows.reduce((max, r) => Math.max(max, r.lastHealthCheck ?? 0), 0);
  const lastRunStr = lastRunAt ? new Date(lastRunAt).toUTCString() : "never";

  // ── Churn this week ───────────────────────────────────────────────────────
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const churnRows = await db
    .select()
    .from(churnSurveys)
    .where(gte(churnSurveys.createdAt, weekAgo));

  const churnCounts: Record<string, number> = {};
  for (const r of churnRows) {
    churnCounts[r.reason] = (churnCounts[r.reason] ?? 0) + 1;
  }

  // ── Build digest ──────────────────────────────────────────────────────────
  const lines: string[] = [
    `Weekly Phame Digest — ${new Date().toUTCString()}`,
    ``,
    `━━ SMTP Health ━━`,
    total === 0
      ? `No SMTP accounts connected.`
      : failing.length === 0
        ? `✓ All ${total} connected account(s) healthy.`
        : `⚠ ${failing.length} of ${total} account(s) failing (${failRate}% failure rate).`,
    `Last health check: ${lastRunStr}`,
  ];

  if (failing.length > 0) {
    lines.push(``, `Breakdown by provider:`);
    for (const [host, { count, errors }] of Object.entries(byHost).sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`  ${host}: ${count} failing`);
      for (const err of errors) lines.push(`    • ${err}`);
    }
    lines.push(``, `→ Visit /admin/smtp-stats to run an on-demand health check.`);
  }

  lines.push(``, `━━ Cancellations This Week ━━`);
  if (churnRows.length === 0) {
    lines.push(`No cancellations this week. 🎉`);
  } else {
    lines.push(`${churnRows.length} cancellation(s) recorded:`);
    for (const [reason, count] of Object.entries(churnCounts).sort((a, b) => b[1] - a[1])) {
      const label = REASON_LABELS[reason] ?? reason;
      lines.push(`  ${label}: ${count}`);
    }
    // Show last 3 comments
    const withComments = churnRows.filter(r => r.comment).slice(-3);
    if (withComments.length > 0) {
      lines.push(``, `Recent comments:`);
      for (const r of withComments) {
        lines.push(`  "${r.comment}" (${r.email ?? "anonymous"})`);
      }
    }
    lines.push(``, `→ Visit /admin/churn for the full breakdown.`);
  }

  const content = lines.join("\n");
  const smtpBadge = failing.length > 0 ? `⚠️ ${failing.length} SMTP fail · ` : "";
  const churnBadge = churnRows.length > 0 ? `${churnRows.length} cancellation(s)` : "0 cancellations";

  try {
    await notifyOwner({
      title: `📊 Weekly Digest — ${smtpBadge}${churnBadge}`,
      content,
    });
    console.log(`[SmtpWeeklyDigest] Digest sent — ${failing.length} SMTP failing, ${churnRows.length} churn(s) this week.`);
    return true;
  } catch (err) {
    console.error("[SmtpWeeklyDigest] Failed to send digest notification:", err);
    return false;
  }
}

/**
 * Start the weekly digest scheduler.
 * Calculates the ms until next Sunday 08:00 UTC, then repeats weekly.
 */
export function startSmtpWeeklyDigestScheduler(): void {
  const msUntilNextSunday = getMsUntilNextSundayAt8UTC();
  console.log(
    `[SmtpWeeklyDigest] Scheduler started. Next digest in ${Math.round(msUntilNextSunday / 3600000)}h.`
  );

  setTimeout(() => {
    sendSmtpWeeklyDigest().catch((err) =>
      console.error("[SmtpWeeklyDigest] First run failed:", err)
    );
    setInterval(() => {
      sendSmtpWeeklyDigest().catch((err) =>
        console.error("[SmtpWeeklyDigest] Scheduled run failed:", err)
      );
    }, WEEK_MS);
  }, msUntilNextSunday);
}

function getMsUntilNextSundayAt8UTC(): number {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  next.setUTCDate(now.getUTCDate() + daysUntilSunday);
  next.setUTCHours(8, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  return ms > 0 ? ms : WEEK_MS;
}
