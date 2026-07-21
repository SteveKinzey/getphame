import nodemailer from "nodemailer";
import { describe, expect, it } from "vitest";

const requiredEnv = [
  "SYSTEM_SMTP_HOST",
  "SYSTEM_SMTP_PORT",
  "SYSTEM_SMTP_USER",
  "SYSTEM_SMTP_PASS",
  "SYSTEM_FROM_EMAIL",
] as const;

const hasSystemEmailConfig = requiredEnv.every((key) => Boolean(process.env[key]));
const shouldVerifySystemEmailIntegration =
  process.env.RUN_SYSTEM_EMAIL_INTEGRATION === "true";

describe.runIf(hasSystemEmailConfig)("Resend system-email integration", () => {
  it("authenticates the supplied API key and verifies the SMTP transport", async () => {
    expect(process.env.SYSTEM_SMTP_HOST).toBe("smtp.resend.com");
    expect(process.env.SYSTEM_SMTP_PORT).toBe("465");
    expect(process.env.SYSTEM_SMTP_USER).toBe("resend");
    expect(process.env.SYSTEM_FROM_EMAIL).toBe("no-reply@getphame.app");
    expect(process.env.SYSTEM_SMTP_PASS).toMatch(/^re_/);

    const domainsResponse = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_SMTP_PASS}`,
      },
    });

    // A sending-only key may return 403 for domain listing, but an invalid key
    // returns 401. SMTP verification below confirms send permission.
    expect(domainsResponse.status).not.toBe(401);

    if (domainsResponse.ok) {
      const payload = (await domainsResponse.json()) as {
        data?: Array<{ name?: string; status?: string }>;
      };
      const domain = payload.data?.find((item) => item.name === "getphame.app");
      expect(domain, "getphame.app must exist in Resend Domains").toBeDefined();
      expect(domain?.status, "getphame.app must be verified before sending").toBe("verified");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SYSTEM_SMTP_HOST,
      port: Number(process.env.SYSTEM_SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SYSTEM_SMTP_USER,
        pass: process.env.SYSTEM_SMTP_PASS,
      },
    });

    await expect(transporter.verify()).resolves.toBe(true);
  }, 20_000);
});

describe("Resend system-email integration configuration", () => {
  it.skipIf(!shouldVerifySystemEmailIntegration)(
    "requires all system email environment variables when verification is explicitly requested",
    () => {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    expect(missing, `Missing system email variables: ${missing.join(", ")}`).toEqual([]);
    },
  );
});
