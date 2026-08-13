import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const bulkSenderSource = readFileSync(resolve(process.cwd(), "server/bulkSender.ts"), "utf8");
const sendgridSource = readFileSync(resolve(process.cwd(), "server/sendgrid.ts"), "utf8");

describe("platform SendGrid isolation", () => {
  it("keeps the platform relay server-managed while user bulk setup blocks legacy SendGrid", () => {
    expect(sendgridSource).toContain("server-managed only");
    expect(sendgridSource).toContain("customer outreach must never receive a SendGrid credential");
    expect(bulkSenderSource).toContain('if (credentials.provider === "sendgrid")');
    expect(bulkSenderSource).toContain("legacyPlatformConnection: true as const");
  });

  it("uses an administrator procedure for the platform email preview send", () => {
    const adminEmailBlock = routerSource.slice(
      routerSource.indexOf("sendTestEmail: adminProcedure"),
      routerSource.indexOf("listLeads: adminProcedure"),
    );
    expect(adminEmailBlock).toContain("sendTestEmail: adminProcedure");
    expect(adminEmailBlock).toContain("await sendSystemEmail({");
    expect(adminEmailBlock).not.toContain("protectedProcedure");
  });
});
