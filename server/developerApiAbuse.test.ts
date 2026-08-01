import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDeveloperApiAbuseRules, DEVELOPER_API_ABUSE_SUSPENSION_MS } from "./developerApiAbuse";
import type { DeveloperApiPrincipal } from "./developerApiKeys";

const principal: DeveloperApiPrincipal = {
  userId: 17,
  apiKeyId: 29,
  label: "Website form",
  scopes: ["contacts:write", "review_requests:send"],
  expiresAt: null,
  inactivityExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
};

describe("developer API abuse safeguards", () => {
  it("layers key, account, IP, daily, and recipient controls around review-request sending", () => {
    const rules = buildDeveloperApiAbuseRules({
      principal,
      action: "review_request_send",
      clientIp: "203.0.113.10",
      recipientEmail: "CUSTOMER@EXAMPLE.COM",
    });

    expect(rules.map((rule) => rule.dimension)).toEqual([
      "key_burst",
      "account_burst",
      "account_daily",
      "ip_burst",
      "recipient_daily",
    ]);
    expect(rules.find((rule) => rule.dimension === "recipient_daily")).toMatchObject({ limit: 2, suspendOnBreach: false });
    expect(rules.find((rule) => rule.dimension === "account_daily")).toMatchObject({ limit: 100, suspendOnBreach: true });
    expect(DEVELOPER_API_ABUSE_SUSPENSION_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("uses separate import limits and never persists raw IP or recipient dimensions", () => {
    const rules = buildDeveloperApiAbuseRules({
      principal,
      action: "contact_import",
      clientIp: "203.0.113.10",
      recipientEmail: "customer@example.com",
    });
    expect(rules.find((rule) => rule.dimension === "recipient_daily")).toMatchObject({ limit: 8, suspendOnBreach: false });

    const source = fs.readFileSync(path.resolve(process.cwd(), "server/developerApiAbuse.ts"), "utf8");
    const insertBlock = source.slice(source.indexOf("db.insert(apiAbuseLimitWindows)"), source.indexOf("return { allowed: true", source.indexOf("db.insert(apiAbuseLimitWindows)")));
    expect(insertBlock).toContain("dimensionHash");
    expect(insertBlock).not.toContain("clientIp");
    expect(insertBlock).not.toContain("recipientEmail");
  });

  it("requires abuse checks before contact persistence and email delivery, with successful-use tracking after side effects", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "server/publicApi.ts"), "utf8");
    const importAbuseIndex = source.indexOf('action: "contact_import"');
    const contactWriteIndex = source.indexOf("upsertApiContact", importAbuseIndex);
    const sendAbuseIndex = source.indexOf('action: "review_request_send"');
    const emailSendIndex = source.indexOf("deliverReviewEmailOrQueue", sendAbuseIndex);
    const successUseIndex = source.lastIndexOf("recordDeveloperApiKeySuccessfulUse");

    expect(importAbuseIndex).toBeGreaterThan(0);
    expect(contactWriteIndex).toBeGreaterThan(importAbuseIndex);
    expect(sendAbuseIndex).toBeGreaterThan(importAbuseIndex);
    expect(emailSendIndex).toBeGreaterThan(sendAbuseIndex);
    expect(successUseIndex).toBeGreaterThan(emailSendIndex);
    expect(source).toContain("API_KEY_INACTIVE");
    expect(source).toContain("API_KEY_SUSPENDED");
    expect(source).toContain("ABUSE_PROTECTION");
  });
});
