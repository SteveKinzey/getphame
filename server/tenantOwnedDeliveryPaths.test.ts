import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  sendTenantOwnedReviewEmail: vi.fn(),
  getDefaultReviewPlatform: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./tenantOwnedDelivery", () => ({
  sendTenantOwnedReviewEmail: mocks.sendTenantOwnedReviewEmail,
}));
vi.mock("./reviewPlatforms", () => ({
  getDefaultReviewPlatform: mocks.getDefaultReviewPlatform,
}));

import { processDueQuietHoursQueuedSends } from "./quietHours";
import { processDueReminders, sendReminderNow } from "./reminders";

const profile = {
  userId: 7,
  businessName: "Owner Business",
  businessTimeZone: "America/Chicago",
  quietHoursStartMinutes: 20 * 60,
  quietHoursEndMinutes: 8 * 60,
  quietHoursShorteningApproved: 0,
  followUpEnabled: 1,
  followUpFirstEnabled: 1,
  followUpSecondEnabled: 1,
  tier: "pro",
  reviewLink: "https://reviews.example.test",
};

function createDb(selectResults: unknown[], updateResults: unknown[] = []) {
  const selectFrom = vi.fn(() => {
    const run = async () => selectResults.shift() ?? [];
    const query = {
      where: vi.fn(() => query),
      limit: vi.fn(run),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => run().then(resolve, reject),
    };
    return query;
  });
  const updateWhere = vi.fn(async () => updateResults.shift());
  return {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: updateWhere })),
    })),
    insert: vi.fn(),
  };
}

describe("tenant-owned queued and reminder delivery paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("EMAIL_TRACKING_SECRET", "tenant-owned-delivery-test-secret-that-is-long-enough");
    mocks.getDefaultReviewPlatform.mockResolvedValue({ url: "https://reviews.example.test" });
    mocks.sendTenantOwnedReviewEmail.mockRejectedValue(
      new Error("No email account connected. Please connect your email in Settings."),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records a queued review request as failed instead of falling back when no tenant-owned channel is active", async () => {
    const queued = {
      id: 101,
      userId: 7,
      customerRequestId: 52,
      recipientEmail: "customer@example.test",
      subject: "Please review us",
      html: "<p>Thank you</p>",
      source: "single",
      sourceRecordId: null,
      templateId: null,
      scheduleFollowUps: 0,
      scheduledAt: Date.now() - 1,
      status: "pending",
      claimedAt: null,
      attemptCount: 0,
    };
    mocks.getDb.mockResolvedValue(createDb(
      [[queued], [profile], [{ customerName: "Customer" }]],
      [undefined, [{ affectedRows: 1 }], undefined],
    ));

    const result = await processDueQuietHoursQueuedSends();

    expect(mocks.sendTenantOwnedReviewEmail).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      to: "customer@example.test",
    }));
    expect(result).toMatchObject({ checked: 1, sent: 0, failed: 1 });
  });

  it("records a scheduled reminder as failed instead of using platform mail when no tenant-owned channel is active", async () => {
    const reminder = {
      id: 102,
      userId: 7,
      customerRequestId: 53,
      customerName: "Customer",
      customerEmail: "customer@example.test",
      scheduledAt: Date.now() - 1,
      status: "pending",
      sequenceStep: 1,
      attemptCount: 0,
    };
    mocks.getDb.mockResolvedValue(createDb(
      [[reminder], [profile]],
      [[{ affectedRows: 1 }], undefined],
    ));

    const result = await processDueReminders();

    expect(mocks.sendTenantOwnedReviewEmail).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      to: "customer@example.test",
    }));
    expect(result).toMatchObject({ checked: 1, sent: 0, failed: 1 });
  });

  it("propagates a missing-channel failure for a user-triggered send-now reminder", async () => {
    const reminder = {
      id: 103,
      userId: 7,
      customerRequestId: 54,
      customerName: "Customer",
      customerEmail: "customer@example.test",
      status: "pending",
      sequenceStep: 1,
    };
    mocks.getDb.mockResolvedValue(createDb([[reminder], [profile]]));

    await expect(sendReminderNow(7, 103)).rejects.toThrow("No email account connected. Please connect your email in Settings.");
    expect(mocks.sendTenantOwnedReviewEmail).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      to: "customer@example.test",
    }));
  });
});
