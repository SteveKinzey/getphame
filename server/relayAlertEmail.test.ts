import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  sendSystemEmail: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "owner-open-id" },
}));
vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
}));
vi.mock("./sendgrid", () => ({
  HELLO_FROM: "hello@getphame.app",
  sendSystemEmail: mocks.sendSystemEmail,
}));

describe("relay alert email fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "redacted-test-secret";
    delete process.env.SENDGRID_API_KEY;
    mocks.getUserByOpenId.mockResolvedValue({ email: "owner@example.test" });
    mocks.sendSystemEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
  });

  it("derives the owner recipient server-side and sends a privacy-safe fallback", async () => {
    const { sendRelayAlertEmailFallback } = await import("./relayAlertEmail");
    const result = await sendRelayAlertEmailFallback({
      event: "failure",
      activeRelay: "sendgrid",
      checkedAt: 1_789_000_000_000,
      source: "scheduled_heartbeat",
      diagnostic: "SMTP verification failed: [redacted-email] password: [redacted]",
    });

    expect(result).toEqual({ attempted: true, delivered: true, reason: "delivered" });
    expect(mocks.getUserByOpenId).toHaveBeenCalledWith("owner-open-id");
    expect(mocks.sendSystemEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "owner@example.test",
      subject: expect.stringContaining("Slack fallback"),
      text: expect.stringContaining("[redacted-email]"),
    }));
    const html = mocks.sendSystemEmail.mock.calls[0][0].html;
    expect(html).not.toContain("redacted-test-secret");
    expect(html).not.toContain("https://hooks.slack.com");
  });

  it("does not attempt delivery when the server-owned owner has no email", async () => {
    mocks.getUserByOpenId.mockResolvedValue({ email: null });
    const { sendRelayAlertEmailFallback } = await import("./relayAlertEmail");
    const result = await sendRelayAlertEmailFallback({
      event: "slack_test",
      activeRelay: "system_smtp",
      checkedAt: Date.now(),
      source: "admin_manual",
      diagnostic: "Manual test did not confirm Slack delivery.",
    });

    expect(result).toEqual({ attempted: false, delivered: false, reason: "owner_email_unavailable" });
    expect(mocks.sendSystemEmail).not.toHaveBeenCalled();
  });
});
