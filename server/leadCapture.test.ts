import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

vi.mock("./leadGuideEmail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./leadGuideEmail")>();
  return {
    ...actual,
    sendLeadGuideEmail: vi.fn(),
  };
});

import { getDb } from "./db";
import { sendLeadGuideEmail } from "./leadGuideEmail";
import { appRouter } from "./routers";

const RETRY_MESSAGE =
  "This is embarrassing, but our servers are so busy we cannot process your request at the moment. Please try again.";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("leadCapture.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a retryable error when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leadCapture.submit({ email: "lead@example.com" }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: RETRY_MESSAGE,
    });
    expect(sendLeadGuideEmail).not.toHaveBeenCalled();
  });

  it("returns a retryable error when the guide email cannot be sent", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    vi.mocked(getDb).mockResolvedValue({ insert } as never);
    vi.mocked(sendLeadGuideEmail).mockResolvedValue({
      sent: false,
      error: "SMTP unavailable",
    });

    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leadCapture.submit({ email: "lead@example.com" }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: RETRY_MESSAGE,
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(sendLeadGuideEmail).toHaveBeenCalledWith("lead@example.com");
  });
});
