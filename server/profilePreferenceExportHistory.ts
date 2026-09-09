import { and, desc, eq, gte, lte } from "drizzle-orm";
import { profilePreferenceExportHistory } from "../drizzle/schema";
import { getDb } from "./db";

const MAX_PROFILE_PREFERENCE_EXPORT_HISTORY_ROWS = 20;
export const PROFILE_PREFERENCE_EXPORT_FORMATS = ["json", "csv"] as const;
export type ProfilePreferenceExportFormat = typeof PROFILE_PREFERENCE_EXPORT_FORMATS[number];

export function isProfilePreferenceExportFormat(value: string): value is ProfilePreferenceExportFormat {
  return (PROFILE_PREFERENCE_EXPORT_FORMATS as readonly string[]).includes(value);
}

export async function recordProfilePreferenceExport(input: {
  userId: number;
  format: ProfilePreferenceExportFormat;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(profilePreferenceExportHistory).values({
    userId: input.userId,
    format: input.format,
    exportedAt: Date.now(),
  });
}

export type ProfilePreferenceExportHistoryFilter = {
  startDate?: string;
  endDate?: string;
};

function toUtcStartOfDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toUtcEndOfDay(date: string) {
  return toUtcStartOfDay(date) + 86_399_999;
}

export async function listProfilePreferenceExportHistory(
  userId: number,
  filter: ProfilePreferenceExportHistoryFilter = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(profilePreferenceExportHistory.userId, userId)];
  if (filter.startDate) conditions.push(gte(profilePreferenceExportHistory.exportedAt, toUtcStartOfDay(filter.startDate)));
  if (filter.endDate) conditions.push(lte(profilePreferenceExportHistory.exportedAt, toUtcEndOfDay(filter.endDate)));
  return db
    .select({
      id: profilePreferenceExportHistory.id,
      format: profilePreferenceExportHistory.format,
      exportedAt: profilePreferenceExportHistory.exportedAt,
    })
    .from(profilePreferenceExportHistory)
    .where(and(...conditions))
    .orderBy(desc(profilePreferenceExportHistory.exportedAt))
    .limit(MAX_PROFILE_PREFERENCE_EXPORT_HISTORY_ROWS);
}
