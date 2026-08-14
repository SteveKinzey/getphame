import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("root dashboard mail health badge", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("loads tenant-scoped personal, bulk, and paused automation status and renders recovery controls in the primary header", () => {
    expect(source).toContain('trpc.smtp.status.useQuery()');
    expect(source).toContain('trpc.bulkSender.status.useQuery()');
    expect(source).toContain('trpc.smtp.pausedAutomationQueue.useQuery()');
    expect(source).toContain('<MailServerHealthBadge smtp={smtpStatus} bulk={bulkSenderStatus} translate={t} onTestConnection');
    expect(source).toContain('<PausedAutomationBanner queue={pausedAutomationQueue} translate={t} />');
  });
});
