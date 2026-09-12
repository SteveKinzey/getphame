import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("root dashboard mail health badge", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/pages/Home.tsx"),
    "utf8"
  );

  it("loads tenant-scoped personal, bulk, and paused automation status and renders recovery controls in the primary header", () => {
    expect(source).toMatch(
      /trpc\s*\.\s*smtp\s*\.\s*status\s*\.\s*useQuery\(\s*\)/
    );
    expect(source).toMatch(
      /trpc\s*\.\s*bulkSender\s*\.\s*status\s*\.\s*useQuery\(\s*\)/
    );
    expect(source).toMatch(
      /trpc\s*\.\s*smtp\s*\.\s*pausedAutomationQueue\s*\.\s*useQuery\(\s*\)/
    );
    expect(source).toMatch(
      /<MailServerHealthBadge\s+[\s\S]*?smtp\s*=\s*\{\s*smtpStatus\s*\}[\s\S]*?bulk\s*=\s*\{\s*bulkSenderStatus\s*\}[\s\S]*?translate\s*=\s*\{\s*t\s*\}[\s\S]*?onTestConnection\s*=\s*\{\s*\(\s*\)\s*=>\s*recheckMailServer\.mutate\(\s*\)\s*\}/
    );
    expect(source).toMatch(
      /<PausedAutomationBanner\s+queue\s*=\s*\{\s*pausedAutomationQueue\s*\}\s+translate\s*=\s*\{\s*t\s*\}\s*\/\s*>/
    );
  });
});
