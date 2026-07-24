import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { answerHelpQuestion } from "./helpAssistant";
import { redactHelpQuestion, retrieveHelpSources, tokenizeHelpQuery } from "./helpAssistantKnowledge";

const projectRoot = resolve(import.meta.dirname, "..");

describe("grounded help assistant", () => {
  it("retrieves approved email connection guidance for provider questions", () => {
    const sources = retrieveHelpSources("How do I connect Gmail with an app password?");
    expect(sources[0]?.id).toBe("email-connection");
    expect(sources[0]?.href).toBe("/settings");
    expect(sources[0]?.content).toContain("never paste a password");
  });

  it("retrieves high-risk Yelp compliance guidance without review gating", () => {
    const sources = retrieveHelpSources("Can I ask only happy customers for a Yelp review?");
    const compliance = sources.find((source) => source.id === "platform-compliance");
    expect(compliance?.content).toContain("does not support review gating");
    expect(compliance?.content).toContain("Yelp discourages businesses from soliciting reviews");
  });

  it("retrieves the developer workspace for webhook and API questions", () => {
    const sources = retrieveHelpSources("Where do I rotate my webhook API key?");
    expect(sources.some((source) => source.id === "developer-integrations")).toBe(true);
  });

  it("supports Unicode search terms used by localized quick questions", () => {
    expect(tokenizeHelpQuery("ฉันจะเชื่อมต่ออีเมลได้อย่างไร").join(" ")).toContain("เชื่อมต่อ");
    expect(retrieveHelpSources("ฉันจะเชื่อมต่ออีเมลได้อย่างไร").some((source) => source.id === "email-connection")).toBe(true);
    expect(retrieveHelpSources("如何连接我的邮箱？").some((source) => source.id === "email-connection")).toBe(true);
  });

  it("redacts secrets, email addresses, and phone-like private values before model processing", () => {
    const result = redactHelpQuestion("password: super-secret-123 email me at owner@example.com or +1 (555) 123-4567");
    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("super-secret-123");
    expect(result.text).not.toContain("owner@example.com");
    expect(result.text).not.toContain("555");
    expect(result.text.match(/\[private value removed\]/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("does not call the model when approved sources cannot answer and escalates safely", async () => {
    const result = await answerHelpQuestion({ question: "quantum banana astrophysics", language: "en" });
    expect(result.source).toBe("fallback");
    expect(result.confidence).toBe("low");
    expect(result.shouldEscalate).toBe(true);
    expect(result.citations).toEqual([]);
  });

  it("uses authenticated server access and exposes citations, privacy, and secure escalation in the client", () => {
    const routerSource = readFileSync(resolve(projectRoot, "server/helpAssistant.ts"), "utf8");
    const appRouterSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
    const componentSource = readFileSync(resolve(projectRoot, "client/src/components/HelpAssistant.tsx"), "utf8");
    const layoutSource = readFileSync(resolve(projectRoot, "client/src/components/AppLayout.tsx"), "utf8");
    const supportSource = readFileSync(resolve(projectRoot, "client/src/components/landing/SupportDialog.tsx"), "utf8");

    expect(routerSource).toContain("ask: protectedProcedure");
    expect(routerSource).toContain("enforceAssistantRateLimit(ctx.user.id)");
    expect(routerSource).toContain('model: HELP_MODEL');
    expect(appRouterSource).toContain("helpAssistant: helpAssistantRouter");
    expect(componentSource).toContain("result.citations");
    expect(componentSource).toContain("Questions are not saved as a durable chat transcript");
    expect(componentSource).toContain('URLSearchParams(window.location.search).has("help")');
    expect(componentSource).toContain("<SupportDialog open={supportOpen}");
    expect(componentSource).not.toContain("localStorage");
    expect(layoutSource).toContain("<HelpAssistant />");
    expect(supportSource).toContain("controlledOpen ?? internalOpen");
  });
});
