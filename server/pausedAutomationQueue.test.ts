import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(
  resolve(process.cwd(), "server/routers.ts"),
  "utf8"
);

describe("smtp.pausedAutomationQueue", () => {
  const start = routerSource.indexOf(
    "pausedAutomationQueue: protectedProcedure"
  );
  const end = routerSource.indexOf("previewEmail: protectedProcedure", start);
  const source = routerSource.slice(start, end);

  it("fails closed to an empty queue while a usable tenant-owned delivery channel exists", () => {
    expect(source).toContain("resolveOutboundDeliveryChannel(ctx.user.id)");
    expect(source).toMatch(
      /if\s*\(\s*channel\s*\)\s*return\s*\{\s*paused:\s*false\s+as\s+const,\s*total:\s*0,\s*items:\s*\[\]\s+as\s+Array<never>\s*\}/
    );
  });

  it("counts only this tenant's pending quiet-hours sends and follow-up reminders", () => {
    expect(source).toContain("eq(quietHoursQueuedSends.userId, ctx.user.id)");
    expect(source).toContain("eq(followUpReminders.userId, ctx.user.id)");
    expect(source).toContain('eq(quietHoursQueuedSends.status, "pending")');
    expect(source).toContain('eq(followUpReminders.status, "pending")');
  });

  it("returns a bounded safe queue without recipient email, message content, or provider secrets", () => {
    expect(source).toContain(".limit(12)");
    expect(source).toContain(".slice(0, 12)");
    expect(source).not.toContain("recipientEmail");
    expect(source).not.toContain("customerEmail");
    expect(source).not.toContain("encryptedSecret");
    expect(source).not.toContain("apiKey:");
  });
});
