import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("admin adaptive send burst-cap router contracts", () => {
  it("registers cap reads, updates, and audit history on the admin router", () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "http", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });

    expect(typeof (caller.admin as any).getAdaptiveSendBurstCaps).toBe(
      "function"
    );
    expect(typeof (caller.admin as any).updateAdaptiveSendBurstCaps).toBe(
      "function"
    );
    expect(typeof (caller.admin as any).listAdaptiveSendBurstCapAudit).toBe(
      "function"
    );
  });

  it("blocks non-admin access with FORBIDDEN", async () => {
    const unauthedCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "http", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });

    await expect(
      (unauthedCaller.admin as any).getAdaptiveSendBurstCaps()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      (unauthedCaller.admin as any).listAdaptiveSendBurstCapAudit()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const standardUserCaller = appRouter.createCaller({
      user: {
        id: 999,
        openId: "user-999",
        role: "user",
        email: "user@example.test",
        name: "Standard User",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "http", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });

    await expect(
      (standardUserCaller.admin as any).getAdaptiveSendBurstCaps()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      (standardUserCaller.admin as any).listAdaptiveSendBurstCapAudit()
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
