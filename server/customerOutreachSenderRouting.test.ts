import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertCustomerOutreachSender } from "./smtp";

const smtpSource = readFileSync(resolve(process.cwd(), "server/smtp.ts"), "utf8");

describe("customer outreach sender routing", () => {
  it.each([
    "owner@gmail.com",
    "hello@skamerica.example",
    "reviews@business.example",
  ])("allows a connected personal or business sender: %s", sender => {
    expect(() => assertCustomerOutreachSender(sender)).not.toThrow();
  });

  it.each([
    "no-reply@getphame.app",
    "hello@getphame.app",
    "mailer@subdomain.getphame.app",
  ])("rejects a Get Phame platform sender for customer outreach: %s", sender => {
    expect(() => assertCustomerOutreachSender(sender)).toThrow(/connected personal or business email address/i);
  });

  it("validates public SMTP destinations and returns sanitized recovery messages", () => {
    const testConnectionBlock = smtpSource.slice(
      smtpSource.indexOf("export async function testSmtpConnection"),
      smtpSource.indexOf("// ── Welcome email"),
    );
    expect(smtpSource).toContain("resolveSafeSmtpEndpoint");
    expect(smtpSource).toContain("Private, local, or reserved SMTP destinations are not allowed.");
    expect(smtpSource).toContain("Authentication failed. Check the provider username and app password or SMTP password.");
    expect(testConnectionBlock).not.toContain("return { ok: false, error: message }");
  });
});
