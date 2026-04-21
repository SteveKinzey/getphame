/**
 * WooCommerce Pending Import Scheduler
 *
 * Logic:
 * - When WooCommerce orders are synced, new orders go to `woo_pending_imports` first.
 * - Users see a "Pending imports" count in Settings with "Import Now" / "Dismiss" buttons.
 * - Auto-import: every Monday at 03:00 GMT, any pending records older than 7 days are
 *   automatically imported into woo_customers and saved_contacts.
 */

import { getDb, getNotificationPrefs } from "./db";
import { wooPendingImports, wooCustomers, savedContacts } from "../drizzle/schema";
import { eq, lt, and, inArray } from "drizzle-orm";
import { upsertContactsFromSource } from "./contacts";
import { notifyOwner } from "./_core/notification";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
export async function importPendingWooOrders(userId: number): Promise<{ imported: number }> {
  const db = await getDb();
  if (!db) return { imported: 0 };

  const pending = await db
    .select()
    .from(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));

  if (pending.length === 0) return { imported: 0 };

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
      }))
    ).catch((err) => console.warn("[WooImport] Failed to upsert contacts:", err));
  }

  // Clear the pending queue for this user
  await db.delete(wooPendingImports).where(eq(wooPendingImports.userId, userId));

  return { imported: toInsert.length };
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

/**
 * Auto-import scheduler: runs every Monday at 03:00 GMT.
 * Imports any pending records older than 7 days for all users.
 */
export function startWooAutoImportScheduler(): void {
  console.log("[WooAutoImport] Scheduler started — checks every Monday at 03:00 GMT.");

  const scheduleNextRun = () => {
    const now = new Date();
    // Find next Monday 03:00 UTC
    const next = new Date(now);
    next.setUTCHours(3, 0, 0, 0);
    // Day of week: 0=Sun, 1=Mon ... 6=Sat
    const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7; // always at least 1 day ahead
    // If today is Monday and it's before 03:00 UTC, run today; otherwise next Monday
    if (next.getUTCDay() === 1 && now < next) {
      // today is Monday and we haven't hit 03:00 yet — run today
    } else {
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    }
    const msUntilNext = next.getTime() - now.getTime();
    console.log(
      `[WooAutoImport] Next auto-import scheduled for ${next.toUTCString()} (in ${Math.round(msUntilNext / 3600000)}h)`
    );

    setTimeout(async () => {
      await runAutoImport();
      scheduleNextRun(); // reschedule for next Monday
    }, msUntilNext);
  };

  scheduleNextRun();
}

async function runAutoImport(): Promise<void> {
  console.log("[WooAutoImport] Running Monday auto-import...");
  const db = await getDb();
  if (!db) return;

  const cutoff = Date.now() - SEVEN_DAYS_MS;

  // Get all user IDs with pending imports older than 7 days
  const stale = await db
    .select({ userId: wooPendingImports.userId })
    .from(wooPendingImports)
    .where(lt(wooPendingImports.fetchedAt, cutoff));

  const userIds = [...new Set(stale.map((r) => r.userId))];
  console.log(`[WooAutoImport] Found ${userIds.length} user(s) with stale pending imports.`);

  for (const userId of userIds) {
    try {
      const result = await importPendingWooOrders(userId);
      console.log(`[WooAutoImport] User ${userId}: imported ${result.imported} contacts.`);
      // Notify the user if they have the notify-on-import preference enabled
      try {
        const prefs = await getNotificationPrefs(userId);
        if (prefs?.wooAutoImportNotify) {
          await notifyOwner({
            title: "WooCommerce Auto-Import Complete",
            content: `ReviewLink automatically imported ${result.imported} WooCommerce contact${result.imported !== 1 ? "s" : ""} into your contacts list. These customers are now ready to receive review requests.`,
          });
        }
      } catch (notifyErr) {
        console.warn(`[WooAutoImport] Notify failed for user ${userId}:`, notifyErr);
      }
    } catch (err) {
      console.error(`[WooAutoImport] User ${userId} failed:`, err);
    }
  }
}
