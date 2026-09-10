import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sendSystemEmailMock = vi.hoisted(() => vi.fn());
vi.mock("./sendgrid", () => ({
  sendSystemEmail: sendSystemEmailMock,
  HELLO_FROM: "hello@getphame.app",
  NOREPLY_FROM: "no-reply@getphame.app",
}));
import { GUIDE_PDF_URL, sendLeadGuideEmail } from "./leadGuideEmail";
describe("lead guide email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("uses the permanent branded R2 PDF and reports provider acceptance honestly", async () => {
    sendSystemEmailMock.mockResolvedValue(undefined);
    const result = await sendLeadGuideEmail("recipient@example.com");
    expect(GUIDE_PDF_URL).toBe(
      "https://assets.getphame.app/getphame-30-day-review-playbook.pdf"
    );
    expect(result).toEqual({
      sent: true,
      providerMessageId: undefined,
      responseCode: 202,
    });
    expect(sendSystemEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        html: expect.stringContaining(GUIDE_PDF_URL),
        text: expect.stringContaining(GUIDE_PDF_URL),
      })
    );
  });
  it("does not claim success when the provider rejects every recipient", async () => {
    sendSystemEmailMock.mockRejectedValue(new Error("550 recipient rejected"));
    await expect(sendLeadGuideEmail("recipient@example.com")).resolves.toEqual({
      sent: false,
      error: "550 recipient rejected",
    });
  });
  it("keeps the direct-download flow available when system SMTP is unavailable", async () => {
    sendSystemEmailMock.mockRejectedValue(
      new Error("No email relay configured")
    );
    await expect(sendLeadGuideEmail("recipient@example.com")).resolves.toEqual({
      sent: false,
      error: "No email relay configured",
    });
    expect(sendSystemEmailMock).toHaveBeenCalled();
  });
});
