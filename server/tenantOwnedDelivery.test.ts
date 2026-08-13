import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMailViaSmtp: vi.fn() }));
vi.mock("./smtp", () => ({ sendMailViaSmtp: mocks.sendMailViaSmtp }));

import { sendTenantOwnedReviewEmail } from "./tenantOwnedDelivery";

describe("tenant-owned review delivery", () => {
  it("marks every wrapper send as review outreach rather than platform system email", async () => {
    mocks.sendMailViaSmtp.mockResolvedValue({ allowed: true });
    await sendTenantOwnedReviewEmail({
      userId: 42,
      to: "customer@example.test",
      subject: "A review request",
      html: "<p>Thank you</p>",
    });
    expect(mocks.sendMailViaSmtp).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      safetyMode: "review_request",
    }));
  });
});
