import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import {
  InsertUser,
  businessProfiles,
  customerRequests,
  users,
  type InsertBusinessProfile,
  type InsertCustomerRequest,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Business profile helpers ─────────────────────────────────────────────────

export async function getBusinessProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBusinessProfile(profile: InsertBusinessProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userId, ...rest } = profile;
  await db
    .insert(businessProfiles)
    .values(profile)
    .onDuplicateKeyUpdate({ set: rest });
}

// ─── Customer request helpers ─────────────────────────────────────────────────

export async function createCustomerRequest(req: InsertCustomerRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(customerRequests).values(req);
  return (result as unknown as { insertId: number }).insertId;
}

export async function getCustomerRequests(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerRequests)
    .where(eq(customerRequests.userId, userId))
    .orderBy(desc(customerRequests.sentAt))
    .limit(limit);
}

export async function getMonthlyRequestCount(userId: number, yearMonth: string) {
  const db = await getDb();
  if (!db) return 0;
  const [year, month] = yearMonth.split("-");
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerRequests)
    .where(
      and(
        eq(customerRequests.userId, userId),
        sql`YEAR(sentAt) = ${year} AND MONTH(sentAt) = ${month}`
      )
    );
  return Number(rows[0]?.count ?? 0);
}
