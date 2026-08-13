import { describe, expect, it, vi } from "vitest";
import { customerRequests } from "../drizzle/schema";
import { getCustomerRequests } from "./db";

describe("home-page customer request query", () => {
  it("executes the real list helper and returns every reconciled customer-request field", async () => {
    const reconciledRow = {
      id: 17,
      userId: 1,
      customerName: "Customer",
      customerEmail: "customer@example.test",
      customerPhone: null,
      method: "email" as const,
      status: "sent" as const,
      respondedAt: null,
      sentAt: new Date("2026-08-13T00:00:00.000Z"),
      followUpAt: null,
      platformId: null,
      sourceConnectionId: 12,
      sourceEventId: "source-event-17",
      preferredLocale: "en",
      templateRevisionId: 9,
      englishTemplateRevisionId: 8,
      emailSubject: "Thank you",
      emailBody: "<p>Thank you</p>",
      createdAt: new Date("2026-08-13T00:00:00.000Z"),
    };
    const limit = vi.fn(async () => [reconciledRow]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const database = { select: vi.fn(() => ({ from })) };

    const rows = await getCustomerRequests(1, 1000, database as never);

    expect(database.select).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith(customerRequests);
    expect(limit).toHaveBeenCalledWith(1000);
    expect(rows).toEqual([expect.objectContaining({
      sourceConnectionId: 12,
      sourceEventId: "source-event-17",
      preferredLocale: "en",
      templateRevisionId: 9,
      englishTemplateRevisionId: 8,
    })]);
  });
});
