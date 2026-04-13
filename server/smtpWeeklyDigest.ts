/**
 * Weekly SMTP failure digest.
 * Every Sunday at 08:00 UTC, aggregates lastHealthError across all smtp_credentials
 * rows and sends a summary notification to the owner via notifyOwner().
 * Only fires if there is at least one failing account.
 */
import { getDb } from "./db";
import { smtpCredentials } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Build and send the weekly digest.
 * Returns true if a digest was sent, false if skipped (no failures / DB unavailable).
 */
export async function sendSmtpWeeklyDigest(): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[SmtpWeeklyDigest] DB unavailable — skipping digest.");
    return false;
  }

  const rows = await db.select().from(smtpCredentials);
  const failing = rows.filter((r) => r.lastHealthStatus === "fail");
  const total = rows.length;

  if (failing.length === 0) {
    console.log(`[SmtpWeeklyDigest] All ${total} account(s) healthy — no digest needed.`);
    return false;
  }

  // Aggregate by host
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
  const lastRunAt = rows.reduce((max, r) => Math.max(max, r.lastHealthCheck ?? 0), 0);
  const lastRunStr = lastRunAt
    ? new Date(lastRunAt).toUTCString()
    : "never";

  // Build digest content
  const lines: string[] = [
    `Weekly SMTP Health Digest — ${new Date().toUTCString()}`,
    ``,
    `Summary: ${failing.length} of ${total} connected account(s) are failing (${failRate}% failure rate).`,
    `Last health check ran: ${lastRunStr}`,
    ``,
    `Breakdown by provider:`,
  ];

  for (const [host, { count, errors }] of Object.entries(byHost).sort((a, b) => b[1].count - a[1].count)) {
    lines.push(`  ${host}: ${count} failing account(s)`);
    for (const err of errors) {
      lines.push(`    • ${err}`);
    }
  }

  lines.push(``);
  lines.push(`Action: Visit /admin/smtp-stats to see the full breakdown and run an on-demand health check.`);

  const content = lines.join("\n");

  try {
    await notifyOwner({
      title: `⚠️ SMTP Digest: ${failing.length}/${total} accounts failing`,
      content,
    });
    console.log(`[SmtpWeeklyDigest] Digest sent — ${failing.length} failing account(s) across ${Object.keys(byHost).length} provider(s).`);
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
    // Repeat every 7 days
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
  // Advance to next Sunday
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  next.setUTCDate(now.getUTCDate() + daysUntilSunday);
  next.setUTCHours(8, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  // If somehow negative (e.g., exactly Sunday 08:00), schedule for next week
  return ms > 0 ? ms : WEEK_MS;
}
