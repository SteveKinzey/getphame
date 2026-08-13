import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

describe("SMTP settings connection feedback", () => {
  it("keeps candidate credential testing separate from saving a personal SMTP connection", () => {
    expect(settingsSource).toContain("trpc.smtp.testCredentials.useMutation");
    expect(settingsSource).toContain("Test before saving");
    expect(settingsSource).toContain("Connection test passed. Your credentials have not been saved yet.");
    expect(settingsSource).toContain("Connecting and verifying…");
  });

  it("renders accessible Gmail and Workspace App Password help beside the credential label", () => {
    expect(settingsSource).toContain("gmailAppPasswordTooltipLabel");
    expect(settingsSource).toContain("workspaceAppPasswordTooltipLabel");
    expect(settingsSource).toContain("<TooltipContent side=\"top\"");
    expect(settingsSource).toContain("Your Workspace administrator must allow App Passwords");
  });

  it("provides explicit busy and saved feedback for personal SMTP and bulk-provider submissions", () => {
    expect(settingsSource).toContain("smtpConnectionSavedNotice");
    expect(settingsSource).toContain("connectionSavedNotice");
    expect(settingsSource).toContain("aria-busy={connectSmtp.isPending}");
    expect(settingsSource).toContain("aria-busy={connectMutation.isPending}");
    expect(settingsSource).toContain("Your bulk mail server is connected and ready to use.");
  });
});
