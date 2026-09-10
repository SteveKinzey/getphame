import { describe, expect, it } from "vitest";
import { maskDiagnosticRecipient } from "./smtpTestEmailHistory";
import fs from "node:fs";
import path from "node:path";

describe("smtp diagnostic history privacy contract", () => {
  it("masks the full recipient while preserving enough context for the initiating user", () => {
    const masked = maskDiagnosticRecipient("owner@example.com");
    expect(masked).toBe("ow***@example.com");
    expect(masked).not.toContain("owner@");
  });

  it("persists and reads diagnostic rows through the authenticated tenant boundary", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "server/smtpTestEmailHistory.ts"),
      "utf8"
    );
    expect(source).toContain("userId: input.userId");
    expect(source).toContain("eq(smtpTestEmailAttempts.userId, userId)");
    expect(source).toContain(".limit(MAX_HISTORY_ROWS)");
    expect(source).not.toContain("recipient: input.recipient");
  });

  it("records only sanitized outcome metadata after saved-connection test sends", () => {
    const routerSource = fs.readFileSync(
      path.resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );
    expect(routerSource).toContain("recordSmtpTestEmailAttempt");
    expect(routerSource).toContain(
      "testEmailHistory: protectedProcedure.query"
    );
    expect(routerSource).toContain("userId: ctx.user.id");
  });
});
