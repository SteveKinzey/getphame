import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import {
  redactHelpQuestion,
  retrieveHelpSources,
} from "./helpAssistantKnowledge";

const SUPPORTED_LANGUAGES = [
  "en",
  "zh-CN",
  "es",
  "fr",
  "it",
  "th",
  "zh-TW",
] as const;
const HELP_MODEL = "gpt-5-mini";
const REQUEST_WINDOW_MS = 60_000;
const AUTHENTICATED_REQUESTS_PER_WINDOW = 8;
const ANONYMOUS_REQUESTS_PER_WINDOW = 4;
const ANONYMOUS_KEY_SALT = randomBytes(24).toString("hex");
const requestTimesByActor = new Map<string, number[]>();

const generatedAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(1800),
  citationIds: z.array(z.string()).max(4),
  confidence: z.enum(["high", "medium", "low"]),
  shouldEscalate: z.boolean(),
});

function extractCompletionText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        Boolean(part) &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
    )
    .map(part => part.text)
    .join("\n");
}

export function createHelpAssistantActorKey(input: {
  userId: number | null;
  ip?: string;
  userAgent?: string;
}): { key: string; limit: number } {
  if (input.userId != null) {
    return {
      key: `user:${input.userId}`,
      limit: AUTHENTICATED_REQUESTS_PER_WINDOW,
    };
  }

  const anonymousFingerprint = createHash("sha256")
    .update(ANONYMOUS_KEY_SALT)
    .update("\0")
    .update(input.ip || "unknown-ip")
    .update("\0")
    .update(input.userAgent || "unknown-agent")
    .digest("hex")
    .slice(0, 32);

  return {
    key: `anonymous:${anonymousFingerprint}`,
    limit: ANONYMOUS_REQUESTS_PER_WINDOW,
  };
}

function enforceAssistantRateLimit(actorKey: string, limit: number): void {
  const now = Date.now();
  const recent = (requestTimesByActor.get(actorKey) ?? []).filter(
    timestamp => now - timestamp < REQUEST_WINDOW_MS
  );
  if (recent.length >= limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait a minute before asking another help question.",
    });
  }
  recent.push(now);
  requestTimesByActor.set(actorKey, recent);
}

function unknownAnswer(redacted: boolean) {
  return {
    answer:
      "I could not find a reliable answer in the approved Get Phame help sources. Please open a support request so a person can review the details.",
    citations: [] as Array<{ id: string; title: string; href: string }>,
    confidence: "low" as const,
    shouldEscalate: true,
    redacted,
    source: "fallback" as const,
  };
}

export async function answerHelpQuestion(input: {
  question: string;
  language: (typeof SUPPORTED_LANGUAGES)[number];
}) {
  const sanitized = redactHelpQuestion(input.question);
  const sources = retrieveHelpSources(sanitized.text);
  if (sources.length === 0) return unknownAnswer(sanitized.redacted);

  const sourceText = sources
    .map(
      (source, index) =>
        `[S${index + 1}] ${source.title}\nURL: ${source.href}\n${source.content}`
    )
    .join("\n\n");
  const allowedIds = new Map(
    sources.map((source, index) => [`S${index + 1}`, source])
  );

  try {
    const response = await invokeLLM({
      model: HELP_MODEL,
      maxCompletionTokens: 900,
      reasoning: { effort: "minimal" },
      messages: [
        {
          role: "system",
          content: `You are the in-app Get Phame product help assistant. Answer only from the supplied approved sources. Do not use outside knowledge or infer account state. Use language ${input.language}. Never request, reproduce, or transform passwords, API keys, tokens, payment details, customer lists, private review content, or other secrets. Compliance information is general product guidance, not legal advice. If the sources are insufficient, say so, set confidence to low, and recommend human support. Keep the answer concise and operational. Return only the requested JSON.`,
        },
        {
          role: "user",
          content: `QUESTION:\n${sanitized.text}\n\nAPPROVED SOURCES:\n${sourceText}`,
        },
      ],
      outputSchema: {
        name: "get_phame_help_answer",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["answer", "citationIds", "confidence", "shouldEscalate"],
          properties: {
            answer: { type: "string", maxLength: 1800 },
            citationIds: {
              type: "array",
              maxItems: 4,
              items: { type: "string" },
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            shouldEscalate: { type: "boolean" },
          },
        },
      },
    });
    const content = extractCompletionText(
      response.choices[0]?.message?.content
    );
    const generated = generatedAnswerSchema.safeParse(JSON.parse(content));
    if (!generated.success) return unknownAnswer(sanitized.redacted);

    const citations = Array.from(new Set(generated.data.citationIds))
      .map(id => ({ id, source: allowedIds.get(id) }))
      .filter(
        (entry): entry is { id: string; source: (typeof sources)[number] } =>
          Boolean(entry.source)
      )
      .map(({ id, source }) => ({
        id,
        title: source.title,
        href: source.href,
      }));
    if (citations.length === 0 || generated.data.confidence === "low")
      return unknownAnswer(sanitized.redacted);

    return {
      answer: generated.data.answer,
      citations,
      confidence: generated.data.confidence,
      shouldEscalate: generated.data.shouldEscalate,
      redacted: sanitized.redacted,
      source: "grounded" as const,
    };
  } catch (error) {
    console.warn(
      "[Help assistant] Grounded response unavailable; using safe fallback.",
      error instanceof Error ? error.message : error
    );
    return unknownAnswer(sanitized.redacted);
  }
}

export const helpAssistantRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().trim().min(3).max(600),
        language: z.enum(SUPPORTED_LANGUAGES).default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = createHelpAssistantActorKey({
        userId: ctx.user?.id ?? null,
        ip: ctx.req.ip,
        userAgent: ctx.req.get("user-agent") ?? undefined,
      });
      enforceAssistantRateLimit(actor.key, actor.limit);
      return answerHelpQuestion(input);
    }),
});
