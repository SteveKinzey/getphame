import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const remindersSource = readFileSync(
  resolve(process.cwd(), "server/reminders.ts"),
  "utf8"
);
const quietHoursSource = readFileSync(
  resolve(process.cwd(), "server/quietHours.ts"),
  "utf8"
);
const deliveryWrapperSource = readFileSync(
  resolve(process.cwd(), "server/tenantOwnedDelivery.ts"),
  "utf8"
);

describe("reminder outbound delivery routing", () => {
  it("uses the same fail-closed tenant-owned delivery helper for scheduled and manual reminders", () => {
    const scheduledBlock = remindersSource.slice(
      remindersSource.indexOf("export async function processDueReminders"),
      remindersSource.indexOf("export async function sendReminderNow")
    );
    const manualBlock = remindersSource.slice(
      remindersSource.indexOf("export async function sendReminderNow"),
      remindersSource.indexOf("export async function getReminderPreviewHtml")
    );

    expect(scheduledBlock).toMatch(
      /await\s+sendTenantOwnedReviewEmail\(\s*\{\s*userId\s*:\s*reminder\.userId\s*,\s*to\s*:\s*reminder\.customerEmail/
    );
    expect(manualBlock).toMatch(
      /await\s+sendTenantOwnedReviewEmail\(\s*\{\s*userId\s*,\s*to\s*:\s*reminder\.customerEmail/
    );
    expect(quietHoursSource).toMatch(
      /await\s+sendTenantOwnedReviewEmail\(\s*\{/
    );
    expect(deliveryWrapperSource).toMatch(
      /safetyMode\s*:\s*["']review_request["']/
    );
  });
});
