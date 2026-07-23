/**
 * WooCommerce Pending Import Queue
 *
 * Logic:
 * - When WooCommerce orders are synced, new orders go to `woo_pending_imports` first.
 * - Users see a "Pending imports" count in Settings with "Import Now" / "Dismiss" buttons.
 * - Imports occur only after the user reviews the queue and explicitly attests consent.
 */

import { getDb } from "./db";
import { wooPendingImports, wooCustomers, savedContacts } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { upsertContactsFromSource } from "./contacts";

/**
 * Fetch new WooCommerce orders and stage them in woo_pending_imports instead of
 * importing directly. Returns { staged, skipped } counts.
 */
export async function stageWooOrders(
  userId: number,
  orders: Array<{
    id: number | string;
    billing: { email: string; first_name: string; last_name: string; phone?: string };
    date_created: string;
  }>
): Promise<{ staged: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { staged: 0, skipped: 0 };

  // Get emails already in woo_pending_imports for this user to avoid duplicates
  const existing = await db
    .select({ email: wooPendingImports.email })
    .from(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));
  const existingEmails = new Set(existing.map((r) => r.email.toLowerCase()));

  // Also check woo_customers to avoid re-staging already-imported orders
  const existingOrderIds = await db
    .select({ wooOrderId: wooCustomers.wooOrderId })
    .from(wooCustomers)
    .where(eq(wooCustomers.userId, userId));
  const existingOrderIdSet = new Set(existingOrderIds.map((r) => r.wooOrderId));

  const toStage = orders.filter(
    (o) =>
      o.billing?.email &&
      !existingEmails.has(o.billing.email.toLowerCase()) &&
      !existingOrderIdSet.has(String(o.id))
  );

  if (toStage.length === 0) return { staged: 0, skipped: orders.length };

  await db.insert(wooPendingImports).values(
    toStage.map((o) => ({
      userId,
      email: o.billing.email.toLowerCase(),
      name: `${o.billing.first_name} ${o.billing.last_name}`.trim() || "Customer",
      phone: o.billing.phone ?? null,
      orderId: String(o.id),
      orderDate: new Date(o.date_created).getTime(),
      fetchedAt: Date.now(),
    }))
  );

  return { staged: toStage.length, skipped: orders.length - toStage.length };
}

/**
 * Import all pending records for a user into woo_customers and saved_contacts.
 * Clears the pending queue after import.
 */
export async function importPendingWooOrders(
  userId: number,
  consent: { basis: string; source: string; capturedAt: number }
): Promise<{ imported: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { imported: 0, skipped: 0 };

  const pending = await db
    .select()
    .from(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));

  if (pending.length === 0) return { imported: 0, skipped: 0 };

  // Insert into woo_customers (skip duplicates by orderId)
  const existingOrderIds = await db
    .select({ wooOrderId: wooCustomers.wooOrderId })
    .from(wooCustomers)
    .where(eq(wooCustomers.userId, userId));
  const existingOrderIdSet = new Set(existingOrderIds.map((r) => r.wooOrderId));

  const toInsert = pending.filter((p) => p.orderId && !existingOrderIdSet.has(p.orderId));

  if (toInsert.length > 0) {
    await db.insert(wooCustomers).values(
      toInsert.map((p) => ({
        userId,
        wooOrderId: p.orderId ?? `pending-${p.id}`,
        customerName: p.name ?? "Customer",
        customerEmail: p.email,
        productName: null,
        orderDate: p.orderDate ?? Date.now(),
        reviewRequestSentAt: null,
      }))
    );

    // Also upsert into saved_contacts
    await upsertContactsFromSource(
      userId,
      toInsert.map((p) => ({
        name: p.name ?? "Customer",
        email: p.email,
        source: "woocommerce" as const,
        externalId: p.orderId ?? undefined,
        sourceApp: "woocommerce",
        consentBasis: consent.basis,
        consentCapturedAt: consent.capturedAt,
        consentSource: consent.source,
      }))
    ).catch((err) => console.warn("[WooImport] Failed to upsert contacts:", err));
  }

  // Clear the pending queue for this user
  await db.delete(wooPendingImports).where(eq(wooPendingImports.userId, userId));

  return { imported: toInsert.length, skipped: pending.length - toInsert.length };
}

export async function listPendingWooImports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wooPendingImports).where(eq(wooPendingImports.userId, userId));
}

/**
 * Get count of pending WooCommerce imports for a user.
 */
export async function getPendingWooImportCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: wooPendingImports.id })
    .from(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));
  return rows.length;
}

/**
 * Dismiss (delete) all pending WooCommerce imports for a user without importing.
 */
export async function dismissPendingWooOrders(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(wooPendingImports).where(eq(wooPendingImports.userId, userId));
}
