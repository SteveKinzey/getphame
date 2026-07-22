import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_HARD_DAILY_SEND_CEILING,
  ACCOUNT_HARD_HOURLY_SEND_CEILING,
  ADAPTIVE_SEND_HIGH_WARNING_THRESHOLD,
  ADAPTIVE_SEND_WARNING_THRESHOLD,
  buildAdaptiveSendPolicy,
  getAdaptiveSendRecommendedAction,
  getAdaptiveSendWarningLevel,
  type AdaptiveSendChannelDescriptor,
} from "../shared/adaptiveSendLimits";
import {
  AdaptiveSendLimitError,
  type AdaptiveSendStatus,
} from "./adaptiveSendLimits";
import { classifyPersonalSmtpProvider } from "./outboundDeliveryChannel";

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;
const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 6, 22, 12, 0, 0);

function channel(
  overrides: Partial<AdaptiveSendChannelDescriptor> = {},
): AdaptiveSendChannelDescriptor {
  return {
    key: "personal:1:gmail",
    type: "personal",
    providerId: "gmail",
    providerLabel: "Gmail",
    connectedAt: NOW,
    tier: "free",
    ...overrides,
  };
}

function status(overrides: Partial<AdaptiveSendStatus> = {}): AdaptiveSendStatus {
  return {
    configured: true,
    providerId: "gmail",
    providerLabel: "Gmail",
    channelType: "personal",
    rampStage: "established",
    connectionAgeDays: 30,
    todayCount: 10,
    hourCount: 2,
    providerTodayCount: 10,
    providerHourCount: 2,
    dailyLimit: 100,
    hourlyLimit: 20,
    hardDailyCeiling: ACCOUNT_HARD_DAILY_SEND_CEILING,
    hardHourlyCeiling: ACCOUNT_HARD_HOURLY_SEND_CEILING,
    dailyRemaining: 90,
    hourlyRemaining: 18,
    remaining: 18,
    utilization: 0.1,
    warningLevel: "normal",
    dailyResetAt: NOW + DAY_MS,
    hourlyResetAt: NOW + 3_600_000,
    recommendedAction: "upgrade_plan",
    ...overrides,
  };
}

function collectStringPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : collectStringPaths(child, path);
  });
}

function getByPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("adaptive send policy", () => {
  it("ramps a new Gmail connection conservatively before reaching provider limits", () => {
    expect(buildAdaptiveSendPolicy(channel(), NOW)).toMatchObject({
      rampStage: "new",
      connectionAgeDays: 0,
      hourlyLimit: 5,
      dailyLimit: 25,
    });

    expect(buildAdaptiveSendPolicy(channel({ connectedAt: NOW - 4 * DAY_MS }), NOW)).toMatchObject({
      rampStage: "warming",
      hourlyLimit: 10,
      dailyLimit: 50,
    });

    expect(buildAdaptiveSendPolicy(channel({ connectedAt: NOW - 10 * DAY_MS }), NOW)).toMatchObject({
      rampStage: "building",
      hourlyLimit: 15,
      dailyLimit: 75,
    });

    expect(buildAdaptiveSendPolicy(channel({ connectedAt: NOW - 30 * DAY_MS }), NOW)).toMatchObject({
      rampStage: "established",
      hourlyLimit: 20,
      dailyLimit: 100,
    });
  });

  it("applies a stricter warm-up curve to bulk relays without exceeding account ceilings", () => {
    const bulk = channel({
      key: "bulk:8:amazon_ses",
      type: "bulk",
      providerId: "amazon_ses",
      providerLabel: "Amazon SES",
      tier: "pro",
    });

    expect(buildAdaptiveSendPolicy(bulk, NOW)).toMatchObject({
      rampStage: "new",
      hourlyLimit: 25,
      dailyLimit: 150,
      hardHourlyCeiling: 300,
      hardDailyCeiling: 2_000,
    });

    expect(buildAdaptiveSendPolicy({ ...bulk, connectedAt: NOW - 30 * DAY_MS }, NOW)).toMatchObject({
      rampStage: "established",
      hourlyLimit: 250,
      dailyLimit: 1_500,
      hardHourlyCeiling: ACCOUNT_HARD_HOURLY_SEND_CEILING,
      hardDailyCeiling: ACCOUNT_HARD_DAILY_SEND_CEILING,
    });
  });

  it("uses conservative custom-SMTP defaults for unknown providers", () => {
    expect(buildAdaptiveSendPolicy(channel({
      providerId: "unknown_relay",
      connectedAt: NOW - 30 * DAY_MS,
    }), NOW)).toMatchObject({
      hourlyLimit: 15,
      dailyLimit: 75,
    });
  });

  it("escalates warnings at the configured thresholds and blocks at exhaustion", () => {
    expect(getAdaptiveSendWarningLevel(ADAPTIVE_SEND_WARNING_THRESHOLD - 0.01, 1)).toBe("normal");
    expect(getAdaptiveSendWarningLevel(ADAPTIVE_SEND_WARNING_THRESHOLD, 1)).toBe("approaching");
    expect(getAdaptiveSendWarningLevel(ADAPTIVE_SEND_HIGH_WARNING_THRESHOLD, 1)).toBe("high");
    expect(getAdaptiveSendWarningLevel(1, 1)).toBe("blocked");
    expect(getAdaptiveSendWarningLevel(0.2, 0)).toBe("blocked");
  });

  it("suggests paid Bulk Sender paths without allowing an upgrade to bypass safety", () => {
    expect(getAdaptiveSendRecommendedAction(channel())).toBe("upgrade_plan");
    expect(getAdaptiveSendRecommendedAction(channel({ tier: "pro" }))).toBe("connect_bulk_sender");
    expect(getAdaptiveSendRecommendedAction(channel({ type: "bulk", tier: "pro" }))).toBeNull();
  });
});

describe("outbound provider classification", () => {
  it("distinguishes personal Gmail from Google Workspace and classifies common relays", () => {
    expect(classifyPersonalSmtpProvider("smtp.gmail.com", "owner@gmail.com")).toEqual({ id: "gmail", label: "Gmail" });
    expect(classifyPersonalSmtpProvider("smtp.gmail.com", "owner@business.example")).toEqual({ id: "google_workspace", label: "Google Workspace" });
    expect(classifyPersonalSmtpProvider("smtp.office365.com", "owner@business.example").id).toBe("microsoft");
    expect(classifyPersonalSmtpProvider("smtp.unknown.example", "owner@business.example").id).toBe("custom_smtp");
  });
});

describe("adaptive limit errors", () => {
  it("returns retry metadata for the exhausted hourly window", () => {
    const error = new AdaptiveSendLimitError(status({
      hourlyRemaining: 0,
      remaining: 0,
      warningLevel: "blocked",
      hourlyResetAt: NOW + 90_000,
    }), NOW);

    expect(error.code).toBe("ADAPTIVE_SEND_LIMIT_REACHED");
    expect(error.retryAfterSeconds).toBe(90);
    expect(error.status.providerLabel).toBe("Gmail");
  });

  it("uses the daily reset when hourly capacity remains", () => {
    const error = new AdaptiveSendLimitError(status({
      dailyRemaining: 0,
      hourlyRemaining: 5,
      remaining: 0,
      warningLevel: "blocked",
      dailyResetAt: NOW + 7_200_000,
    }), NOW);

    expect(error.retryAfterSeconds).toBe(7_200);
  });
});

describe("adaptive sending production contracts", () => {
  const read = (relativePath: string) => readFileSync(join(PROJECT_ROOT, relativePath), "utf8");

  it("persists atomic provider and account windows with the required uniqueness invariant", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0024_harsh_kabuki.sql");
    const service = read("server/adaptiveSendLimits.ts");

    expect(schema).toContain('pgTable("outbound_send_limit_windows"');
    expect(migration).toContain("outbound_send_limit_scope_window_unique");
    expect(migration).toContain("outbound_send_limit_user_expiry_idx");
    expect(service).toContain("db.transaction");
    expect(service).toContain("onDuplicateKeyUpdate");
    expect(service).toContain("spec.limit - requested");
    expect(service).toContain("ACCOUNT_SCOPE_KEY");
  });

  it("enforces capacity at the mail boundary and maps public API exhaustion to HTTP 429", () => {
    const smtp = read("server/smtp.ts");
    const publicApi = read("server/publicApi.ts");
    const routers = read("server/routers.ts");

    expect(smtp).toContain("reserveAdaptiveSendCapacity");
    expect(smtp).toContain("resolveOutboundDeliveryChannel");
    expect(publicApi).toContain("instanceof AdaptiveSendLimitError");
    expect(publicApi).toContain("status(429)");
    expect(publicApi).toContain("retryAfterSeconds");
    expect(routers).toContain("getAdaptiveSendStatus");
    expect(routers).not.toContain("checkSendRateLimit");
  });

  it("surfaces the shared status card in Settings and both bulk customer workflows", () => {
    const component = read("client/src/components/AdaptiveSendLimitStatus.tsx");
    const settings = read("client/src/pages/Settings.tsx");
    const contacts = read("client/src/pages/SavedContacts.tsx");
    const woo = read("client/src/pages/WooCustomers.tsx");

    expect(component).toContain("Changing providers cannot bypass protection.");
    expect(component).toContain('href={status.recommendedAction === "upgrade_plan" ? "/upgrade" : "/settings#bulk-sender"}');
    expect(settings).toContain("<AdaptiveSendLimitStatus status={adaptiveSendStatus}");
    expect(contacts).toContain("<AdaptiveSendLimitStatus status={dailyStatus}");
    expect(woo).toContain("<AdaptiveSendLimitStatus status={dailyStatus}");
  });

  it("keeps every adaptive sending string complete in all seven maintained locales", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
    const english = JSON.parse(read("client/public/locales/en/translation.json")) as Record<string, unknown>;
    const paths = collectStringPaths(english.adaptiveSending, "adaptiveSending");

    expect(paths.length).toBeGreaterThanOrEqual(20);
    for (const locale of locales) {
      const bundle = JSON.parse(read(`client/public/locales/${locale}/translation.json`)) as Record<string, unknown>;
      for (const path of paths) {
        const value = getByPath(bundle, path);
        expect(value, `${locale} is missing ${path}`).toEqual(expect.any(String));
        expect((value as string).trim(), `${locale} has an empty ${path}`).not.toBe("");
      }
    }
  });
});
