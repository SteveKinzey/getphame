import { z } from "zod";

import { invokeLLM } from "./_core/llm";

const STEP_ORDER = ["email", "platform", "contacts", "send"] as const;
type OnboardingStepKey = (typeof STEP_ORDER)[number];

const STEP_LABELS: Record<OnboardingStepKey, string> = {
  email: "Connect email",
  platform: "Add platform",
  contacts: "Import contacts",
  send: "First send",
};

const SUGGESTIONS: Record<OnboardingStepKey, string> = {
  email: "Potential improvement: clarify the preferred email provider path and surface the App Password guide beside the connect action.",
  platform: "Potential improvement: reduce decision friction by making the recommended review platform obvious and showing one concise example.",
  contacts: "Potential improvement: offer a one-click import path and explain the minimum contact fields required before users leave the dashboard.",
  send: "Potential improvement: show a short pre-send checklist and a clear preview so users understand the outcome before launching their first request.",
};

export type OnboardingFunnelStep = {
  shown: number;
  actioned: number;
  dropOff: number;
  continuationRate: number;
};

export type OnboardingFunnelInsightInput = {
  currentWindowDays: number;
  current: Record<OnboardingStepKey, OnboardingFunnelStep>;
  previous: Record<OnboardingStepKey, OnboardingFunnelStep>;
};

const generatedInsightSchema = z.object({
  observation: z.string().trim().min(1).max(260),
  recommendation: z.string().trim().min(1).max(260),
}).strict();

function asDropOffRate(step: OnboardingFunnelStep): number {
  return step.shown > 0 ? Math.round((step.dropOff / step.shown) * 1000) / 10 : 0;
}

function selectHighestDropOff(input: OnboardingFunnelInsightInput) {
  return STEP_ORDER
    .map((key) => ({
      key,
      label: STEP_LABELS[key],
      current: input.current[key],
      previous: input.previous[key],
      currentDropOffRate: asDropOffRate(input.current[key]),
      previousDropOffRate: asDropOffRate(input.previous[key]),
    }))
    .sort((left, right) => right.currentDropOffRate - left.currentDropOffRate || right.current.dropOff - left.current.dropOff)[0];
}

export function buildOnboardingFunnelInsightFallback(input: OnboardingFunnelInsightInput) {
  const highest = selectHighestDropOff(input);
  const delta = Math.round((highest.currentDropOffRate - highest.previousDropOffRate) * 10) / 10;
  const hasData = highest.current.shown > 0;
  return {
    source: "fallback" as const,
    highestDropOff: {
      step: highest.key,
      label: highest.label,
      rate: highest.currentDropOffRate,
      delta,
      shown: highest.current.shown,
      dropOff: highest.current.dropOff,
    },
    observation: hasData
      ? `${highest.label} has the highest current drop-off rate at ${highest.currentDropOffRate}%, based on ${highest.current.shown} unique accounts that viewed this step.`
      : "There is not yet enough setup-step activity in this period to identify a meaningful drop-off point.",
    recommendation: hasData
      ? SUGGESTIONS[highest.key]
      : "Collect more setup activity before changing the flow; the current view intentionally does not infer a bottleneck from missing data.",
  };
}

function extractCompletionText(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

/**
 * Produces a concise operator insight from aggregate funnel counts only. The
 * deterministic highest-drop-off statistic is calculated locally; the model
 * may only phrase an observation and recommendation from that safe input.
 */
export async function generateOnboardingFunnelInsight(input: OnboardingFunnelInsightInput) {
  const fallback = buildOnboardingFunnelInsightFallback(input);
  if (fallback.highestDropOff.shown === 0) return fallback;

  try {
    const aggregateInput = {
      reportingWindowDays: input.currentWindowDays,
      highestDropOff: fallback.highestDropOff,
      current: STEP_ORDER.map((key) => ({
        step: STEP_LABELS[key],
        shown: input.current[key].shown,
        continued: input.current[key].actioned,
        dropOff: input.current[key].dropOff,
        dropOffRate: asDropOffRate(input.current[key]),
      })),
      previous: STEP_ORDER.map((key) => ({
        step: STEP_LABELS[key],
        shown: input.previous[key].shown,
        continued: input.previous[key].actioned,
        dropOff: input.previous[key].dropOff,
        dropOffRate: asDropOffRate(input.previous[key]),
      })),
    };
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a SaaS product analytics assistant. Use only the aggregate numbers supplied by the user. Do not infer causation, invent facts, mention individual users, or claim statistical significance. Return one concise observation and one practical UX recommendation. The recommendation must be framed as a testable potential improvement, not a certainty.",
        },
        {
          role: "user",
          content: `Summarize this aggregate onboarding funnel safely:\n${JSON.stringify(aggregateInput)}`,
        },
      ],
      outputSchema: {
        name: "onboarding_funnel_insight",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["observation", "recommendation"],
          properties: {
            observation: { type: "string", maxLength: 260 },
            recommendation: { type: "string", maxLength: 260 },
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return fallback;
    const generated = generatedInsightSchema.safeParse(JSON.parse(extractCompletionText(content)));
    if (!generated.success) return fallback;
    return { ...fallback, source: "ai" as const, ...generated.data };
  } catch (error) {
    console.warn("[Onboarding funnel insight] AI summary unavailable; using aggregate fallback.", error instanceof Error ? error.message : error);
    return fallback;
  }
}
