import { eq } from "drizzle-orm";
import { businessProfiles, users } from "../drizzle/schema";
import { calculateComplimentaryExpiry } from "./complimentaryAccess";
import { getDb } from "./db";

export const ADMIN_SUBSCRIPTION_PLANS = [
  "monthly",
  "annual",
  "lifetime",
] as const;
export type AdminSubscriptionPlan = (typeof ADMIN_SUBSCRIPTION_PLANS)[number];

export type SubscriptionGrant = {
  tier: "pro" | "annual" | "lifetime";
  planExpiresAt: number | null;
};

export function resolveSubscriptionGrant(
  plan: AdminSubscriptionPlan,
  startsAt = Date.now()
): SubscriptionGrant {
  if (plan === "lifetime") {
    return { tier: "lifetime", planExpiresAt: null };
  }

  return {
    tier: plan === "annual" ? "annual" : "pro",
    planExpiresAt: calculateComplimentaryExpiry(
      startsAt,
      1,
      plan === "annual" ? "year" : "month"
    ),
  };
}

export async function grantSubscriptionByEmail(
  rawEmail: string,
  plan: AdminSubscriptionPlan,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");

  const email = rawEmail.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!account) return null;

  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, account.id))
    .limit(1);

  if (profile?.tier === "lifetime" && plan !== "lifetime") {
    throw new Error("This account already has lifetime access.");
  }

  const startsAt =
    profile?.planExpiresAt != null && profile.planExpiresAt > now
      ? profile.planExpiresAt
      : now;
  const grant = resolveSubscriptionGrant(plan, startsAt);

  if (profile) {
    await db
      .update(businessProfiles)
      .set({ ...grant, updatedAt: new Date() })
      .where(eq(businessProfiles.userId, account.id));
  } else {
    const resetMonth = new Date(now).toISOString().slice(0, 7);
    await db.insert(businessProfiles).values({
      userId: account.id,
      businessName: account.name || email,
      reviewLink: "",
      monthlyResetDate: resetMonth,
      ...grant,
    });
  }

  return {
    userId: account.id,
    email,
    name: account.name,
    plan,
    ...grant,
  };
}

export async function revokeSubscriptionByEmail(rawEmail: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");

  const email = rawEmail.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!account) return null;

  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, account.id))
    .limit(1);
  if (!profile) return null;

  await db
    .update(businessProfiles)
    .set({ tier: "free", planExpiresAt: null, updatedAt: new Date() })
    .where(eq(businessProfiles.userId, account.id));

  return { userId: account.id, email, name: account.name };
}
