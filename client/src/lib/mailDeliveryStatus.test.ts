import { describe, expect, it } from "vitest";
import { getPersonalMailDeliveryState } from "./mailDeliveryStatus";

describe("personal mail delivery status", () => {
  it("shows needs attention for unverified or failed SMTP", () => {
    expect(getPersonalMailDeliveryState({ verified: false })).toBe(
      "needs_attention"
    );
    expect(
      getPersonalMailDeliveryState({
        verified: true,
        lastHealthStatus: "failed",
      })
    ).toBe("needs_attention");
  });

  it("distinguishes active personal SMTP, an active bulk provider, and an inactive saved SMTP connection", () => {
    expect(
      getPersonalMailDeliveryState({
        verified: true,
        selectedForOutreach: true,
      })
    ).toBe("active");
    expect(
      getPersonalMailDeliveryState({
        verified: true,
        activeDeliveryChannel: "bulk",
      })
    ).toBe("bulk_active");
    expect(getPersonalMailDeliveryState({ verified: true })).toBe(
      "not_selected"
    );
  });
});
