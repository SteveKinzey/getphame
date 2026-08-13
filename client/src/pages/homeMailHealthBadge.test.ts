import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("root dashboard mail health badge", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("loads tenant-scoped personal and bulk status and renders the health badge in the primary header", () => {
    expect(source).toContain('trpc.smtp.status.useQuery()');
    expect(source).toContain('trpc.bulkSender.status.useQuery()');
    expect(source).toContain('<MailServerHealthBadge smtp={smtpStatus} bulk={bulkSenderStatus} translate={t} />');
  });
});
