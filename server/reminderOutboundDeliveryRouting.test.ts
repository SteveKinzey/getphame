import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const remindersSource = readFileSync(resolve(process.cwd(), "server/reminders.ts"), "utf8");
const quietHoursSource = readFileSync(resolve(process.cwd(), "server/quietHours.ts"), "utf8");
const deliveryWrapperSource = readFileSync(resolve(process.cwd(), "server/tenantOwnedDelivery.ts"), "utf8");

describe("reminder outbound delivery routing", () => {
  it("uses the same fail-closed tenant-owned delivery helper for scheduled and manual reminders", () => {
    const scheduledBlock = remindersSource.slice(
      remindersSource.indexOf("export async function processDueReminders"),
      remindersSource.indexOf("export async function sendReminderNow"),
    );
    const manualBlock = remindersSource.slice(
      remindersSource.indexOf("export async function sendReminderNow"),
      remindersSource.indexOf("export async function getReminderPreviewHtml"),
    );
    expect(scheduledBlock).toContain("await sendTenantOwnedReviewEmail({ userId: reminder.userId");
    expect(manualBlock).toContain("await sendTenantOwnedReviewEmail({ userId, to: reminder.customerEmail");
    expect(quietHoursSource).toContain("await sendTenantOwnedReviewEmail({");
    expect(deliveryWrapperSource).toContain('safetyMode: "review_request"');
  });
});
