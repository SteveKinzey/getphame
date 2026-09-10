import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sendSystemEmailMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);
vi.mock("./sendgrid", () => ({
  sendSystemEmail: sendSystemEmailMock,
  HELLO_FROM: "hello@getphame.app",
  NOREPLY_FROM: "no-reply@getphame.app",
}));
import { sendUserWelcomeEmail } from "./smtp";
describe("platform first-account welcome delivery", () => {
  beforeEach(() => {
    sendSystemEmailMock.mockClear();
  });
  afterEach(() => {
    sendSystemEmailMock.mockClear();
  });
  it("never reads a connected owner mailbox for a first-account administrative notice", async () => {
    await sendUserWelcomeEmail({
      ownerUserId: 987654,
      toEmail: "new-account@example.com",
      toName: "New Account",
    });
    expect(sendSystemEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new-account@example.com",
        subject: "Welcome to Get Phame! 🚀",
        from: "no-reply@getphame.app",
      })
    );
    const callArgs = sendSystemEmailMock.mock.calls[0]?.[0];
    expect(callArgs?.to).toBe("new-account@example.com");
    expect(callArgs?.from).toBe("no-reply@getphame.app");
  });
});
