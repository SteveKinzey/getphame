import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SettingsBulkMailConnectionStatus,
  SettingsPersonalMailConnectionStatus,
} from "./SettingsMailConnectionStatus";

const translate = vi.fn((_key: string, { defaultValue }: { defaultValue: string }) => defaultValue);

describe("Settings mail-connection card status", () => {
  it("renders the actual Settings personal-connection status for active, inactive, and recovery scenarios", () => {
    const active = renderToStaticMarkup(createElement(SettingsPersonalMailConnectionStatus, {
      status: { verified: true, selectedForOutreach: true }, translate,
    }));
    const inactive = renderToStaticMarkup(createElement(SettingsPersonalMailConnectionStatus, {
      status: { verified: true }, translate,
    }));
    const needsAttention = renderToStaticMarkup(createElement(SettingsPersonalMailConnectionStatus, {
      status: { verified: true, lastHealthStatus: "failed" }, translate,
    }));

    expect(active).toContain('data-mail-delivery-state="active"');
    expect(active).toContain("Active for customer review requests");
    expect(inactive).toContain('data-mail-delivery-state="not_selected"');
    expect(inactive).toContain("not selected for customer review requests");
    expect(needsAttention).toContain('data-mail-delivery-state="needs_attention"');
    expect(needsAttention).toContain("update your SMTP details and reconnect");
  });

  it("renders the actual Settings bulk-connection legacy block with recovery guidance", () => {
    const legacy = renderToStaticMarkup(createElement(SettingsBulkMailConnectionStatus, {
      status: { legacyPlatformConnection: true }, translate,
    }));
    expect(legacy).toContain('data-mail-delivery-state="legacy_blocked"');
    expect(legacy).toContain("cannot be used for customer outreach");
    expect(legacy).toContain("Connect a bulk-mail provider account that you own");
  });
});
