/**
 * Daily SMTP health check scheduler.
 * Tests every connected user's SMTP credentials once per day and
 * updates lastHealthCheck + lastHealthStatus on each smtp_credentials row.
 * The Settings health dot reads these fields via smtp.status tRPC procedure.
 */

import { runSmtpHealthChecks } from "./smtp";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Start the daily SMTP health check scheduler.
 * Runs an initial check after a 60-second startup delay (let DB settle),
 * then repeats every 24 hours.
 */
export function startSmtpHealthCheckScheduler(): void {
  console.log("[SmtpHealthCheck] Daily health check scheduler started.");

  // Initial check after 60s — give server and DB time to fully start
  setTimeout(() => {
    runSmtpHealthChecks().catch(err =>
      console.error("[SmtpHealthCheck] Initial check failed:", err)
    );
  }, 60_000);

  // Repeat every 24 hours
  setInterval(() => {
    runSmtpHealthChecks().catch(err =>
      console.error("[SmtpHealthCheck] Scheduled check failed:", err)
    );
  }, CHECK_INTERVAL_MS);
}
