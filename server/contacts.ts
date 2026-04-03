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
