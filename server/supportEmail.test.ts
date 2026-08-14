import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sendSystemEmailMock = vi.hoisted(() => vi.fn());
vi.mock("./sendgrid", () => ({
  sendSystemEmail: sendSystemEmailMock,
  HELLO_FROM: "hello@getphame.app",
  NOREPLY_FROM: "no-reply@getphame.app",
}));
import { sendSupportMessage, SUPPORT_FROM_EMAIL, SUPPORT_TO_EMAIL } from "./supportEmail";
import { checkSupportSubmissionRateLimit, resetSupportSubmissionRateLimitForTests } from "./supportRateLimit";
describe("support message delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupportSubmissionRateLimitForTests();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("sends to the confirmed support inbox from hello@getphame.app with a safe reply-to", async () => {
    sendSystemEmailMock.mockResolvedValue(undefined);
    await expect(sendSupportMessage({
      name: "Ava <script>",
      email: "ava@example.com",
      topic: "technical",
      subject: "Cannot import customers",
      message: "The import stops at 80%.\nCan you help?",
      submissionId: 42,
      attachment: {
        filename: "screen shot.png",
        url: "/manus-storage/support/42/screen-shot.png",
      },
    })).resolves.toEqual({ sent: true });

    expect(sendSystemEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: "hello@getphame.app",
      to: SUPPORT_TO_EMAIL,
      replyTo: "ava@example.com",
      subject: "[Technical issue] Support request: Cannot import customers",
      text: expect.stringContaining("The import stops at 80%"),
      html: expect.stringContaining("&lt;script&gt;"),
    }));
    expect(sendSystemEmailMock.mock.calls[0]?.[0]?.text).toContain("Topic: Technical issue");
    expect(sendSystemEmailMock.mock.calls[0]?.[0]?.text).toContain("Screenshot: screen shot.png");
    expect(sendSystemEmailMock.mock.calls[0]?.[0]?.html).toContain("Reference #42");
  });
  it("does not claim delivery when the provider rejects the support inbox", async () => {
    sendSystemEmailMock.mockRejectedValue(new Error("550 rejected"));
    await expect(sendSupportMessage({
      email: "ava@example.com",
      topic: "technical",
      subject: "Help",
      message: "I need help with a setting.",
    })).resolves.toEqual({ sent: false });
  });

  it("limits anonymous form submissions without storing support message content", () => {
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).toThrow("Please wait before sending another support request.");
  });
});
