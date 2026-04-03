/**
 * Email Templates — DB helpers for custom review request templates.
 * Supports {{customer_name}}, {{business_name}}, {{review_link}} placeholders.
 */
import { getDb } from "./db";
import { emailTemplates } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export async function listTemplates(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId))
    .orderBy(desc(emailTemplates.updatedAt));
}

export async function getDefaultTemplate(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [tmpl] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.isDefault, 1)));
  return tmpl ?? null;
}

export async function createTemplate(
  userId: number,
  data: { name: string; subject: string; body: string; isDefault?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.isDefault) {
    // Clear existing default
    await db
      .update(emailTemplates)
      .set({ isDefault: 0 })
      .where(eq(emailTemplates.userId, userId));
  }
  await db.insert(emailTemplates).values({
    userId,
    name: data.name,
    subject: data.subject,
    body: data.body,
    isDefault: data.isDefault ? 1 : 0,
  });
}

export async function updateTemplate(
  userId: number,
  templateId: number,
  data: { name: string; subject: string; body: string; isDefault?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.isDefault) {
    await db
      .update(emailTemplates)
      .set({ isDefault: 0 })
      .where(eq(emailTemplates.userId, userId));
  }
  await db
    .update(emailTemplates)
    .set({ name: data.name, subject: data.subject, body: data.body, isDefault: data.isDefault ? 1 : 0 })
    .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.id, templateId)));
}

export async function deleteTemplate(userId: number, templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(emailTemplates)
    .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.id, templateId)));
}
