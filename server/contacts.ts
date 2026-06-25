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

/**
 * Upsert contacts from an external source (stripe or woocommerce).
 * Deduplicates by email (case-insensitive) against ALL existing contacts for this user.
 * - If a contact with the same email already exists (any source), skip it (don't overwrite manual edits).
 * - If no contact exists, insert with the given source and externalId.
 * Returns counts of inserted and skipped rows.
 */
export async function upsertContactsFromSource(
  userId: number,
  rows: { name: string; email: string; phone?: string; source: "stripe" | "woocommerce"; externalId?: string }[]
): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch existing emails for this user (all sources)
  const existing = await db
    .select({ email: savedContacts.email })
    .from(savedContacts)
    .where(eq(savedContacts.userId, userId));
  const existingEmails = new Set(existing.map((r) => r.email.toLowerCase()));

  const toInsert = rows.filter((r) => r.email && !existingEmails.has(r.email.toLowerCase()));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      await db.insert(savedContacts).values(
        batch.map((r) => ({
          userId,
          name: r.name || r.email,
          email: r.email,
          phone: r.phone ?? null,
          notes: null,
          totalSent: 0,
          source: r.source,
          externalId: r.externalId ?? null,
        }))
      );
    }
  }

  return { inserted: toInsert.length, skipped };
}

/** Update the tags array for a single contact */
export async function setContactTags(userId: number, contactId: number, tags: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(savedContacts)
    .set({ tags: JSON.stringify(tags) })
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.id, contactId)));
}

/**
 * Upsert a single contact from the public API.
 * If a contact with the same email already exists for this user, update notes/phone/tags.
 * Returns the contact id and whether it was newly created.
 */
export async function upsertApiContact(
  userId: number,
  data: { name: string; email: string; phone?: string; notes?: string; tags?: string[] }
): Promise<{ id: number; created: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const emailLower = data.email.toLowerCase();
  const [existing] = await db
    .select()
    .from(savedContacts)
    .where(and(eq(savedContacts.userId, userId), eq(savedContacts.email, emailLower)))
    .limit(1);

  if (existing) {
    // Update mutable fields — don't overwrite name if already set
    await db
      .update(savedContacts)
      .set({
        phone: data.phone ?? existing.phone,
        notes: data.notes ?? existing.notes,
        tags: data.tags ? JSON.stringify(data.tags) : existing.tags,
      })
      .where(eq(savedContacts.id, existing.id));
    return { id: existing.id, created: false };
  }

  const [result] = await db.insert(savedContacts).values({
    userId,
    name: data.name,
    email: emailLower,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    totalSent: 0,
    source: "manual",
    externalId: null,
  }).returning({ id: savedContacts.id });
  return { id: result.id, created: true };
}
