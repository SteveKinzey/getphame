/**
 * Review Platforms — DB helpers
 * Manages multi-platform review URLs per user (Google, Yelp, TripAdvisor, Bing, Facebook, Other).
 * Business owners paste their public review page URL; no credentials are stored.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { reviewPlatforms, type ReviewPlatform } from "../drizzle/schema";

export type PlatformType =
  | "google"
  | "yelp"
  | "tripadvisor"
  | "bing"
  | "facebook"
  | "apple"
  | "other";

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
  bing: "Bing",
  facebook: "Facebook",
  apple: "Apple Maps",
  other: "Other",
};

export const PLATFORM_ICONS: Record<PlatformType, string> = {
  google: "🔍",
  yelp: "⭐",
  tripadvisor: "🦉",
  bing: "🌐",
  facebook: "👍",
  apple: "🍎",
  other: "🔗",
};

/** List all review platforms for a user */
export async function listReviewPlatforms(
  userId: number
): Promise<ReviewPlatform[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(reviewPlatforms)
    .where(eq(reviewPlatforms.userId, userId));
}

/** Get the default review platform for a user (falls back to first in list) */
export async function getDefaultReviewPlatform(
  userId: number
): Promise<ReviewPlatform | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const all = await db
    .select()
    .from(reviewPlatforms)
    .where(eq(reviewPlatforms.userId, userId));
  if (all.length === 0) return null;
  return all.find(p => p.isDefault === 1) ?? all[0];
}

/** Add a new review platform for a user */
export async function addReviewPlatform(
  userId: number,
  platform: PlatformType,
  url: string,
  label?: string
): Promise<ReviewPlatform> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If this is the first platform, make it default automatically
  const existing = await listReviewPlatforms(userId);
  const isFirst = existing.length === 0;
  await db.insert(reviewPlatforms).values({
    userId,
    platform,
    url,
    label: label ?? null,
    isDefault: isFirst ? 1 : 0,
  });
  // Return the newly created row (most recently added)
  const all = await listReviewPlatforms(userId);
  return all[all.length - 1];
}

/** Update a review platform's URL or label */
export async function updateReviewPlatform(
  userId: number,
  platformId: number,
  url: string,
  label?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(reviewPlatforms)
    .set({ url, label: label ?? null })
    .where(
      and(
        eq(reviewPlatforms.id, platformId),
        eq(reviewPlatforms.userId, userId)
      )
    );
}

/** Delete a review platform */
export async function deleteReviewPlatform(
  userId: number,
  platformId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If deleting the default, promote the next one
  const all = await listReviewPlatforms(userId);
  const target = all.find(p => p.id === platformId);
  await db
    .delete(reviewPlatforms)
    .where(
      and(
        eq(reviewPlatforms.id, platformId),
        eq(reviewPlatforms.userId, userId)
      )
    );
  if (target?.isDefault === 1) {
    const remaining = all.filter(p => p.id !== platformId);
    if (remaining.length > 0) {
      await db
        .update(reviewPlatforms)
        .set({ isDefault: 1 })
        .where(
          and(
            eq(reviewPlatforms.id, remaining[0].id),
            eq(reviewPlatforms.userId, userId)
          )
        );
    }
  }
}

/** Set a platform as the default (clears other defaults for this user) */
export async function setDefaultReviewPlatform(
  userId: number,
  platformId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Clear all defaults for this user
  await db
    .update(reviewPlatforms)
    .set({ isDefault: 0 })
    .where(eq(reviewPlatforms.userId, userId));
  // Set the new default
  await db
    .update(reviewPlatforms)
    .set({ isDefault: 1 })
    .where(
      and(
        eq(reviewPlatforms.id, platformId),
        eq(reviewPlatforms.userId, userId)
      )
    );
}
