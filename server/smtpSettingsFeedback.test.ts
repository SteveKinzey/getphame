import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

describe("SMTP settings connection feedback", () => {
  it("wires candidate credential testing into the actual rendered personal SMTP controls", () => {
    expect(settingsSource).toContain("trpc.smtp.testCredentials.useMutation");
    expect(settingsSource).toContain("<SmtpCandidateConnectionActions");
    expect(settingsSource).toContain("testCredentials.mutate");
    expect(settingsSource).toContain("connectSmtp.mutateAsync");
  });

  it("wires the actual App Password tooltip beside Gmail and Workspace credential labels", () => {
    expect(settingsSource).toContain("<SmtpAppPasswordHelpTooltip");
    expect(settingsSource).toContain('provider={isGmail ? "gmail" : "workspace"}');
  });

  it("provides explicit busy and saved feedback for personal SMTP and bulk-provider submissions", () => {
    expect(settingsSource).toContain("smtpConnectionSavedNotice");
    expect(settingsSource).toContain("connectionSavedNotice");
    expect(settingsSource).toContain("<SmtpCandidateConnectionActions");
    expect(settingsSource).toContain("aria-busy={connectMutation.isPending}");
    expect(settingsSource).toContain("<ConnectionSavedNotice");
  });
});
