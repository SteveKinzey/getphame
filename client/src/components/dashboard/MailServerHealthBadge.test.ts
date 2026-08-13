import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MailServerHealthBadge, { resolveMailServerHealth } from "./MailServerHealthBadge";

const translate = (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key;

describe("MailServerHealthBadge", () => {
  it("resolves personal, bulk, attention, and disconnected tenant states without provider secrets", () => {
    expect(resolveMailServerHealth({ connected: true, verified: true, activeDeliveryChannel: "personal" }, undefined)).toBe("healthy");
    expect(resolveMailServerHealth({ connected: true, verified: false, activeDeliveryChannel: "personal" }, undefined)).toBe("attention");
    expect(resolveMailServerHealth({ connected: true, verified: true, lastHealthStatus: "fail", activeDeliveryChannel: "personal" }, undefined)).toBe("attention");
    expect(resolveMailServerHealth({ activeDeliveryChannel: "bulk" }, { connected: true, selectedForOutreach: true })).toBe("bulk_active");
    expect(resolveMailServerHealth({ connected: false, activeDeliveryChannel: null }, undefined)).toBe("disconnected");
  });

  it("renders an accessible Settings path with health state copy", () => {
    const markup = renderToStaticMarkup(createElement(MailServerHealthBadge, {
      smtp: { connected: true, verified: true, activeDeliveryChannel: "personal" },
      bulk: undefined,
      translate,
    }));
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain("Mail server healthy");
    expect(markup).toContain("ready for outreach");
    expect(markup).not.toContain("encryptedPass");
  });
});
