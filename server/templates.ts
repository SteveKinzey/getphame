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

/** Seed the 3 default starter templates for a user (only if those specific templates don't exist yet).
 * Uses a per-user in-memory flag to avoid concurrent duplicate inserts during the same server session.
 */
const _seededUsers = new Set<number>();

export async function seedDefaultTemplates(userId: number) {
  if (_seededUsers.has(userId)) return; // already seeded this session
  _seededUsers.add(userId);

  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ name: emailTemplates.name })
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId));
  const existingNames = new Set(existing.map((e) => e.name));

  const defaults = [
    {
      name: "Quick favor?",
      subject: "Quick favor?",
      body: `Thanks again for choosing {{businessName}}.

If you have a minute, I'd appreciate your honest feedback. It helps others make informed decisions and helps us improve.

You can leave a review on any platform you prefer:

{{platformLinks}}

No pressure at all — just your honest experience.

Appreciate your time,
{{businessName}} Team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`,
      isDefault: 1,
    },
    {
      name: "How did we do?",
      subject: "How did we do?",
      body: `I wanted to follow up and see how everything went with your recent experience.

If you're open to it, I'd value your feedback. It helps us grow and helps other customers know what to expect.

You can leave a review here:

{{platformLinks}}

Thanks again for your business — I appreciate it.

{{businessName}} Team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`,
      isDefault: 0,
    },
    {
      name: "Thanks for your order",
      subject: "Thanks for your order — got a minute?",
      body: `Your recent order with {{businessName}} means a lot — thank you.

When you've had a chance to use your purchase, I'd like to hear your honest feedback.

If you want to share it publicly, you can do that here:

{{platformLinks}}

Or just reply to this email — I read every response.

Thanks again,
{{businessName}} Team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`,
      isDefault: 0,
    },
  ];

  for (const t of defaults) {
    if (!existingNames.has(t.name)) {
      await db.insert(emailTemplates).values({ userId, ...t });
    }
  }
}
