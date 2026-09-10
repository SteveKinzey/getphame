import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { SavedContact } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

export const CONTACT_SEARCH_LOCALES = [
  "en",
  "zh-CN",
  "es",
  "fr",
  "it",
  "th",
  "zh-TW",
] as const;
export const CONTACT_SEARCH_SOURCES = [
  "manual",
  "woocommerce",
  "stripe",
  "koalendar",
  "api",
] as const;
export const CONTACT_SEARCH_RESULT_LIMIT = 200;

const CONTACT_SEARCH_MODEL = "gpt-5-mini";
const REQUEST_WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 10;
const requestTimesByUser = new Map<number, number[]>();

const nullableText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    value => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    "Invalid date"
  );

export const contactSearchFiltersSchema = z
  .object({
    text: nullableText(120),
    source: z.enum(CONTACT_SEARCH_SOURCES).nullable(),
    tag: nullableText(50),
    sentState: z.enum(["any", "never", "sent", "dormant"]),
    dormantDays: z.number().int().min(1).max(3650).nullable(),
    consent: z.enum(["any", "recorded", "missing"]),
    suppression: z.enum(["any", "active", "opted_out"]),
    createdFrom: isoDate.nullable(),
    createdTo: isoDate.nullable(),
    sort: z.enum([
      "relevance",
      "name_asc",
      "last_sent_oldest",
      "last_sent_newest",
      "created_newest",
    ]),
  })
  .strict()
  .superRefine((filters, context) => {
    if (filters.sentState === "dormant" && filters.dormantDays === null) {
      context.addIssue({
        code: "custom",
        path: ["dormantDays"],
        message: "Dormant searches require a day count",
      });
    }
    if (
      filters.createdFrom &&
      filters.createdTo &&
      filters.createdFrom > filters.createdTo
    ) {
      context.addIssue({
        code: "custom",
        path: ["createdTo"],
        message: "The end date must not precede the start date",
      });
    }
  });

export type ContactSearchFilters = z.infer<typeof contactSearchFiltersSchema>;

const defaultFilters = (): ContactSearchFilters => ({
  text: null,
  source: null,
  tag: null,
  sentState: "any",
  dormantDays: null,
  consent: "any",
  suppression: "any",
  createdFrom: null,
  createdTo: null,
  sort: "relevance",
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

const SEARCH_SECRET_PATTERNS = [
  /\b(?:password|passcode|api[\s_-]?key|secret|access[\s_-]?token|refresh[\s_-]?token)\s*[:=]\s*[^\s,;]{6,}/gi,
  /\b(?:bearer\s+)?gp_(?:live|test)_[a-z0-9._-]{8,}\b/gi,
  /\b(?:sk|pk)_(?:live|test)_[a-z0-9._-]{8,}\b/gi,
];

export function redactContactSearchSecrets(query: string): {
  text: string;
  redacted: boolean;
} {
  let text = query;
  for (const pattern of SEARCH_SECRET_PATTERNS)
    text = text.replace(pattern, "[private value removed]");
  return { text, redacted: text !== query };
}

export function enforceContactSearchRateLimit(userId: number): void {
  const now = Date.now();
  const recent = (requestTimesByUser.get(userId) ?? []).filter(
    timestamp => now - timestamp < REQUEST_WINDOW_MS
  );
  if (recent.length >= REQUESTS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "Please wait a minute before running another conversational search.",
    });
  }
  recent.push(now);
  requestTimesByUser.set(userId, recent);

  if (requestTimesByUser.size > 5_000) {
    requestTimesByUser.forEach((timestamps: number[], actor: number) => {
      if (
        !timestamps.some(
          (timestamp: number) => now - timestamp < REQUEST_WINDOW_MS
        )
      )
        requestTimesByUser.delete(actor);
    });
  }
}

function durationToDays(value: number, unit: string): number {
  if (/week/i.test(unit)) return value * 7;
  if (/month/i.test(unit)) return value * 30;
  return value;
}

function extractFallbackText(
  query: string,
  hasStructuredFilter: boolean
): string | null {
  const quoted = query.match(/["“”']([^"“”']{1,120})["“”']/)?.[1]?.trim();
  if (quoted) return quoted;

  const email = query.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
  if (email) return email;

  const cleaned = query
    .replace(
      /\b(manual|woocommerce|woo\s*commerce|stripe|koalendar|api|unsubscribed|opted\s*out|active|consent(?:ed)?|never\s+(?:(?:been\s+)?(?:sent|contacted)|received\s+(?:a\s+)?(?:review\s+)?request)|sent|contacted|oldest|newest|alphabetical)\b/gi,
      " "
    )
    .replace(
      /\b(show|find|search|give|list|display|me|all|contacts?|customers?|people|records?|who|that|are|were|have|has|been|with|without|from|source|imported|tagged|tag|and|or|please|not|in|for|during|last|past|at|least|once|recorded|confirmed|affirmative|missing|received|review|requests?|added|created|after|before|since|a|an|the)\b/gi,
      " "
    )
    .replace(/\b\d+\s*(?:d|day|days|week|weeks|month|months)\b/gi, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 2 && cleaned.length <= 120) return cleaned;
  return hasStructuredFilter ? null : query.slice(0, 120);
}

export function parseContactSearchFallback(
  query: string
): ContactSearchFilters {
  const normalized = query.toLocaleLowerCase();
  const filters = defaultFilters();
  let hasStructuredFilter = false;

  if (/\bstripe\b/.test(normalized)) filters.source = "stripe";
  else if (/\bwoo\s*commerce\b|\bwoocommerce\b/.test(normalized))
    filters.source = "woocommerce";
  else if (/\bkoalendar\b/.test(normalized)) filters.source = "koalendar";
  else if (/\bapi\b/.test(normalized)) filters.source = "api";
  else if (/\bmanual(?:ly)?\b/.test(normalized)) filters.source = "manual";
  if (filters.source) hasStructuredFilter = true;

  const tagMatch = query
    .match(/\b(?:tagged|tag)\s+(?:as\s+)?["“”']?([^,"“”']{1,50})["“”']?/i)?.[1]
    ?.trim();
  if (tagMatch) {
    filters.tag = tagMatch.replace(/\s+(?:and|or)\s+.*$/i, "").trim();
    hasStructuredFilter = true;
  }

  if (/\b(unsubscribed|opted\s*out|suppressed)\b/.test(normalized)) {
    filters.suppression = "opted_out";
    hasStructuredFilter = true;
  } else if (
    /\bactive\s+(?:contacts?|customers?)\b|\bnot\s+(?:unsubscribed|opted\s*out)\b/.test(
      normalized
    )
  ) {
    filters.suppression = "active";
    hasStructuredFilter = true;
  }

  if (/\b(without|missing|no)\s+(?:recorded\s+)?consent\b/.test(normalized)) {
    filters.consent = "missing";
    hasStructuredFilter = true;
  } else if (
    /\b(with|recorded|confirmed|affirmative)\s+consent\b|\bconsented\b/.test(
      normalized
    )
  ) {
    filters.consent = "recorded";
    hasStructuredFilter = true;
  }

  if (
    /\bnever\s+(?:(?:been\s+)?(?:sent|contacted)|received\s+(?:a\s+)?(?:review\s+)?request)\b|\bnot\s+contacted\s+before\b/.test(
      normalized
    )
  ) {
    filters.sentState = "never";
    hasStructuredFilter = true;
  } else if (
    /\b(?:sent|contacted)\s+(?:at\s+least\s+once|before)\b/.test(normalized)
  ) {
    filters.sentState = "sent";
    hasStructuredFilter = true;
  }

  const dormantMatch = normalized.match(
    /(?:not\s+(?:sent|contacted)|haven't\s+(?:sent|contacted)|hasn't\s+been\s+contacted|inactive|dormant).*?(\d{1,4})\s*(d|day|days|week|weeks|month|months)\b/
  );
  if (dormantMatch) {
    filters.sentState = "dormant";
    filters.dormantDays = Math.min(
      3650,
      Math.max(1, durationToDays(Number(dormantMatch[1]), dormantMatch[2]))
    );
    hasStructuredFilter = true;
  }

  const afterDate = normalized.match(
    /\b(?:added|created)\s+(?:after|since)\s+(\d{4}-\d{2}-\d{2})\b/
  )?.[1];
  const beforeDate = normalized.match(
    /\b(?:added|created)\s+before\s+(\d{4}-\d{2}-\d{2})\b/
  )?.[1];
  if (afterDate && !Number.isNaN(Date.parse(`${afterDate}T00:00:00.000Z`))) {
    filters.createdFrom = afterDate;
    hasStructuredFilter = true;
  }
  if (beforeDate && !Number.isNaN(Date.parse(`${beforeDate}T00:00:00.000Z`))) {
    filters.createdTo = beforeDate;
    hasStructuredFilter = true;
  }

  if (/\b(?:alphabetical|by\s+name)\b/.test(normalized))
    filters.sort = "name_asc";
  else if (/\boldest\s+(?:sent|contacted|contact)\b/.test(normalized))
    filters.sort = "last_sent_oldest";
  else if (/\bnewest\s+(?:sent|contacted|contact)\b/.test(normalized))
    filters.sort = "last_sent_newest";
  else if (/\bnewest\s+(?:added|created|contacts?)\b/.test(normalized))
    filters.sort = "created_newest";

  filters.text = extractFallbackText(query, hasStructuredFilter);
  return contactSearchFiltersSchema.parse(filters);
}

type ContactSearchInvoker = (
  request: Parameters<typeof invokeLLM>[0]
) => ReturnType<typeof invokeLLM>;

export async function interpretContactSearchQuery(input: {
  query: string;
  locale: (typeof CONTACT_SEARCH_LOCALES)[number];
  invoke?: ContactSearchInvoker;
  now?: Date;
}): Promise<{
  filters: ContactSearchFilters;
  source: "llm" | "fallback";
  redacted: boolean;
}> {
  const sanitized = redactContactSearchSecrets(input.query.trim());
  const invoke = input.invoke ?? invokeLLM;
  const currentDate = (input.now ?? new Date()).toISOString().slice(0, 10);

  try {
    const response = await invoke({
      model: CONTACT_SEARCH_MODEL,
      maxCompletionTokens: 500,
      reasoning: { effort: "minimal" },
      messages: [
        {
          role: "system",
          content: `Convert one authenticated Get Phame user's contact-search request into the supplied closed JSON filter schema. The current UTC date is ${currentDate}; the request locale is ${input.locale}. You receive only the user's query and never receive contact records. Do not invent names, email addresses, tags, sources, dates, or account facts. Put literal customer-identifying text needed for matching in text. Use null when a filter is absent. For relative inactivity, use sentState=dormant and convert the duration to whole days from 1 through 3650. For "never contacted", use sentState=never and dormantDays=null. Return only schema-valid JSON.`,
        },
        { role: "user", content: sanitized.text },
      ],
      outputSchema: {
        name: "get_phame_contact_search_filters",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "text",
            "source",
            "tag",
            "sentState",
            "dormantDays",
            "consent",
            "suppression",
            "createdFrom",
            "createdTo",
            "sort",
          ],
          properties: {
            text: {
              anyOf: [
                { type: "string", minLength: 1, maxLength: 120 },
                { type: "null" },
              ],
            },
            source: {
              anyOf: [
                { type: "string", enum: CONTACT_SEARCH_SOURCES },
                { type: "null" },
              ],
            },
            tag: {
              anyOf: [
                { type: "string", minLength: 1, maxLength: 50 },
                { type: "null" },
              ],
            },
            sentState: {
              type: "string",
              enum: ["any", "never", "sent", "dormant"],
            },
            dormantDays: {
              anyOf: [
                { type: "integer", minimum: 1, maximum: 3650 },
                { type: "null" },
              ],
            },
            consent: { type: "string", enum: ["any", "recorded", "missing"] },
            suppression: {
              type: "string",
              enum: ["any", "active", "opted_out"],
            },
            createdFrom: {
              anyOf: [
                { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                { type: "null" },
              ],
            },
            createdTo: {
              anyOf: [
                { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                { type: "null" },
              ],
            },
            sort: {
              type: "string",
              enum: [
                "relevance",
                "name_asc",
                "last_sent_oldest",
                "last_sent_newest",
                "created_newest",
              ],
            },
          },
        },
      },
    });

    const text = extractCompletionText(response.choices[0]?.message?.content);
    const parsed = contactSearchFiltersSchema.safeParse(JSON.parse(text));
    if (parsed.success)
      return {
        filters: parsed.data,
        source: "llm",
        redacted: sanitized.redacted,
      };
  } catch (error) {
    console.warn(
      "[Contact search] Structured interpretation unavailable; using deterministic fallback.",
      error instanceof Error ? error.message : error
    );
  }

  return {
    filters: parseContactSearchFallback(sanitized.text),
    source: "fallback",
    redacted: sanitized.redacted,
  };
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function epoch(value: Date | number | null): number | null {
  if (value === null) return null;
  const milliseconds = value instanceof Date ? value.getTime() : value;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function contactText(contact: SavedContact): string {
  return [
    contact.name,
    contact.email,
    contact.phone,
    contact.notes,
    contact.sourceApp,
    ...parseTags(contact.tags),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function relevanceScore(contact: SavedContact, text: string | null): number {
  if (!text) return 0;
  const term = text.toLocaleLowerCase();
  const tags = parseTags(contact.tags).map(tag => tag.toLocaleLowerCase());
  let score = 0;
  if (contact.name.toLocaleLowerCase() === term) score += 12;
  else if (contact.name.toLocaleLowerCase().includes(term)) score += 8;
  if (contact.email.toLocaleLowerCase() === term) score += 12;
  else if (contact.email.toLocaleLowerCase().includes(term)) score += 7;
  if (tags.some(tag => tag === term)) score += 6;
  if (contactText(contact).includes(term)) score += 2;
  return score;
}

export function filterContactsByNaturalQuery(
  contacts: SavedContact[],
  filters: ContactSearchFilters,
  nowMs = Date.now()
) {
  const term = filters.text?.toLocaleLowerCase() ?? null;
  const createdFrom = filters.createdFrom
    ? Date.parse(`${filters.createdFrom}T00:00:00.000Z`)
    : null;
  const createdTo = filters.createdTo
    ? Date.parse(`${filters.createdTo}T23:59:59.999Z`)
    : null;
  const dormantCutoff =
    filters.sentState === "dormant" && filters.dormantDays
      ? nowMs - filters.dormantDays * 86_400_000
      : null;

  const matches = contacts.filter(contact => {
    if (term && !contactText(contact).includes(term)) return false;
    if (filters.source && contact.source !== filters.source) return false;
    if (
      filters.tag &&
      !parseTags(contact.tags).some(
        tag => tag.toLocaleLowerCase() === filters.tag!.toLocaleLowerCase()
      )
    )
      return false;
    if (
      filters.sentState === "never" &&
      !(contact.lastSentAt === null || contact.totalSent === 0)
    )
      return false;
    if (
      filters.sentState === "sent" &&
      contact.lastSentAt === null &&
      contact.totalSent === 0
    )
      return false;
    if (
      filters.sentState === "dormant" &&
      !(contact.lastSentAt === null || contact.lastSentAt < dormantCutoff!)
    )
      return false;
    const hasRecordedConsent =
      Boolean(contact.consentBasis?.trim()) &&
      contact.consentCapturedAt !== null;
    if (filters.consent === "recorded" && !hasRecordedConsent) return false;
    if (filters.consent === "missing" && hasRecordedConsent) return false;
    if (filters.suppression === "active" && Boolean(contact.optedOut))
      return false;
    if (filters.suppression === "opted_out" && !contact.optedOut) return false;
    const createdAt = epoch(contact.createdAt);
    if (createdFrom !== null && (createdAt === null || createdAt < createdFrom))
      return false;
    if (createdTo !== null && (createdAt === null || createdAt > createdTo))
      return false;
    return true;
  });

  matches.sort((left, right) => {
    if (filters.sort === "name_asc")
      return (
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }) || left.id - right.id
      );
    if (filters.sort === "last_sent_oldest")
      return (
        (left.lastSentAt ?? Number.NEGATIVE_INFINITY) -
          (right.lastSentAt ?? Number.NEGATIVE_INFINITY) || left.id - right.id
      );
    if (filters.sort === "last_sent_newest")
      return (
        (right.lastSentAt ?? Number.NEGATIVE_INFINITY) -
          (left.lastSentAt ?? Number.NEGATIVE_INFINITY) || left.id - right.id
      );
    if (filters.sort === "created_newest")
      return (
        (epoch(right.createdAt) ?? 0) - (epoch(left.createdAt) ?? 0) ||
        right.id - left.id
      );
    return (
      relevanceScore(right, filters.text) -
        relevanceScore(left, filters.text) ||
      (epoch(right.updatedAt) ?? 0) - (epoch(left.updatedAt) ?? 0) ||
      right.id - left.id
    );
  });

  return matches;
}

export function toContactSearchResult(contact: SavedContact) {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes,
    lastSentAt: contact.lastSentAt,
    totalSent: contact.totalSent,
    tags: contact.tags,
    source: contact.source,
    sourceApp: contact.sourceApp,
    consentBasis: contact.consentBasis,
    consentCapturedAt: contact.consentCapturedAt,
    optedOut: contact.optedOut,
    createdAt: epoch(contact.createdAt),
  };
}

export async function runNaturalContactSearch(input: {
  query: string;
  locale: (typeof CONTACT_SEARCH_LOCALES)[number];
  contacts: SavedContact[];
  invoke?: ContactSearchInvoker;
  now?: Date;
}) {
  const interpretation = await interpretContactSearchQuery(input);
  const matches = filterContactsByNaturalQuery(
    input.contacts,
    interpretation.filters,
    input.now?.getTime()
  );
  return {
    ...interpretation,
    totalContacts: input.contacts.length,
    matchedCount: matches.length,
    truncated: matches.length > CONTACT_SEARCH_RESULT_LIMIT,
    results: matches
      .slice(0, CONTACT_SEARCH_RESULT_LIMIT)
      .map(toContactSearchResult),
  };
}
