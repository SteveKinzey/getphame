import { describe, expect, it } from "vitest";
import {
  buildProfilePreferencesExportFilename,
  serializeProfilePreferencesCsv,
  type ProfilePreferencesExportPayload,
} from "./profilePreferencesExport";

const payload: ProfilePreferencesExportPayload = {
  format: "get-phame-profile-preferences/v1",
  exportedAt: "2026-08-26T12:00:00.000Z",
  account: { displayName: "=Danger", email: "owner@example.test" },
  businessProfile: {
    businessName: "A, Co.",
    reviewLink: null,
    fromName: null,
    replyTo: null,
    consentLabelName: null,
    physicalAddress: null,
  },
  preferences: { themePreference: "system", resolvedTheme: "dark", hapticsEnabled: true },
};

describe("profile and preferences export serialization", () => {
  it("uses date-stamped format-specific filenames", () => {
    expect(buildProfilePreferencesExportFilename("json", payload.exportedAt)).toBe("get-phame-profile-preferences-2026-08-26.json");
    expect(buildProfilePreferencesExportFilename("csv", payload.exportedAt)).toBe("get-phame-profile-preferences-2026-08-26.csv");
  });

  it("neutralizes spreadsheet formulas and escapes CSV fields", () => {
    const csv = serializeProfilePreferencesCsv(payload);
    expect(csv).toMatch(/^\uFEFFField,Value\r\n/);
    expect(csv).toContain("Account display name,'=Danger");
    expect(csv).toContain('Business name,"A, Co."');
    expect(csv).not.toContain("smtp");
  });
});
