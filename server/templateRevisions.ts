import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, max } from "drizzle-orm";
import { emailTemplateRevisions, emailTemplates } from "../drizzle/schema";
import { getDb } from "./db";
import { outreachLocaleSchema, type OutreachLocale } from "./integrationExpansion";

const ALLOWED_SHORTCODES = new Set([
  "customer_name",
  "customerName",
  "business_name",
  "businessName",
  "review_link",
  "reviewLink",
  "platformLinks",
]);

export type TemplateCopy = { subject: string; body: string };

function normalizeCopy(copy: TemplateCopy): TemplateCopy {
  const normalized = {
    subject: copy.subject.trim(),
    body: copy.body.trim(),
  };
  if (normalized.subject.length < 3 || normalized.subject.length > 512) {
    throw new Error("Template subject must contain 3 to 512 characters.");
  }
  if (normalized.body.length < 20 || normalized.body.length > 10_000) {
    throw new Error("Template body must contain 20 to 10,000 characters.");
  }
  for (const text of [normalized.subject, normalized.body]) {
    for (const match of Array.from(text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g))) {
      if (!ALLOWED_SHORTCODES.has(match[1])) {
        throw new Error(`Unsupported template shortcode: ${match[1]}`);
      }
    }
  }
  return normalized;
}

function inputHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function publicId(prefix: "tf" | "tr") {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export async function createBilingualTemplateDraft(params: {
  userId: number;
  name: string;
  locale: OutreachLocale;
  localized: TemplateCopy;
  english: TemplateCopy;
  provenance: "ai_onboarding" | "manual" | "imported";
  modelId?: string | null;
  generationInput?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const locale = outreachLocaleSchema.parse(params.locale);
  const localized = normalizeCopy(params.localized);
  const english = normalizeCopy(params.english);
  const familyPublicId = publicId("tf");
  const [templateResult] = await db.insert(emailTemplates).values({
    userId: params.userId,
    name: params.name.trim().slice(0, 255),
    subject: localized.subject,
    body: localized.body,
    familyPublicId,
    locale,
    provenance: params.provenance,
    approvedAt: null,
    isDefault: 0,
  }).$returningId();
  const templateId = templateResult.id;
  const shared = {
    userId: params.userId,
    templateId,
    familyPublicId,
    version: 1,
    englishSubject: english.subject,
    englishBody: english.body,
    provenance: params.provenance,
    modelId: params.modelId ?? null,
    inputHash: params.generationInput === undefined ? null : inputHash(params.generationInput),
    status: "draft",
  } as const;

  const [englishResult] = await db.insert(emailTemplateRevisions).values({
    ...shared,
    publicId: publicId("tr"),
    locale: "en",
    subject: english.subject,
    body: english.body,
  }).$returningId();
  await db.update(emailTemplateRevisions)
    .set({ englishRevisionId: englishResult.id })
    .where(and(eq(emailTemplateRevisions.userId, params.userId), eq(emailTemplateRevisions.id, englishResult.id)));

  if (locale === "en") {
    return { templateId, familyPublicId, localizedRevisionId: englishResult.id, englishRevisionId: englishResult.id };
  }

  const [localizedResult] = await db.insert(emailTemplateRevisions).values({
    ...shared,
    publicId: publicId("tr"),
    locale,
    subject: localized.subject,
    body: localized.body,
    englishRevisionId: englishResult.id,
  }).$returningId();
  return {
    templateId,
    familyPublicId,
    localizedRevisionId: localizedResult.id,
    englishRevisionId: englishResult.id,
  };
}

export async function getLatestApprovedTemplateRevision(params: {
  userId: number;
  templateId: number;
  locale: OutreachLocale;
}) {
  const db = await getDb();
  if (!db) return null;
  const [revision] = await db.select().from(emailTemplateRevisions).where(and(
    eq(emailTemplateRevisions.userId, params.userId),
    eq(emailTemplateRevisions.templateId, params.templateId),
    eq(emailTemplateRevisions.locale, params.locale),
    eq(emailTemplateRevisions.status, "approved"),
  )).orderBy(desc(emailTemplateRevisions.version)).limit(1);
  return revision ?? null;
}

export async function listTemplateRevisions(userId: number, templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailTemplateRevisions).where(and(
    eq(emailTemplateRevisions.userId, userId),
    eq(emailTemplateRevisions.templateId, templateId),
  )).orderBy(desc(emailTemplateRevisions.version), desc(emailTemplateRevisions.createdAt));
}

export async function approveBilingualTemplateDraft(params: {
  userId: number;
  localizedRevisionId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [localized] = await db.select().from(emailTemplateRevisions).where(and(
    eq(emailTemplateRevisions.userId, params.userId),
    eq(emailTemplateRevisions.id, params.localizedRevisionId),
  )).limit(1);
  if (!localized || localized.status !== "draft") throw new Error("Template draft not found.");
  const now = Date.now();
  const revisionIds = [localized.id, localized.englishRevisionId].filter((id): id is number => Boolean(id));
  for (const revisionId of Array.from(new Set(revisionIds))) {
    await db.update(emailTemplateRevisions).set({
      status: "approved",
      approvedAt: now,
      approvedByUserId: params.userId,
    }).where(and(
      eq(emailTemplateRevisions.userId, params.userId),
      eq(emailTemplateRevisions.id, revisionId),
    ));
  }
  await db.update(emailTemplates).set({
    subject: localized.subject,
    body: localized.body,
    locale: localized.locale,
    activeRevisionId: localized.id,
    provenance: localized.provenance,
    approvedAt: now,
    updatedAt: new Date(),
  }).where(and(eq(emailTemplates.userId, params.userId), eq(emailTemplates.id, localized.templateId)));
  return { templateId: localized.templateId, activeRevisionId: localized.id, englishRevisionId: localized.englishRevisionId };
}

export async function getNextTemplateVersion(params: { userId: number; familyPublicId: string; locale: OutreachLocale }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select({ value: max(emailTemplateRevisions.version) }).from(emailTemplateRevisions).where(and(
    eq(emailTemplateRevisions.userId, params.userId),
    eq(emailTemplateRevisions.familyPublicId, params.familyPublicId),
    eq(emailTemplateRevisions.locale, params.locale),
  ));
  return Number(row?.value ?? 0) + 1;
}
