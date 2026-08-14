import { desc, eq } from "drizzle-orm";
import { smtpTestEmailAttempts } from "../drizzle/schema";
import { getDb } from "./db";

const MAX_HISTORY_ROWS = 12;

export function maskDiagnosticRecipient(email: string): string {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return "hidden recipient";
  const prefix = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${prefix}***@${domain}`;
}

function sanitizeDiagnosticError(error?: string): string | null {
  if (!error) return null;
  return error.replace(/[\r\n]+/g, " ").slice(0, 500);
}

export async function recordSmtpTestEmailAttempt(input: {
  userId: number;
  recipient: string;
  ok: boolean;
  error?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(smtpTestEmailAttempts).values({
    userId: input.userId,
    recipientMasked: maskDiagnosticRecipient(input.recipient),
    outcome: input.ok ? "ok" : "fail",
    errorSummary: input.ok ? null : sanitizeDiagnosticError(input.error),
    attemptedAt: Date.now(),
  });
}

export async function listSmtpTestEmailAttempts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: smtpTestEmailAttempts.id,
      recipientMasked: smtpTestEmailAttempts.recipientMasked,
      outcome: smtpTestEmailAttempts.outcome,
      errorSummary: smtpTestEmailAttempts.errorSummary,
      attemptedAt: smtpTestEmailAttempts.attemptedAt,
    })
    .from(smtpTestEmailAttempts)
    .where(eq(smtpTestEmailAttempts.userId, userId))
    .orderBy(desc(smtpTestEmailAttempts.attemptedAt))
    .limit(MAX_HISTORY_ROWS);
}
