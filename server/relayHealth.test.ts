import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyOwner: vi.fn(),
  sendMailMock: vi.fn(),
  verifyMock: vi.fn(),
  sendMock: vi.fn(),
  setApiKeyMock: vi.fn(),
  fetchMock: vi.fn(),
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

describe("operational email relay failover, slack alerts, and outage durations", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
    delete process.env.SYSTEM_SMTP_PORT;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SLACK_ALERT_WEBHOOK_URL;
    mocks.notifyOwner.mockResolvedValue(true);
    mocks.verifyMock.mockReset();
    mocks.sendMailMock.mockReset();
    mocks.sendMock.mockReset();

    // Mock global fetch for Slack webhook testing
    globalThis.fetch = mocks.fetchMock as any;
    mocks.fetchMock.mockResolvedValue({ ok: true, status: 200 } as any);

    const { resetRelayHealthState } = await import("./relayHealth");
    resetRelayHealthState();
  });

  it("reports healthy when primary SMTP succeeds and skips Slack alert", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/services/MOCK/TEST/123";

    mocks.verifyMock.mockResolvedValueOnce(true);

    const { runRelayHeartbeatCheck } = await import("./relayHealth");
    const result = await runRelayHeartbeatCheck();

    expect(result.status).toBe("healthy");
    expect(result.activeRelay).toBe("system_smtp");
    expect(result.primaryHealthy).toBe(true);
    expect(result.slackAlertSent).toBe(false);
    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("dispatches a Slack incident webhook when primary fails and opens an outage", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/services/MOCK/FAIL/456";

    mocks.verifyMock.mockRejectedValueOnce(new Error("Connection timeout to SMTP port 587"));

    const { runRelayHeartbeatCheck, getCurrentRelaySummary } = await import("./relayHealth");
    const result = await runRelayHeartbeatCheck();

    expect(result.status).toBe("failover");
    expect(result.activeRelay).toBe("sendgrid");
    expect(result.transitionAlertSent).toBe(true);
    expect(result.slackAlertSent).toBe(true);

    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = mocks.fetchMock.mock.calls[0];
    expect(callUrl).toBe("https://hooks.slack.com/services/MOCK/FAIL/456");
    const payload = JSON.parse(callOptions.body);
    expect(payload.attachments[0].title).toContain("Failed Over to SendGrid");

    const summary = await getCurrentRelaySummary();
    expect(summary.outageHistory.length).toBeGreaterThan(0);
    expect(summary.outageHistory[0].status).toBe("ongoing");
  });

  it("calculates outage duration and dispatches a Slack recovery webhook upon primary restoration", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/services/MOCK/RECOVER/789";

    // 1. Failure check
    mocks.verifyMock.mockRejectedValueOnce(new Error("Temporary primary rejection"));
    const { runRelayHeartbeatCheck, getCurrentRelaySummary } = await import("./relayHealth");
    await runRelayHeartbeatCheck();
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);

    // 2. Recovery check
    mocks.verifyMock.mockResolvedValueOnce(true);
    const recoveryResult = await runRelayHeartbeatCheck();

    expect(recoveryResult.status).toBe("healthy");
    expect(recoveryResult.alertType).toBe("recovery");
    expect(recoveryResult.slackAlertSent).toBe(true);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(2);

    const [recoverUrl, recoverOptions] = mocks.fetchMock.mock.calls[1];
    expect(recoverUrl).toBe("https://hooks.slack.com/services/MOCK/RECOVER/789");
    const recoverPayload = JSON.parse(recoverOptions.body);
    expect(recoverPayload.attachments[0].title).toContain("Primary Relay Recovered");

    const summary = await getCurrentRelaySummary();
    expect(summary.outageHistory.length).toBeGreaterThan(0);
    expect(summary.outageHistory[0].status).toBe("resolved");
    expect(summary.outageHistory[0].durationMinutes).toBeGreaterThanOrEqual(1);
  });

  it("handles runtime outbound failure by notifying Slack and logging failover", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_secret";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SENDGRID_API_KEY = "SG.mock_key";
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/services/MOCK/RUNTIME/000";

    mocks.sendMailMock.mockRejectedValueOnce(new Error("Network connection lost"));
    mocks.sendMock.mockResolvedValueOnce([{ statusCode: 202 }, {}]);

    const { sendSystemEmail } = await import("./sendgrid");
    const { getRecentFailoverEvents } = await import("./relayHealth");

    await sendSystemEmail({
      to: "recipient@example.com",
      subject: "Runtime Failover Test",
      html: "<p>Hello</p>",
    });

    expect(mocks.sendMailMock).toHaveBeenCalledTimes(1);
    expect(mocks.sendMock).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    const [, callOptions] = mocks.fetchMock.mock.calls[0];
    const payload = JSON.parse(callOptions.body);
    expect(payload.attachments[0].title).toContain("Outbound Email Failed Over to SendGrid");

    const events = getRecentFailoverEvents(1);
    expect(events[0].fromProvider).toBe("system_smtp");
    expect(events[0].toProvider).toBe("sendgrid");
  });
});
