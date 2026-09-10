import { describe, expect, it, vi } from "vitest";
import { deleteSmtpCredentials, sendSmtpTestEmail } from "./smtp";

describe("tenant SMTP mail-management behavior", () => {
  it("gates a chosen-recipient test email until a verified tenant SMTP connection exists", async () => {
    const send = vi.fn(async () => null);
    const noCredentials = await sendSmtpTestEmail(5, "owner@example.test", {
      getCredentials: async () => undefined,
      send,
    });
    const unverified = await sendSmtpTestEmail(5, "owner@example.test", {
      getCredentials: async () => ({ verified: 0 }) as any,
      send,
    });

    expect(noCredentials).toEqual({
      ok: false,
      error:
        "Connect and verify your email server before sending a test email.",
    });
    expect(unverified).toEqual({
      ok: false,
      error:
        "Connect and verify your email server before sending a test email.",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends a diagnostic only through the saved tenant SMTP connection", async () => {
    const send = vi.fn(async () => null);
    const result = await sendSmtpTestEmail(27, "owner@example.test", {
      getCredentials: async () =>
        ({
          verified: 1,
          user: "sender@example.test",
          fromName: "Tenant Sender",
        }) as any,
      send,
    });

    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 27,
        to: "owner@example.test",
        safetyMode: "system",
        subject: "Get Phame mail server test",
      })
    );
  });

  it("deletes tenant credentials and clears the personal outbound preference on reset", async () => {
    const where = vi.fn(async () => undefined);
    const remove = vi.fn(() => ({ where }));
    const clearPersonalDeliveryChannel = vi.fn(async () => undefined);

    await deleteSmtpCredentials(77, {
      db: { delete: remove },
      clearPersonalDeliveryChannel,
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(clearPersonalDeliveryChannel).toHaveBeenCalledWith(77, "personal");
  });
});
