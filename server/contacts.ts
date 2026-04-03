/**
 * Saved Contacts — DB helpers for repeat review request sending.
 */
import { getDb } from "./db";
import { savedContacts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export async function listSavedContacts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(savedContacts)
    .where(eq(savedContacts.userId, userId))
    .orderBy(desc(savedContacts.updatedAt));
}

export async function createSavedContact(
  userId: number,
  data: { name: string; email: string; phone?: string; notes?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(savedContacts).values({
    userId,
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    totalSent: 0,
  });
}

export async function updateSavedContact(
  userId: number,
  contactId: number,
  data: { name: string; email: string; phone?: string; notes?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(savedContacts)
    .set({ name: data.name, email: data.email, phone: data.phone ?? null, notes: data.notes ?? null })
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.id, contactId)));
}

export async function deleteSavedContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(savedContacts)
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.id, contactId)));
}

export async function markContactSent(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [contact] = await db
    .select({ totalSent: savedContacts.totalSent })
    .from(savedContacts)
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.id, contactId)));
  if (!contact) return;
  await db
    .update(savedContacts)
    .set({ lastSentAt: Date.now(), totalSent: (contact.totalSent ?? 0) + 1 })
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.id, contactId)));
}

/**
 * Bulk-import contacts from CSV.
 * Deduplicates by email (case-insensitive) against existing contacts.
 * Returns counts of imported and skipped rows.
 */
export async function importContacts(
  userId: number,
  rows: { name: string; email: string; phone?: string; notes?: string }[]
): Promise<{ imported: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch existing emails for this user to deduplicate
  const existing = await db
    .select({ email: savedContacts.email })
    .from(savedContacts)
    .where(eq(savedContacts.userId, userId));
  const existingEmails = new Set(existing.map((r) => r.email.toLowerCase()));

  const toInsert = rows.filter((r) => !existingEmails.has(r.email.toLowerCase()));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length > 0) {
    // Insert in batches of 100 to avoid query size limits
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      await db.insert(savedContacts).values(
        batch.map((r) => ({
          userId,
          name: r.name,
          email: r.email,
          phone: r.phone ?? null,
          notes: r.notes ?? null,
          totalSent: 0,
        }))
      );
    }
  }

  return { imported: toInsert.length, skipped };
}
