import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyOwner: vi.fn(),
  sendMailMock: vi.fn(),
  verifyMock: vi.fn(),
  sendMock: vi.fn(),
  setApiKeyMock: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mocks.sendMailMock,
      verify: mocks.verifyMock,
    })),
  },
}));

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: mocks.setApiKeyMock,
    send: mocks.sendMock,
  },
}));

describe("operational email relay health & failover heartbeat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
    delete process.env.SYSTEM_SMTP_PORT;
    delete process.env.SENDGRID_API_KEY;
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.verifyMock.mockReset();
    mocks.sendMailMock.mockReset();
    mocks.sendMock.mockReset();

    const { resetRelayHealthState } = await import("./relayHealth");
    resetRelayHealthState();
  });

  it("reports healthy status when primary SYSTEM_SMTP verification succeeds", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";

    mocks.verifyMock.mockResolvedValueOnce(true);

    const { runRelayHeartbeatCheck } = await import("./relayHealth");
    const result = await runRelayHeartbeatCheck();

    expect(result.status).toBe("healthy");
    expect(result.activeRelay).toBe("system_smtp");
    expect(result.primaryHealthy).toBe(true);
    expect(result.backupConfigured).toBe(true);
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("shifts traffic to backup SendGrid and alerts admin when primary verification fails", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";

    mocks.verifyMock.mockRejectedValueOnce(new Error("Connection timeout to SMTP port 587"));

    const { runRelayHeartbeatCheck } = await import("./relayHealth");
    const result = await runRelayHeartbeatCheck();

    expect(result.status).toBe("failover");
    expect(result.activeRelay).toBe("sendgrid");
    expect(result.primaryHealthy).toBe(false);
    expect(result.transitionAlertSent).toBe(true);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect(mocks.notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("failed over to SendGrid backup"),
      }),
    );
  });

  it("deduplicates alerts during continuing failover incidents", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";

    mocks.verifyMock.mockRejectedValue(new Error("Persistent outage"));

    const { runRelayHeartbeatCheck } = await import("./relayHealth");

    // First run — alerts
    const run1 = await runRelayHeartbeatCheck();
    expect(run1.transitionAlertSent).toBe(true);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);

    // Second run — continuing incident, should NOT re-alert
    const run2 = await runRelayHeartbeatCheck();
    expect(run2.transitionAlertSent).toBe(false);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
  });

  it("alerts administrator on recovery when primary comes back online", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";

    // Primary fails
    mocks.verifyMock.mockRejectedValueOnce(new Error("Temporary outage"));
    const { runRelayHeartbeatCheck } = await import("./relayHealth");
    await runRelayHeartbeatCheck();
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);

    // Primary recovers
    mocks.verifyMock.mockResolvedValueOnce(true);
    const recoveryRun = await runRelayHeartbeatCheck();

    expect(recoveryRun.status).toBe("healthy");
    expect(recoveryRun.alertType).toBe("recovery");
    expect(recoveryRun.transitionAlertSent).toBe(true);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(2);
    expect(mocks.notifyOwner).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("primary relay recovered"),
      }),
    );
  });

  it("automatically fails over to SendGrid in sendSystemEmail when primary sendMail throws", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";

    mocks.sendMailMock.mockRejectedValueOnce(new Error("SMTP socket closed"));
    mocks.sendMock.mockResolvedValueOnce([{ statusCode: 202 }, {}]);

    const { sendSystemEmail } = await import("./sendgrid");
    const { getRecentFailoverEvents } = await import("./relayHealth");

    await sendSystemEmail({
      to: "recipient@example.com",
      subject: "Test Failover",
      html: "<p>Content</p>",
    });

    expect(mocks.sendMailMock).toHaveBeenCalledTimes(1);
    expect(mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mocks.setApiKeyMock).toHaveBeenCalledWith("SG.mock_key");

    const events = getRecentFailoverEvents(1);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].fromProvider).toBe("system_smtp");
    expect(events[0].toProvider).toBe("sendgrid");
    expect(events[0].source).toBe("outbound_send");
  });
});
