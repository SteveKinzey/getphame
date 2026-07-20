import { businessProfiles, churnSurveys, stripeSubscriptions } from "../drizzle/schema";
import { getDb } from "./db";
import { getReminderTimingPerformance } from "./reminderPerformance";

const MONTHLY_PRICE_CENTS = 2900;
const ANNUAL_PRICE_CENTS = 29000;
const LIFETIME_PRICE_CENTS = 49000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type AdminOperationsCsvRow = {
  section: string;
  metric: string;
  period: string;
  value: string | number;
  unit: string;
  details: string;
};

export function escapeAdminOperationsCsvCell(value: string | number): string {
  const raw = String(value ?? "");
  const formulaSafe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return /[",\r\n]/.test(formulaSafe)
    ? `"${formulaSafe.replace(/"/g, '""')}"`
    : formulaSafe;
}

export function serializeAdminOperationsCsv(rows: AdminOperationsCsvRow[]): string {
  const header = ["section", "metric", "period", "value", "unit", "details"];
  const body = rows.map((row) => [
    row.section,
    row.metric,
    row.period,
    row.value,
    row.unit,
    row.details,
  ].map(escapeAdminOperationsCsvCell).join(","));

  return `\uFEFF${header.join(",")}\r\n${body.join("\r\n")}\r\n`;
}

export async function buildAdminOperationsAnalyticsExport(nowMs = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [profiles, subscriptions, surveys, reminderPerformance] = await Promise.all([
    db.select({ tier: businessProfiles.tier }).from(businessProfiles),
    db.select({ status: stripeSubscriptions.status, createdAt: stripeSubscriptions.createdAt }).from(stripeSubscriptions),
    db.select({ reason: churnSurveys.reason }).from(churnSurveys),
    getReminderTimingPerformance(),
  ]);

  const tierCounts = { free: 0, pro: 0, annual: 0, lifetime: 0 };
  for (const profile of profiles) {
    if (profile.tier in tierCounts) tierCounts[profile.tier as keyof typeof tierCounts] += 1;
  }

  const mrrCents = tierCounts.pro * MONTHLY_PRICE_CENTS
    + tierCounts.annual * Math.round(ANNUAL_PRICE_CENTS / 12);
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active").length;
  const recentCancellations = subscriptions.filter((subscription) => (
    subscription.status === "canceled"
    && new Date(subscription.createdAt).getTime() >= nowMs - THIRTY_DAYS_MS
  )).length;
  const churnRate = activeSubscriptions > 0
    ? Math.round((recentCancellations / activeSubscriptions) * 1000) / 10
    : 0;

  const rows: AdminOperationsCsvRow[] = [
    { section: "metadata", metric: "generated_at", period: "current", value: new Date(nowMs).toISOString(), unit: "iso_8601", details: "Get Phame administrator operations analytics export" },
    { section: "revenue", metric: "monthly_recurring_revenue", period: "current", value: mrrCents / 100, unit: "USD", details: "Monthly plans plus annual plans at monthly equivalent" },
    { section: "revenue", metric: "annual_recurring_revenue", period: "annualized", value: (mrrCents * 12) / 100, unit: "USD", details: "Current MRR multiplied by 12" },
    { section: "revenue", metric: "lifetime_revenue", period: "all_time", value: (tierCounts.lifetime * LIFETIME_PRICE_CENTS) / 100, unit: "USD", details: "Lifetime-tier purchases represented by current lifetime accounts" },
    { section: "revenue", metric: "active_subscriptions", period: "current", value: activeSubscriptions, unit: "accounts", details: "Subscriptions with active status" },
    ...Object.entries(tierCounts).map(([tier, count]) => ({
      section: "revenue",
      metric: "accounts_by_tier",
      period: "current",
      value: count,
      unit: "accounts",
      details: `tier=${tier}`,
    })),
    { section: "churn", metric: "churn_rate", period: "last_30_days", value: churnRate, unit: "percent", details: "Recent canceled subscriptions divided by current active subscriptions" },
    { section: "churn", metric: "recent_cancellations", period: "last_30_days", value: recentCancellations, unit: "subscriptions", details: "Subscriptions marked canceled during the rolling 30-day window" },
    { section: "churn", metric: "survey_responses", period: "all_time", value: surveys.length, unit: "responses", details: "No respondent identity or free-text comment is included" },
  ];

  const churnReasonCounts = new Map<string, number>();
  for (const survey of surveys) {
    churnReasonCounts.set(survey.reason, (churnReasonCounts.get(survey.reason) ?? 0) + 1);
  }
  for (const [reason, count] of Array.from(churnReasonCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    rows.push({ section: "churn", metric: "survey_reason", period: "all_time", value: count, unit: "responses", details: `reason=${reason}` });
  }

  for (const reminder of reminderPerformance) {
    const configuration = [
      `stage=${reminder.stage}`,
      `first_delay_days=${reminder.firstDelayDays}`,
      `second_delay_days=${reminder.secondDelayDays}`,
      `first_enabled=${reminder.firstStageEnabled}`,
      `second_enabled=${reminder.secondStageEnabled}`,
      `low_sample=${reminder.isLowSample}`,
    ].join("; ");
    rows.push(
      { section: "reminders", metric: "sent", period: "all_time_attributed", value: reminder.sentCount, unit: "reminders", details: configuration },
      { section: "reminders", metric: "successful", period: "all_time_attributed", value: reminder.successCount, unit: "responses", details: configuration },
      { section: "reminders", metric: "success_rate", period: "all_time_attributed", value: reminder.successRate ?? "unavailable", unit: "percent", details: configuration },
    );
  }

  const dateStamp = new Date(nowMs).toISOString().slice(0, 10);
  return {
    filename: `getphame-operations-analytics-${dateStamp}.csv`,
    mimeType: "text/csv;charset=utf-8",
    csv: serializeAdminOperationsCsv(rows),
    generatedAt: nowMs,
    rowCount: rows.length,
  };
}
