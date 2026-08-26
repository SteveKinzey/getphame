import { desc, eq } from "drizzle-orm";
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

export async function listProfilePreferenceExportHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: profilePreferenceExportHistory.id,
      format: profilePreferenceExportHistory.format,
      exportedAt: profilePreferenceExportHistory.exportedAt,
    })
    .from(profilePreferenceExportHistory)
    .where(eq(profilePreferenceExportHistory.userId, userId))
    .orderBy(desc(profilePreferenceExportHistory.exportedAt))
    .limit(MAX_PROFILE_PREFERENCE_EXPORT_HISTORY_ROWS);
}
