import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  MAX_REVIEW_REQUEST_BODY_CHARS,
  MAX_REVIEW_REQUEST_SUBJECT_CHARS,
  replaceDirectYelpLinksWithInstruction,
} from "../shared/reviewRequestDraft";
import { invokeLLM } from "./_core/llm";

export const EMAIL_TONES = ["warmer", "professional", "concise"] as const;
export type EmailTone = (typeof EMAIL_TONES)[number];

export const emailToneAdjustmentInputSchema = z.object({
  subject: z.string().trim().min(1).max(MAX_REVIEW_REQUEST_SUBJECT_CHARS),
  body: z.string().trim().min(1).max(MAX_REVIEW_REQUEST_BODY_CHARS),
  tone: z.enum(EMAIL_TONES),
  businessName: z.string().trim().min(1).max(160),
});

const EMAIL_TONE_MODEL = "gpt-5-mini";
const REQUEST_WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 6;
const requestTimesByUser = new Map<number, number[]>();
const placeholderPattern = /\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}/g;
const urlPattern = /https?:\/\/[^\s<>"')\]]+/gi;
const secretPattern = /\b(?:password|passcode|api[\s_-]?key|secret|access[\s_-]?token|refresh[\s_-]?token)\s*[:=]\s*[^\s,;]{6,}/i;

type ToneAdjustmentInvoker = (request: Parameters<typeof invokeLLM>[0]) => ReturnType<typeof invokeLLM>;

function extractCompletionText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } => Boolean(part) && typeof part === "object" && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("\n");
}

function uniqueMatches(value: string, pattern: RegExp): string[] {
  return Array.from(new Set(value.match(pattern) ?? []));
}

function preservesRequiredFragments(source: string, rewritten: string, pattern: RegExp): boolean {
  const original = uniqueMatches(source, pattern);
  const returned = uniqueMatches(rewritten, pattern);
  return original.every((fragment) => returned.includes(fragment)) && returned.every((fragment) => original.includes(fragment));
}

export function enforceEmailToneAdjustmentRateLimit(userId: number, now = Date.now()): void {
  const recent = (requestTimesByUser.get(userId) ?? []).filter((timestamp) => now - timestamp < REQUEST_WINDOW_MS);
  if (recent.length >= REQUESTS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait a minute before adjusting another email.",
    });
  }
  recent.push(now);
  requestTimesByUser.set(userId, recent);

  if (requestTimesByUser.size > 5_000) {
    requestTimesByUser.forEach((timestamps, id) => {
      if (!timestamps.some((timestamp) => now - timestamp < REQUEST_WINDOW_MS)) requestTimesByUser.delete(id);
    });
  }
}

export function validateAdjustedReviewDraft(input: {
  sourceSubject: string;
  sourceBody: string;
  adjustedSubject: string;
  adjustedBody: string;
  businessName: string;
}): { subject: string; body: string } {
  const sourceSubject = replaceDirectYelpLinksWithInstruction(input.sourceSubject.trim(), input.businessName);
  const sourceBody = replaceDirectYelpLinksWithInstruction(input.sourceBody.trim(), input.businessName);
  const subject = replaceDirectYelpLinksWithInstruction(input.adjustedSubject.trim(), input.businessName);
  const body = replaceDirectYelpLinksWithInstruction(input.adjustedBody.trim(), input.businessName);

  const parsed = emailToneAdjustmentInputSchema.pick({ subject: true, body: true }).safeParse({ subject, body });
  if (!parsed.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The adjusted draft exceeded the allowed email limits." });
  }

  if (secretPattern.test(subject) || secretPattern.test(body)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The adjusted draft contains a private value and was not applied." });
  }

  const source = `${sourceSubject}\n${sourceBody}`;
  const adjusted = `${subject}\n${body}`;
  if (!preservesRequiredFragments(source, adjusted, placeholderPattern)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The adjusted draft did not preserve all required placeholders." });
  }
  if (!preservesRequiredFragments(source, adjusted, urlPattern)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The adjusted draft did not preserve all required links." });
  }

  return { subject, body };
}

export async function adjustEmailTone(input: z.infer<typeof emailToneAdjustmentInputSchema> & {
  userId: number;
  invoke?: ToneAdjustmentInvoker;
}): Promise<{ subject: string; body: string }> {
  const validated = emailToneAdjustmentInputSchema.parse(input);
  if (secretPattern.test(validated.subject) || secretPattern.test(validated.body)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Remove private values before using AI assistance." });
  }

  enforceEmailToneAdjustmentRateLimit(input.userId);
  const sourceSubject = replaceDirectYelpLinksWithInstruction(validated.subject, validated.businessName);
  const sourceBody = replaceDirectYelpLinksWithInstruction(validated.body, validated.businessName);
  const invoke = input.invoke ?? invokeLLM;

  try {
    const response = await invoke({
      model: EMAIL_TONE_MODEL,
      maxCompletionTokens: 1_200,
      reasoning: { effort: "minimal" },
      messages: [
        {
          role: "system",
          content: `You rewrite a single Get Phame review-request email for tone only. Return JSON matching the provided schema. Make it ${validated.tone}; do not change the intended request, recipient facts, business identity, review links, or required placeholders. Preserve every {{placeholder}} and every URL exactly. Do not add ratings, testimonials, incentives, discounts, urgency, false claims, legal claims, fabricated customer experiences, or new contact details. Yelp must remain a plain-language search instruction, never a direct Yelp link. Keep the message compliant, individual, respectful, and opt-out friendly.`,
        },
        {
          role: "user",
          content: JSON.stringify({ subject: sourceSubject, body: sourceBody }),
        },
      ],
      outputSchema: {
        name: "get_phame_tone_adjustment",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["subject", "body"],
          properties: {
            subject: { type: "string", minLength: 1, maxLength: MAX_REVIEW_REQUEST_SUBJECT_CHARS },
            body: { type: "string", minLength: 1, maxLength: MAX_REVIEW_REQUEST_BODY_CHARS },
          },
        },
      },
    });

    const content = extractCompletionText(response.choices[0]?.message?.content);
    const result = z.object({ subject: z.string(), body: z.string() }).safeParse(JSON.parse(content));
    if (!result.success) throw new Error("Invalid structured response");

    return validateAdjustedReviewDraft({
      sourceSubject,
      sourceBody,
      adjustedSubject: result.data.subject,
      adjustedBody: result.data.body,
      businessName: validated.businessName,
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.warn("[Email tone adjustment] Failed to produce a safe rewrite.", error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not adjust this email right now. Please try again." });
  }
}
