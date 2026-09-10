import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function userContext(): TrpcContext {
  return {
    user: {
      id: 91,
      openId: "regular-user-91",
      email: "member@example.test",
      name: "Member",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("administrator platform email preview authorization", () => {
  it("rejects a regular user before a manually initiated platform email can be sent", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(
      caller.admin.sendTestEmail({
        template: "welcome",
        to: "recipient@example.test",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
