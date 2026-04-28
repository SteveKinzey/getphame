/**
 * WooCommerce REST API integration for Phame.
 *
 * Fetches completed orders from a user's WooCommerce store and stores
 * customer records locally. Customers who already received a review
 * request are excluded from the active list.
 */

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { wooCredentials, wooCustomers } from "../drizzle/schema";
import type { InsertWooCredentials, InsertWooCustomer } from "../drizzle/schema";
import { upsertContactsFromSource } from "./contacts";

// ─── Credentials helpers ──────────────────────────────────────────────────────

export async function getWooCredentials(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(wooCredentials)
    .where(eq(wooCredentials.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertWooCredentials(creds: InsertWooCredentials) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userId, ...rest } = creds;
  await db
    .insert(wooCredentials)
    .values(creds)
    .onDuplicateKeyUpdate({ set: rest });
}

// ─── WooCommerce API fetch ────────────────────────────────────────────────────

interface WooOrder {
  id: number;
  status: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{ name: string }>;
}

/**
 * Fetch completed orders from WooCommerce REST API v3.
 * Uses Basic Auth with consumer key/secret.
 */
export async function fetchWooOrders(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  days: number
): Promise<WooOrder[]> {
  const base = storeUrl.replace(/\/$/, "");
  const after = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    status: "completed",
    after,
    per_page: "100",
    orderby: "date",
    order: "desc",
  });

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(`${base}/wp-json/wc/v3/orders?${params}`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WooCommerce API error (${res.status}): ${err}`);
  }

  return res.json() as Promise<WooOrder[]>;
}

// ─── Sync logic ───────────────────────────────────────────────────────────────

/**
 * Sync WooCommerce orders into the woo_customers table.
 * Skips orders already in the DB (by wooOrderId).
 * Returns the count of new customers added.
 */
export async function syncWooOrders(
  userId: number,
  days: number
): Promise<{ added: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const creds = await getWooCredentials(userId);
  if (!creds) throw new Error("WooCommerce credentials not configured");

  const orders = await fetchWooOrders(
    creds.storeUrl,
    creds.consumerKey,
    creds.consumerSecret,
    days
  );

  if (orders.length === 0) {
    // Update lastSyncedAt even if no orders
    await db
      .update(wooCredentials)
      .set({ lastSyncedAt: Date.now() })
      .where(eq(wooCredentials.userId, userId));
    return { added: 0, total: 0 };
  }

  // Get existing order IDs to avoid duplicates
  const orderIds = orders.map((o) => String(o.id));
  const existing = await db
    .select({ wooOrderId: wooCustomers.wooOrderId })
    .from(wooCustomers)
    .where(
      and(
        eq(wooCustomers.userId, userId),
        inArray(wooCustomers.wooOrderId, orderIds)
      )
    );
  const existingIds = new Set(existing.map((r) => r.wooOrderId));

  const toInsert: InsertWooCustomer[] = orders
    .filter((o) => !existingIds.has(String(o.id)) && o.billing?.email)
    .map((o) => ({
      userId,
      wooOrderId: String(o.id),
      customerName: `${o.billing.first_name} ${o.billing.last_name}`.trim() || "Customer",
      customerEmail: o.billing.email,
      productName: o.line_items?.[0]?.name ?? null,
      orderDate: new Date(o.date_created).getTime(),
      reviewRequestSentAt: null,
    }));

  if (toInsert.length > 0) {
    await db.insert(wooCustomers).values(toInsert);
    // Also upsert into saved_contacts (deduped by email across all sources)
    const contactRows = toInsert
      .filter((r) => r.customerEmail)
      .map((r) => ({
        name: r.customerName,
        email: r.customerEmail!,
        source: "woocommerce" as const,
        externalId: r.wooOrderId,
      }));
    if (contactRows.length > 0) {
      await upsertContactsFromSource(userId, contactRows).catch((err) =>
        console.warn("[WooCommerce] Failed to upsert contacts from source:", err)
      );
    }
  }
  // Update lastSyncedAt
  await db
    .update(wooCredentials)
    .set({ lastSyncedAt: Date.now() })
    .where(eq(wooCredentials.userId, userId));
  return { added: toInsert.length, total: orders.length };
}

// ─── Customer list helpers ────────────────────────────────────────────────────

/**
 * Get customers who have NOT yet received a review request.
 */
export async function getPendingWooCustomers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(wooCustomers)
    .where(
      and(
        eq(wooCustomers.userId, userId),
        isNull(wooCustomers.reviewRequestSentAt)
      )
    )
    .orderBy(desc(wooCustomers.orderDate));
}

/**
 * Get ALL customers (pending + already sent), ordered by most recent order.
 */
export async function getAllWooCustomers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(wooCustomers)
    .where(eq(wooCustomers.userId, userId))
    .orderBy(desc(wooCustomers.orderDate));
}

/**
 * Manually set a single customer's review request status.
 * Pass null to mark as Pending, or Date.now() to mark as Sent.
 */
export async function setWooCustomerStatus(
  userId: number,
  customerId: number,
  sent: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  await db
    .update(wooCustomers)
    .set({
      reviewRequestSentAt: sent ? now : null,
      lastStatusChangedAt: now,
    })
    .where(
      and(
        eq(wooCustomers.userId, userId),
        eq(wooCustomers.id, customerId)
      )
    );
}

/**
 * Bulk set status for multiple customers at once.
 */
export async function bulkSetWooCustomerStatus(
  userId: number,
  customerIds: number[],
  sent: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  await db
    .update(wooCustomers)
    .set({
      reviewRequestSentAt: sent ? now : null,
      lastStatusChangedAt: now,
    })
    .where(
      and(
        eq(wooCustomers.userId, userId),
        inArray(wooCustomers.id, customerIds)
      )
    );
}

/**
 * Mark a list of wooCustomer IDs as having received a review request.
 */
export async function markWooCustomersSent(
  userId: number,
  customerIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(wooCustomers)
    .set({ reviewRequestSentAt: Date.now() })
    .where(
      and(
        eq(wooCustomers.userId, userId),
        inArray(wooCustomers.id, customerIds)
      )
    );
}
