import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import {
  isHealthyToFailedTransition,
  notifySmtpFailureTransition,
} from "./smtpHealthAlerts";

describe("SMTP health failure alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_BASE_URL", "https://getphame.app/");
    mocks.notifyOwner.mockResolvedValue(true);
  });

  it("sends one actionable alert only for an ok-to-fail transition", async () => {
    const sent = await notifySmtpFailureTransition({
      previousStatus: "ok",
      accountEmail: "owner@example.test",
      host: "smtp.example.test",
      checkedAt: Date.parse("2026-07-15T12:00:00.000Z"),
      error: "Authentication rejected",
    });

    expect(sent).toBe(true);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect(mocks.notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Get Phame SMTP connection failed: owner@example.test",
        content: expect.stringContaining(
          "https://getphame.app/admin/users?smtpStatus=failing&search=owner%40example.test"
        ),
      })
    );
  });

  it("does not duplicate alerts for repeated failures or an unknown initial state", async () => {
    expect(isHealthyToFailedTransition("fail")).toBe(false);
    expect(isHealthyToFailedTransition(null)).toBe(false);
    await notifySmtpFailureTransition({
      previousStatus: "fail",
      accountEmail: "owner@example.test",
      host: "smtp.example.test",
      checkedAt: 1,
      error: "Still failing",
    });
    await notifySmtpFailureTransition({
      previousStatus: null,
      accountEmail: "owner@example.test",
      host: "smtp.example.test",
      checkedAt: 2,
      error: "Initial failure",
    });
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("isolates notification-service failures from the health-check workflow", async () => {
    mocks.notifyOwner.mockRejectedValueOnce(
      new Error("Notification service unavailable")
    );
    await expect(
      notifySmtpFailureTransition({
        previousStatus: "ok",
        accountEmail: "owner@example.test",
        host: "smtp.example.test",
        checkedAt: 3,
        error: "Connection refused",
      })
    ).resolves.toBe(false);
  });
});
