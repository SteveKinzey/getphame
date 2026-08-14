import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const smtpSource = readFileSync(resolve(process.cwd(), "server/smtp.ts"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

describe("saved SMTP mail-management safeguards", () => {
  it("validates and rate-limits a chosen recipient before delivering through saved tenant SMTP", () => {
    const procedure = routerSource.slice(routerSource.indexOf("sendTestEmail: protectedProcedure"), routerSource.indexOf("previewEmail: protectedProcedure"));
    expect(procedure).toContain('z.object({ to: z.string().trim().email().max(320) })');
    expect(procedure).toContain("checkSmtpTestEmailRateLimit(ctx.user.id)");
    expect(procedure).toContain("sendSmtpTestEmail(ctx.user.id, input.to)");
    expect(smtpSource).toContain("export async function sendSmtpTestEmail");
    expect(smtpSource).toContain('safetyMode: "system"');
    expect(smtpSource).toContain("Connect and verify your email server before sending a test email.");
  });

  it("retains a confirmed disconnect path that deletes credentials and clears personal delivery selection", () => {
    expect(smtpSource).toContain("await db.delete(smtpCredentials).where(eq(smtpCredentials.userId, userId))");
    expect(smtpSource).toContain("clearPersonalDeliveryChannel ?? clearOutboundDeliveryChannel");
    expect(settingsSource).toContain("disconnectConfirmOpen");
    expect(settingsSource).toContain("Disconnect and reset");
  });
});
