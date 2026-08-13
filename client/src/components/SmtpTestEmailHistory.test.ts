import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SmtpTestEmailHistory", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/SmtpTestEmailHistory.tsx"), "utf8");

  it("renders a privacy note, bounded history, and only the masked recipient field", () => {
    expect(source).toContain("smtp.testEmailHistoryPrivacy");
    expect(source).toContain("attempt.recipientMasked");
    expect(source).not.toMatch(/attempt\.recipient(?!Masked)/);
  });

  it("renders both sent and failed outcomes without exposing transport details", () => {
    expect(source).toContain("smtp.testEmailHistorySent");
    expect(source).toContain("smtp.testEmailHistoryFailed");
    expect(source).not.toContain("host");
    expect(source).not.toContain("encrypted");
  });
});
